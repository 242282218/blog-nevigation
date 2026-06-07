import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PUT } from '@/app/api/setup/route';
import { resetAppRuntimeConfigCacheForTests } from '@/lib/app-runtime-config';
import { resetEnvironmentEditorSessionForTests } from '@/lib/editor-auth-runtime';
import {
  cleanupTempDirectories,
  createTempDirectory,
  restoreEnv,
} from '../helpers/api-route';

const ORIGINAL_ENV = {
  BLOG_DATA_ROOT: process.env.BLOG_DATA_ROOT,
  EDITOR_ACCESS_TOKEN: process.env.EDITOR_ACCESS_TOKEN,
  EDITOR_AUTH_CONFIG_FILE: process.env.EDITOR_AUTH_CONFIG_FILE,
  EDITOR_RUNTIME_AUTH_SETUP_TOKEN: process.env.EDITOR_RUNTIME_AUTH_SETUP_TOKEN,
  COOKIE_SECURE: process.env.COOKIE_SECURE,
  TRUSTED_PROXY_IPS: process.env.TRUSTED_PROXY_IPS,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
};
const tempDirectories: string[] = [];

function createTempDataRoot(): string {
  const directory = createTempDirectory('blog-navigation-setup-route-');

  tempDirectories.push(directory);
  process.env.BLOG_DATA_ROOT = directory;
  return directory;
}

function clearRuntimeEnv(): void {
  Object.keys(ORIGINAL_ENV).forEach((name) => {
    delete process.env[name];
  });
}

function createSetupRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/setup', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function createBaseSetupBody(dataRoot: string) {
  return {
    config: {
      publicSiteUrl: 'https://example.com',
      cookieSecure: false,
      trustedProxyIps: '',
      dataRootPath: dataRoot,
    },
    editorSecret: 'new-runtime-secret-12',
    confirmEditorSecret: 'new-runtime-secret-12',
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  restoreEnv(ORIGINAL_ENV);
  resetAppRuntimeConfigCacheForTests();
  resetEnvironmentEditorSessionForTests();
  cleanupTempDirectories(tempDirectories);
});

describe('setup API R2 flow', () => {
  it('lets first setup explicitly skip R2 and saves disabled settings', async () => {
    clearRuntimeEnv();
    const dataRoot = createTempDataRoot();

    const response = await PUT(createSetupRequest({
      ...createBaseSetupBody(dataRoot),
      r2SetupMode: 'disabled',
      r2Settings: {
        enabled: true,
        accountId: 'stale-account-id',
        bucket: '',
        accessKeyId: '',
        secretAccessKey: '',
        prefix: 'blog-navigation',
        endpoint: '',
        snapshotOnWrite: false,
      },
    }));
    const payload = await response.json();
    const storedSettings = JSON.parse(
      fs.readFileSync(path.join(dataRoot, 'settings', 'cloudflare-r2.json'), 'utf8')
    );

    expect(response.status).toBe(200);
    expect(payload).toEqual(expect.objectContaining({ success: true }));
    expect(storedSettings).toEqual(
      expect.objectContaining({
        enabled: false,
        accessKeyId: '',
        secretAccessKey: '',
      })
    );
  });

  it('saves manual R2 setup without removed legacy secret fields', async () => {
    clearRuntimeEnv();
    const dataRoot = createTempDataRoot();

    const response = await PUT(createSetupRequest({
      ...createBaseSetupBody(dataRoot),
      r2SetupMode: 'manual',
      r2Settings: {
        enabled: true,
        accountId: '0123456789abcdef0123456789abcdef',
        bucket: 'blog-data',
        accessKeyId: 'access-key',
        secretAccessKey: 'secret-key',
        prefix: 'blog-navigation',
        endpoint: '',
        snapshotOnWrite: true,
      },
    }));
    const payload = await response.json();
    const storedText = fs.readFileSync(path.join(dataRoot, 'settings', 'cloudflare-r2.json'), 'utf8');
    const storedSettings = JSON.parse(storedText);

    expect(response.status).toBe(200);
    expect(JSON.stringify(payload)).not.toContain('secret-key');
    expect(storedSettings).toEqual(
      expect.objectContaining({
        enabled: true,
        secretAccessKey: 'secret-key',
        snapshotOnWrite: true,
      })
    );
    expect(storedSettings).not.toHaveProperty('backupEncryptionPassphrase');
  });

  it('starts Cloudflare R2 setup without removed legacy secret fields', async () => {
    clearRuntimeEnv();
    const dataRoot = createTempDataRoot();
    const cloudflareFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/accounts/0123456789abcdef0123456789abcdef')) {
        return Response.json({ success: true, result: {} });
      }

      if (url.endsWith('/accounts/0123456789abcdef0123456789abcdef/r2/buckets') && init?.method === 'GET') {
        return Response.json({ success: true, result: { buckets: [] } });
      }

      if (url.endsWith('/accounts/0123456789abcdef0123456789abcdef/r2/buckets') && init?.method === 'POST') {
        return Response.json({ success: true, result: {} });
      }

      if (url.endsWith('/tokens/permission_groups')) {
        return Response.json({
          success: true,
          result: [
            { id: 'read-group', name: 'Workers R2 Storage Bucket Item Read' },
            { id: 'write-group', name: 'Workers R2 Storage Bucket Item Write' },
          ],
        });
      }

      if (url.endsWith('/r2/buckets/blog-data')) {
        return Response.json({ success: true, result: {} });
      }

      if (url.endsWith('/tokens') && init?.method === 'POST') {
        return Response.json({
          success: true,
          result: {
            id: 'token-id',
            name: 'blog-navigation-blog-data',
            value: 'created-token-secret',
          },
        });
      }

      return Response.json({ success: false, errors: [{ message: `Unexpected URL: ${url}` }] }, { status: 400 });
    });

    vi.stubGlobal('fetch', cloudflareFetch);

    const response = await PUT(createSetupRequest({
      ...createBaseSetupBody(dataRoot),
      r2SetupMode: 'cloudflare',
      cloudflareR2Setup: {
        authEmail: 'owner@example.com',
        globalApiKey: 'global-key-should-not-leak',
        accountId: '0123456789abcdef0123456789abcdef',
        bucket: 'blog-data',
        prefix: 'blog-navigation',
        snapshotOnWrite: false,
      },
    }));
    const payload = await response.json();
    const storedText = fs.readFileSync(path.join(dataRoot, 'settings', 'cloudflare-r2.json'), 'utf8');
    const storedSettings = JSON.parse(storedText);
    const expectedSecret = createHash('sha256').update('created-token-secret').digest('hex');

    expect(response.status).toBe(200);
    expect(payload).toEqual(expect.objectContaining({ success: true }));
    expect(cloudflareFetch).toHaveBeenCalled();
    expect(storedSettings).toEqual(
      expect.objectContaining({
        enabled: true,
        accessKeyId: 'token-id',
        secretAccessKey: expectedSecret,
      })
    );
    expect(storedSettings).not.toHaveProperty('backupEncryptionPassphrase');
  });
});

import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as getSetup, PUT as putSetup } from '@/app/api/setup/route';
import { GET as getRuntimeConfig, PUT as putRuntimeConfig } from '@/app/api/runtime-config/route';
import { POST as loginEditor } from '@/app/api/editor-auth/route';
import {
  EDITOR_SESSION_COOKIE,
  EDITOR_CSRF_COOKIE,
  EDITOR_CSRF_HEADER,
} from '@/lib/editor-auth';
import { resetEditorAuthRateLimitForTests } from '@/lib/editor-auth-rate-limit';
import { resetEnvironmentEditorSessionForTests } from '@/lib/editor-auth-runtime';
import { resetAppRuntimeConfigCacheForTests } from '@/lib/app-runtime-config';
import {
  cleanupTempDirectories,
  createAuthedEditorRequest,
  createTempDirectory,
  restoreEnv,
} from '../helpers/api-route';

const ORIGINAL_ENV = {
  BLOG_DATA_ROOT: process.env.BLOG_DATA_ROOT,
  EDITOR_ACCESS_TOKEN: process.env.EDITOR_ACCESS_TOKEN,
  EDITOR_AUTH_CONFIG_FILE: process.env.EDITOR_AUTH_CONFIG_FILE,
  COOKIE_SECURE: process.env.COOKIE_SECURE,
  TRUSTED_PROXY_IPS: process.env.TRUSTED_PROXY_IPS,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  R2_BACKUP_ENABLED: process.env.R2_BACKUP_ENABLED,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_BUCKET: process.env.R2_BUCKET,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_PREFIX: process.env.R2_PREFIX,
  R2_ENDPOINT: process.env.R2_ENDPOINT,
  R2_SNAPSHOT_ON_WRITE: process.env.R2_SNAPSHOT_ON_WRITE,
  R2_BACKUP_ENCRYPTION_KEY: process.env.R2_BACKUP_ENCRYPTION_KEY,
  R2_ALLOW_PLAINTEXT_BACKUP: process.env.R2_ALLOW_PLAINTEXT_BACKUP,
};
const TEMP_DIRECTORIES: string[] = [];

function createTempDataRoot(): string {
  const directory = createTempDirectory('blog-navigation-runtime-config-');

  TEMP_DIRECTORIES.push(directory);
  return directory;
}

function clearRuntimeEnv(): void {
  for (const name of Object.keys(ORIGINAL_ENV)) {
    delete process.env[name];
  }
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

function extractCookie(response: Response, name: string): string {
  return response.headers.get('set-cookie')
    ?.split(',')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split(';')[0] ?? '';
}

function createRequestWithResponseCookies(response: Response, url: string): NextRequest {
  const sessionCookie = extractCookie(response, EDITOR_SESSION_COOKIE);
  const csrfCookie = extractCookie(response, EDITOR_CSRF_COOKIE);
  const csrfToken = csrfCookie.slice(`${EDITOR_CSRF_COOKIE}=`.length);

  return new NextRequest(url, {
    headers: {
      Cookie: `${sessionCookie}; ${csrfCookie}`,
      Origin: 'http://localhost',
      [EDITOR_CSRF_HEADER]: csrfToken,
    },
  });
}

async function login(secret: string): Promise<Response> {
  return loginEditor(new NextRequest('http://localhost/api/editor-auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ secret }),
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  restoreEnv(ORIGINAL_ENV);
  resetEditorAuthRateLimitForTests();
  resetEnvironmentEditorSessionForTests();
  resetAppRuntimeConfigCacheForTests();
  cleanupTempDirectories(TEMP_DIRECTORIES);
});

describe('runtime setup and config APIs', () => {
  it('initializes the app without editor env variables and persists all frontend-configurable runtime fields', async () => {
    clearRuntimeEnv();
    process.env.BLOG_DATA_ROOT = createTempDataRoot();

    const beforeSetup = await getSetup();
    const beforePayload = await beforeSetup.json();

    expect(beforeSetup.status).toBe(200);
    expect(beforePayload).toEqual(
      expect.objectContaining({
        setupCompleted: false,
        authConfigured: false,
        setupTokenRequired: false,
      })
    );

    const setupResponse = await putSetup(createSetupRequest({
      config: {
        publicSiteUrl: 'https://example.com/',
        cookieSecure: false,
        trustedProxyIps: '203.0.113.10\n203.0.113.11',
        dataRootPath: process.env.BLOG_DATA_ROOT,
      },
      editorSecret: 'new-runtime-secret-12',
      confirmEditorSecret: 'new-runtime-secret-12',
      r2Settings: {
        enabled: false,
        accountId: '',
        bucket: '',
        accessKeyId: '',
        secretAccessKey: '',
        backupEncryptionKey: '',
        prefix: 'blog-navigation',
        endpoint: '',
        snapshotOnWrite: false,
        allowPlaintextBackup: true,
      },
    }));
    const setupPayload = await setupResponse.json();
    const appRuntimeFile = path.join(process.env.BLOG_DATA_ROOT, 'settings', 'app-runtime.json');
    const editorAuthFile = path.join(process.env.BLOG_DATA_ROOT, 'settings', 'editor-auth.json');
    const r2SettingsFile = path.join(process.env.BLOG_DATA_ROOT, 'settings', 'cloudflare-r2.json');

    expect(setupResponse.status).toBe(200);
    expect(setupPayload).toEqual(expect.objectContaining({ success: true }));
    expect(setupResponse.headers.get('set-cookie')).toContain(`${EDITOR_SESSION_COOKIE}=`);
    expect(fs.existsSync(appRuntimeFile)).toBe(true);
    expect(fs.existsSync(editorAuthFile)).toBe(true);
    expect(fs.existsSync(r2SettingsFile)).toBe(true);
    expect(JSON.parse(fs.readFileSync(appRuntimeFile, 'utf8'))).toEqual(
      expect.objectContaining({
        publicSiteUrl: 'https://example.com',
        cookieSecure: false,
        trustedProxyIps: ['203.0.113.10', '203.0.113.11'],
        setupCompletedAt: expect.any(String),
      })
    );
    expect(JSON.parse(fs.readFileSync(r2SettingsFile, 'utf8'))).toEqual(
      expect.objectContaining({
        enabled: false,
        allowPlaintextBackup: false,
      })
    );

    const afterSetup = await getSetup();

    expect(await afterSetup.json()).toEqual(
      expect.objectContaining({
        setupCompleted: true,
        authConfigured: true,
      })
    );
  });

  it('initializes with Cloudflare R2 automatic setup without persisting the global key', async () => {
    clearRuntimeEnv();
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    const cloudflareFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.endsWith('/accounts/0123456789abcdef0123456789abcdef') && method === 'GET') {
        return Response.json({ success: true, result: { id: '0123456789abcdef0123456789abcdef' } });
      }

      if (url.endsWith('/accounts/0123456789abcdef0123456789abcdef/r2/buckets') && method === 'GET') {
        return Response.json({ success: true, result: { buckets: [] } });
      }

      if (url.endsWith('/accounts/0123456789abcdef0123456789abcdef/r2/buckets') && method === 'POST') {
        expect(JSON.parse(String(init?.body))).toEqual({ name: 'blog-navigation' });
        return Response.json({ success: true, result: { name: 'blog-navigation' } });
      }

      if (url.endsWith('/user/tokens/permission_groups') && method === 'GET') {
        return Response.json({
          success: true,
          result: [
            { id: 'r2-read-group', name: 'Workers R2 Storage Bucket Item Read' },
            { id: 'r2-write-group', name: 'Workers R2 Storage Bucket Item Write' },
          ],
        });
      }

      if (url.endsWith('/user/tokens') && method === 'POST') {
        return Response.json({
          success: true,
          result: {
            id: 'created-r2-access-key',
            value: 'created-r2-token-value',
          },
        });
      }

      throw new Error(`Unexpected Cloudflare request: ${method} ${url}`);
    });

    vi.stubGlobal('fetch', cloudflareFetch);

    const setupResponse = await putSetup(createSetupRequest({
      config: {
        publicSiteUrl: 'https://example.com/',
        cookieSecure: false,
        trustedProxyIps: '',
        dataRootPath: process.env.BLOG_DATA_ROOT,
      },
      editorSecret: 'new-runtime-secret-12',
      confirmEditorSecret: 'new-runtime-secret-12',
      r2SetupMode: 'cloudflare',
      cloudflareR2Setup: {
        authEmail: 'owner@example.com',
        globalApiKey: 'global-key-should-not-leak',
        accountId: '0123456789abcdef0123456789abcdef',
        bucket: 'blog-navigation',
        prefix: 'blog-navigation',
        snapshotOnWrite: false,
      },
    }));
    const payload = await setupResponse.json();
    const r2SettingsFile = path.join(process.env.BLOG_DATA_ROOT, 'settings', 'cloudflare-r2.json');
    const storedSettings = JSON.parse(fs.readFileSync(r2SettingsFile, 'utf8'));
    const storedText = JSON.stringify(storedSettings);

    expect(setupResponse.status).toBe(200);
    expect(payload).toEqual(expect.objectContaining({ success: true }));
    expect(cloudflareFetch).toHaveBeenCalledTimes(5);
    expect(storedText).not.toContain('global-key-should-not-leak');
    expect(storedText).not.toContain('created-r2-token-value');
    expect(storedSettings).toEqual(
      expect.objectContaining({
        enabled: true,
        accountId: '0123456789abcdef0123456789abcdef',
        bucket: 'blog-navigation',
        accessKeyId: 'created-r2-access-key',
        secretAccessKey: expect.stringMatching(/^[a-f0-9]{64}$/),
        backupEncryptionKey: expect.any(String),
        prefix: 'blog-navigation',
        snapshotOnWrite: false,
      })
    );
  });

  it('rejects invalid setup input before Cloudflare R2 automatic setup has external side effects', async () => {
    clearRuntimeEnv();
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    const cloudflareFetch = vi.fn();

    vi.stubGlobal('fetch', cloudflareFetch);

    const setupResponse = await putSetup(createSetupRequest({
      config: {
        publicSiteUrl: 'https://example.com/',
        cookieSecure: false,
        trustedProxyIps: '',
        dataRootPath: process.env.BLOG_DATA_ROOT,
      },
      editorSecret: 'short',
      confirmEditorSecret: 'short',
      r2SetupMode: 'cloudflare',
      cloudflareR2Setup: {
        authEmail: 'owner@example.com',
        globalApiKey: 'global-key-should-not-leak',
        accountId: '0123456789abcdef0123456789abcdef',
        bucket: 'blog-navigation',
        prefix: 'blog-navigation',
        snapshotOnWrite: false,
      },
    }));
    const payload = await setupResponse.json();

    expect(setupResponse.status).toBe(400);
    expect(payload).toEqual({ message: '编辑口令至少需要 12 个字符。' });
    expect(cloudflareFetch).not.toHaveBeenCalled();
  });

  it('lets first setup explicitly skip R2 even when stale R2 fields are incomplete', async () => {
    clearRuntimeEnv();
    process.env.BLOG_DATA_ROOT = createTempDataRoot();

    const setupResponse = await putSetup(createSetupRequest({
      config: {
        publicSiteUrl: 'https://example.com/',
        cookieSecure: false,
        trustedProxyIps: '',
        dataRootPath: process.env.BLOG_DATA_ROOT,
      },
      editorSecret: 'new-runtime-secret-12',
      confirmEditorSecret: 'new-runtime-secret-12',
      r2SetupMode: 'disabled',
      r2Settings: {
        enabled: true,
        accountId: '',
        bucket: '',
        accessKeyId: '',
        secretAccessKey: '',
        backupEncryptionKey: '',
        prefix: 'blog-navigation',
        endpoint: '',
        snapshotOnWrite: false,
        allowPlaintextBackup: true,
      },
    }));
    const payload = await setupResponse.json();
    const r2SettingsFile = path.join(process.env.BLOG_DATA_ROOT, 'settings', 'cloudflare-r2.json');
    const storedSettings = JSON.parse(fs.readFileSync(r2SettingsFile, 'utf8'));

    expect(setupResponse.status).toBe(200);
    expect(payload).toEqual(expect.objectContaining({ success: true }));
    expect(storedSettings).toEqual(
      expect.objectContaining({
        enabled: false,
        allowPlaintextBackup: false,
      })
    );
  });

  it('updates runtime config and makes the saved editor secret override the legacy env token', async () => {
    clearRuntimeEnv();
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    process.env.EDITOR_ACCESS_TOKEN = 'legacy-env-secret';

    const legacyLoginProbe = await login('legacy-env-secret');
    expect(legacyLoginProbe.status).toBe(200);

    const request = await createAuthedEditorRequest('http://localhost/api/runtime-config', {
      method: 'PUT',
      body: JSON.stringify({
        config: {
          publicSiteUrl: 'https://runtime.example',
          cookieSecure: false,
          trustedProxyIps: '198.51.100.1',
          dataRootPath: path.join(process.env.BLOG_DATA_ROOT, 'next-root'),
        },
        editorSecret: 'replacement-secret-12',
        confirmEditorSecret: 'replacement-secret-12',
      }),
    });
    const response = await putRuntimeConfig(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain(`${EDITOR_SESSION_COOKIE}=`);
    expect(payload.config).toEqual(
      expect.objectContaining({
        publicSiteUrl: expect.objectContaining({
          value: 'https://runtime.example',
          source: 'file',
        }),
        cookieSecure: expect.objectContaining({
          value: false,
        }),
        trustedProxyIps: expect.objectContaining({
          value: ['198.51.100.1'],
        }),
        dataRoot: expect.objectContaining({
          pendingPath: path.join(process.env.BLOG_DATA_ROOT, 'next-root'),
          requiresRestart: true,
        }),
      })
    );

    const getResponse = await getRuntimeConfig(createRequestWithResponseCookies(response, 'http://localhost/api/runtime-config'));
    const getPayload = await getResponse.json();

    expect(getResponse.status).toBe(200);
    expect(getPayload.editable).toEqual(
      expect.objectContaining({
        publicSiteUrl: 'https://runtime.example',
        cookieSecure: false,
        trustedProxyIps: ['198.51.100.1'],
      })
    );

    const oldLogin = await login('legacy-env-secret');
    const newLogin = await login('replacement-secret-12');

    expect(oldLogin.status).toBe(401);
    expect(newLogin.status).toBe(200);
  });
});

import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it } from 'vitest';
import { GET, PUT } from '@/app/api/data/cloudflare-r2/route';
import {
  cleanupTempDirectories,
  createAuthedEditorRequest,
  createTempDirectory,
  restoreEnv,
} from '../helpers/api-route';

const ORIGINAL_ENV = {
  BLOG_DATA_ROOT: process.env.BLOG_DATA_ROOT,
  EDITOR_ACCESS_TOKEN: process.env.EDITOR_ACCESS_TOKEN,
  R2_BACKUP_ENABLED: process.env.R2_BACKUP_ENABLED,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_BUCKET: process.env.R2_BUCKET,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_PREFIX: process.env.R2_PREFIX,
  R2_ENDPOINT: process.env.R2_ENDPOINT,
  R2_SNAPSHOT_ON_WRITE: process.env.R2_SNAPSHOT_ON_WRITE,
};
const tempDirectories: string[] = [];

function resetEnv(): void {
  restoreEnv(ORIGINAL_ENV);
}

function clearR2Env(): void {
  for (const name of [
    'R2_BACKUP_ENABLED',
    'R2_ACCOUNT_ID',
    'R2_BUCKET',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_PREFIX',
    'R2_ENDPOINT',
    'R2_SNAPSHOT_ON_WRITE',
  ]) {
    delete process.env[name];
  }
}

function createTempDataRoot(): string {
  const directory = createTempDirectory('blog-navigation-cloudflare-r2-route-');
  tempDirectories.push(directory);
  return directory;
}

function getSettingsFile(dataRoot: string): string {
  return path.join(dataRoot, 'settings', 'cloudflare-r2.json');
}

function writeText(filePath: string, value: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}

afterEach(() => {
  resetEnv();
  cleanupTempDirectories(tempDirectories);
});

describe('Cloudflare R2 settings API', () => {
  it('rejects unauthenticated reads and writes', async () => {
    clearR2Env();
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();

    const getResponse = await GET(new NextRequest('http://localhost/api/data/cloudflare-r2'));
    const putResponse = await PUT(
      new NextRequest('http://localhost/api/data/cloudflare-r2', {
        method: 'PUT',
        body: JSON.stringify({
          settings: {
            enabled: false,
          },
        }),
      })
    );

    expect(getResponse.status).toBe(401);
    expect(putResponse.status).toBe(401);
  });

  it('requires BLOG_DATA_ROOT before saving settings', async () => {
    clearR2Env();
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    delete process.env.BLOG_DATA_ROOT;

    const response = await PUT(
      await createAuthedEditorRequest('http://localhost/api/data/cloudflare-r2', {
        method: 'PUT',
        body: JSON.stringify({
          settings: {
            enabled: false,
            accountId: '',
            bucket: '',
            accessKeyId: '',
            secretAccessKey: '',
            prefix: 'blog-navigation',
            endpoint: '',
            snapshotOnWrite: false,
          },
        }),
      })
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('BLOG_DATA_ROOT'),
      })
    );
  });

  it('rejects malformed or non-object settings without writing a settings file', async () => {
    clearR2Env();
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();

    const malformedResponse = await PUT(
      await createAuthedEditorRequest('http://localhost/api/data/cloudflare-r2', {
        method: 'PUT',
        body: '{',
      })
    );
    const arrayResponse = await PUT(
      await createAuthedEditorRequest('http://localhost/api/data/cloudflare-r2', {
        method: 'PUT',
        body: JSON.stringify({
          settings: [],
        }),
      })
    );
    const settingsFile = path.join(process.env.BLOG_DATA_ROOT, 'settings', 'cloudflare-r2.json');

    expect(malformedResponse.status).toBe(400);
    expect(arrayResponse.status).toBe(400);
    expect(fs.existsSync(settingsFile)).toBe(false);
  });

  it('rejects enabled settings with missing credentials without writing secrets', async () => {
    clearR2Env();
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();

    const response = await PUT(
      await createAuthedEditorRequest('http://localhost/api/data/cloudflare-r2', {
        method: 'PUT',
        body: JSON.stringify({
          settings: {
            enabled: true,
            accountId: '0123456789abcdef0123456789abcdef',
            bucket: 'blog-data',
            accessKeyId: '',
            secretAccessKey: '',
            prefix: 'blog-navigation',
            endpoint: '',
            snapshotOnWrite: false,
          },
        }),
      })
    );
    const settingsFile = path.join(process.env.BLOG_DATA_ROOT, 'settings', 'cloudflare-r2.json');

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('启用 R2 备份时必须填写'),
      })
    );
    expect(fs.existsSync(settingsFile)).toBe(false);
  });

  it('reports corrupt stored settings instead of falling back to env settings', async () => {
    clearR2Env();
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    process.env.R2_BACKUP_ENABLED = 'true';
    process.env.R2_ACCOUNT_ID = '33333333333333333333333333333333';
    process.env.R2_BUCKET = 'env-bucket';
    process.env.R2_ACCESS_KEY_ID = 'env-access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'env-secret-key';
    writeText(getSettingsFile(process.env.BLOG_DATA_ROOT), '{');

    const response = await GET(await createAuthedEditorRequest('http://localhost/api/data/cloudflare-r2'));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: 'Cloudflare R2 配置文件损坏，请修复或删除后重试。',
      })
    );
  });

  it('does not replace corrupt stored settings when an enabled update omits the secret', async () => {
    clearR2Env();
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    const settingsFile = getSettingsFile(process.env.BLOG_DATA_ROOT);
    writeText(settingsFile, '{');

    const response = await PUT(
      await createAuthedEditorRequest('http://localhost/api/data/cloudflare-r2', {
        method: 'PUT',
        body: JSON.stringify({
          settings: {
            enabled: true,
            accountId: '0123456789abcdef0123456789abcdef',
            bucket: 'blog-data',
            accessKeyId: 'access-key',
            secretAccessKey: '',
            prefix: 'blog-navigation',
            endpoint: '',
            snapshotOnWrite: false,
          },
        }),
      })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: 'Cloudflare R2 配置文件损坏，请修复或删除后重试。',
      })
    );
    expect(fs.readFileSync(settingsFile, 'utf8')).toBe('{');
  });

  it('replaces corrupt stored settings when a complete enabled update includes the secret', async () => {
    clearR2Env();
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    const settingsFile = getSettingsFile(process.env.BLOG_DATA_ROOT);
    writeText(settingsFile, '{');

    const response = await PUT(
      await createAuthedEditorRequest('http://localhost/api/data/cloudflare-r2', {
        method: 'PUT',
        body: JSON.stringify({
          settings: {
            enabled: true,
            accountId: '0123456789abcdef0123456789abcdef',
            bucket: 'blog-data',
            accessKeyId: 'access-key',
            secretAccessKey: 'replacement-secret',
            prefix: 'blog-navigation',
            endpoint: '',
            snapshotOnWrite: true,
          },
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(JSON.stringify(payload)).not.toContain('replacement-secret');
    expect(payload.settings).toEqual(
      expect.objectContaining({
        enabled: true,
        hasSecretAccessKey: true,
      })
    );
    expect(JSON.parse(fs.readFileSync(settingsFile, 'utf8'))).toEqual(
      expect.objectContaining({
        secretAccessKey: 'replacement-secret',
        snapshotOnWrite: true,
      })
    );
  });

  it('saves settings without returning the secret and keeps it when omitted later', async () => {
    clearR2Env();
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();

    const createResponse = await PUT(
      await createAuthedEditorRequest('http://localhost/api/data/cloudflare-r2', {
        method: 'PUT',
        body: JSON.stringify({
          settings: {
            enabled: true,
            accountId: '0123456789abcdef0123456789abcdef',
            bucket: 'blog-data',
            accessKeyId: 'access-key',
            secretAccessKey: 'secret-key',
            prefix: 'blog-navigation',
            endpoint: '',
            snapshotOnWrite: false,
          },
        }),
      })
    );
    const createPayload = await createResponse.json();

    expect(createResponse.status).toBe(200);
    expect(JSON.stringify(createPayload)).not.toContain('secret-key');
    expect(createPayload.settings).toEqual(
      expect.objectContaining({
        hasSecretAccessKey: true,
      })
    );

    const getResponse = await GET(await createAuthedEditorRequest('http://localhost/api/data/cloudflare-r2'));
    const getPayload = await getResponse.json();

    expect(getResponse.status).toBe(200);
    expect(JSON.stringify(getPayload)).not.toContain('secret-key');

    const updateResponse = await PUT(
      await createAuthedEditorRequest('http://localhost/api/data/cloudflare-r2', {
        method: 'PUT',
        body: JSON.stringify({
          settings: {
            enabled: true,
            accountId: '0123456789abcdef0123456789abcdef',
            bucket: 'blog-data',
            accessKeyId: 'next-access-key',
            secretAccessKey: '',
            prefix: 'next-prefix',
            endpoint: '',
            snapshotOnWrite: true,
          },
        }),
      })
    );
    const settingsFile = path.join(process.env.BLOG_DATA_ROOT, 'settings', 'cloudflare-r2.json');
    const storedSettings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));

    expect(updateResponse.status).toBe(200);
    expect(storedSettings).toEqual(
      expect.objectContaining({
        accessKeyId: 'next-access-key',
        secretAccessKey: 'secret-key',
        prefix: 'next-prefix',
        snapshotOnWrite: true,
      })
    );
  });
});

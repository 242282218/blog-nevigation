import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  getEditableR2BackupSettings,
  getR2BackupConfig,
  getR2BackupStatus,
  R2BackupSettingsInvalidError,
  saveEditableR2BackupSettings,
} from '@/lib/r2-backup-storage';

const ORIGINAL_ENV = {
  BLOG_DATA_ROOT: process.env.BLOG_DATA_ROOT,
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

function createTempDataRoot(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-navigation-r2-settings-'));
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

function writeJson(filePath: string, value: unknown): void {
  writeText(filePath, JSON.stringify(value, null, 2));
}

function resetR2Env(): void {
  for (const name of Object.keys(ORIGINAL_ENV) as Array<keyof typeof ORIGINAL_ENV>) {
    const value = ORIGINAL_ENV[name];

    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

function clearR2Env(): void {
  Object.keys(ORIGINAL_ENV).forEach((name) => {
    delete process.env[name];
  });
}

afterEach(() => {
  resetR2Env();

  while (tempDirectories.length > 0) {
    fs.rmSync(tempDirectories.pop() as string, { recursive: true, force: true });
  }
});

describe('R2 backup configuration', () => {
  it('stays disabled unless explicitly enabled', () => {
    clearR2Env();

    expect(getR2BackupConfig()).toBeNull();
    expect(getR2BackupStatus()).toEqual(
      expect.objectContaining({
        enabled: false,
        configured: false,
      })
    );
  });

  it('reports missing variables when enabled without credentials', () => {
    clearR2Env();
    process.env.R2_BACKUP_ENABLED = 'true';

    expect(getR2BackupConfig()).toBeNull();
    expect(getR2BackupStatus()).toEqual(
      expect.objectContaining({
        enabled: true,
        configured: false,
        message: 'R2 backup is enabled but required variables are missing.',
      })
    );
  });

  it('builds a Cloudflare R2 S3-compatible endpoint', () => {
    clearR2Env();
    process.env.R2_BACKUP_ENABLED = 'true';
    process.env.R2_ACCOUNT_ID = 'account-id';
    process.env.R2_BUCKET = 'blog-data';
    process.env.R2_ACCESS_KEY_ID = 'access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'secret-key';
    process.env.R2_PREFIX = '/custom-prefix/';
    process.env.R2_SNAPSHOT_ON_WRITE = 'true';

    expect(getR2BackupConfig()).toEqual({
      bucket: 'blog-data',
      endpoint: 'https://account-id.r2.cloudflarestorage.com',
      accessKeyId: 'access-key',
      secretAccessKey: 'secret-key',
      prefix: 'custom-prefix',
      snapshotOnWrite: true,
    });
  });

  it('persists editable R2 settings without exposing the secret in safe settings', () => {
    clearR2Env();
    process.env.BLOG_DATA_ROOT = createTempDataRoot();

    const safeSettings = saveEditableR2BackupSettings({
      enabled: true,
      accountId: ' account-id ',
      bucket: ' blog-data ',
      accessKeyId: ' access-key ',
      secretAccessKey: ' secret-key ',
      prefix: '/custom-prefix/',
      endpoint: '',
      snapshotOnWrite: true,
    });
    const settingsFile = path.join(process.env.BLOG_DATA_ROOT, 'settings', 'cloudflare-r2.json');

    expect(safeSettings).toEqual({
      enabled: true,
      accountId: 'account-id',
      bucket: 'blog-data',
      accessKeyId: 'access-key',
      hasSecretAccessKey: true,
      prefix: 'custom-prefix',
      endpoint: '',
      snapshotOnWrite: true,
    });
    expect(getEditableR2BackupSettings()).not.toHaveProperty('secretAccessKey');
    expect(JSON.parse(fs.readFileSync(settingsFile, 'utf8'))).toEqual(
      expect.objectContaining({
        secretAccessKey: 'secret-key',
      })
    );
    if (process.platform !== 'win32') {
      expect(fs.statSync(settingsFile).mode & 0o777).toBe(0o600);
    }
    expect(getR2BackupConfig()).toEqual({
      bucket: 'blog-data',
      endpoint: 'https://account-id.r2.cloudflarestorage.com',
      accessKeyId: 'access-key',
      secretAccessKey: 'secret-key',
      prefix: 'custom-prefix',
      snapshotOnWrite: true,
    });
    expect(getR2BackupStatus()).toEqual(
      expect.objectContaining({
        enabled: true,
        configured: true,
        source: 'file',
        hasSecretAccessKey: true,
      })
    );
  });

  it('keeps an existing stored secret when the update omits it', () => {
    clearR2Env();
    process.env.BLOG_DATA_ROOT = createTempDataRoot();

    saveEditableR2BackupSettings({
      enabled: true,
      accountId: 'account-id',
      bucket: 'blog-data',
      accessKeyId: 'access-key',
      secretAccessKey: 'original-secret',
      prefix: 'blog-navigation',
      endpoint: '',
      snapshotOnWrite: false,
    });
    saveEditableR2BackupSettings({
      enabled: true,
      accountId: 'account-id',
      bucket: 'blog-data',
      accessKeyId: 'next-access-key',
      secretAccessKey: '',
      prefix: 'next-prefix',
      endpoint: '',
      snapshotOnWrite: false,
    });

    expect(getR2BackupConfig()).toEqual(
      expect.objectContaining({
        accessKeyId: 'next-access-key',
        secretAccessKey: 'original-secret',
        prefix: 'next-prefix',
      })
    );
  });

  it('does not copy the env secret into disabled file settings', () => {
    clearR2Env();
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    process.env.R2_ACCOUNT_ID = 'env-account-id';
    process.env.R2_BUCKET = 'env-bucket';
    process.env.R2_ACCESS_KEY_ID = 'env-access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'env-secret-key';

    saveEditableR2BackupSettings({
      enabled: false,
      accountId: '',
      bucket: '',
      accessKeyId: '',
      secretAccessKey: '',
      prefix: 'blog-navigation',
      endpoint: '',
      snapshotOnWrite: false,
    });

    const settingsFile = path.join(process.env.BLOG_DATA_ROOT, 'settings', 'cloudflare-r2.json');
    const storedSettings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));

    expect(storedSettings.secretAccessKey).toBe('');
    expect(getEditableR2BackupSettings()).toEqual(
      expect.objectContaining({
        enabled: false,
        accountId: '',
        bucket: '',
        accessKeyId: '',
        hasSecretAccessKey: false,
      })
    );
    expect(getR2BackupStatus()).toEqual(
      expect.objectContaining({
        enabled: false,
        source: 'file',
        bucket: null,
        hasAccessKeyId: false,
        hasSecretAccessKey: false,
      })
    );
    expect(getR2BackupConfig()).toBeNull();
  });

  it('rejects corrupt stored settings instead of falling back to env settings', () => {
    clearR2Env();
    const dataRoot = createTempDataRoot();
    process.env.BLOG_DATA_ROOT = dataRoot;
    process.env.R2_BACKUP_ENABLED = 'true';
    process.env.R2_ACCOUNT_ID = 'env-account-id';
    process.env.R2_BUCKET = 'env-bucket';
    process.env.R2_ACCESS_KEY_ID = 'env-access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'env-secret-key';
    writeText(getSettingsFile(dataRoot), '{');

    expect(() => getEditableR2BackupSettings()).toThrow(R2BackupSettingsInvalidError);
    expect(() => getR2BackupConfig()).toThrow(R2BackupSettingsInvalidError);
    expect(() => getR2BackupStatus()).toThrow(R2BackupSettingsInvalidError);
  });

  it('rejects incomplete stored settings instead of treating them as disabled settings', () => {
    clearR2Env();
    const dataRoot = createTempDataRoot();
    process.env.BLOG_DATA_ROOT = dataRoot;
    writeJson(getSettingsFile(dataRoot), {
      enabled: false,
    });

    expect(() => getEditableR2BackupSettings()).toThrow(R2BackupSettingsInvalidError);
    expect(() => getR2BackupConfig()).toThrow(R2BackupSettingsInvalidError);
  });

  it('allows a complete save to replace corrupt stored settings', () => {
    clearR2Env();
    const dataRoot = createTempDataRoot();
    process.env.BLOG_DATA_ROOT = dataRoot;
    writeText(getSettingsFile(dataRoot), '{');

    const safeSettings = saveEditableR2BackupSettings({
      enabled: true,
      accountId: 'account-id',
      bucket: 'blog-data',
      accessKeyId: 'access-key',
      secretAccessKey: 'replacement-secret',
      prefix: 'blog-navigation',
      endpoint: '',
      snapshotOnWrite: true,
    });

    expect(safeSettings).toEqual(
      expect.objectContaining({
        enabled: true,
        hasSecretAccessKey: true,
      })
    );
    expect(getR2BackupConfig()).toEqual(
      expect.objectContaining({
        bucket: 'blog-data',
        secretAccessKey: 'replacement-secret',
      })
    );
  });

  it('allows a disabled save to replace corrupt stored settings without copying env secrets', () => {
    clearR2Env();
    const dataRoot = createTempDataRoot();
    process.env.BLOG_DATA_ROOT = dataRoot;
    process.env.R2_SECRET_ACCESS_KEY = 'env-secret-key';
    writeText(getSettingsFile(dataRoot), '{');

    const safeSettings = saveEditableR2BackupSettings({
      enabled: false,
      accountId: '',
      bucket: '',
      accessKeyId: '',
      secretAccessKey: '',
      prefix: 'blog-navigation',
      endpoint: '',
      snapshotOnWrite: false,
    });
    const storedSettings = JSON.parse(fs.readFileSync(getSettingsFile(dataRoot), 'utf8'));

    expect(safeSettings).toEqual(
      expect.objectContaining({
        enabled: false,
        hasSecretAccessKey: false,
      })
    );
    expect(storedSettings.secretAccessKey).toBe('');
    expect(getR2BackupConfig()).toBeNull();
  });
});

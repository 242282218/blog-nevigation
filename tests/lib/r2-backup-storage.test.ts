import { afterEach, describe, expect, it } from 'vitest';
import { getR2BackupConfig, getR2BackupStatus } from '@/lib/r2-backup-storage';

const ORIGINAL_ENV = {
  R2_BACKUP_ENABLED: process.env.R2_BACKUP_ENABLED,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_BUCKET: process.env.R2_BUCKET,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_PREFIX: process.env.R2_PREFIX,
  R2_ENDPOINT: process.env.R2_ENDPOINT,
  R2_SNAPSHOT_ON_WRITE: process.env.R2_SNAPSHOT_ON_WRITE,
};

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
});

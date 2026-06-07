import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCurrentEditorBackupPayload } from '@/lib/editor-data-backup';
import {
  drainPendingBackups,
  queueCurrentBackupToRemote,
  resetRemoteBackupQueueForTests,
  syncCurrentBackupToRemote,
  waitForRemoteBackupQueueIdleForTests,
} from '@/lib/editor-remote-backup';
import { DEFAULT_SITE_SETTINGS } from '@/lib/site-settings';
import {
  getR2BackupConfig,
  getR2BackupStatus,
  R2BackupSettingsInvalidError,
  uploadBackupPayloadToR2,
  type R2UploadResult,
} from '@/lib/r2-backup-storage';

vi.mock('@/lib/editor-data-backup', () => ({
  createCurrentEditorBackupPayload: vi.fn(),
}));

vi.mock('@/lib/r2-backup-storage', () => {
  class R2BackupSettingsInvalidError extends Error {
    constructor(public readonly filePath = 'cloudflare-r2.json') {
      super('Stored Cloudflare R2 settings are invalid.');
      this.name = 'R2BackupSettingsInvalidError';
    }
  }

  return {
    getR2BackupConfig: vi.fn(),
    getR2BackupStatus: vi.fn(),
    R2BackupSettingsInvalidError,
    uploadBackupPayloadToR2: vi.fn(),
  };
});

const mockedCreateCurrentEditorBackupPayload = vi.mocked(createCurrentEditorBackupPayload);
const mockedGetR2BackupConfig = vi.mocked(getR2BackupConfig);
const mockedGetR2BackupStatus = vi.mocked(getR2BackupStatus);
const mockedUploadBackupPayloadToR2 = vi.mocked(uploadBackupPayloadToR2);
const ORIGINAL_BLOG_DATA_ROOT = process.env.BLOG_DATA_ROOT;
const tempDirectories: string[] = [];

function createTempDataRoot(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-navigation-remote-backup-'));

  tempDirectories.push(directory);
  process.env.BLOG_DATA_ROOT = directory;
  return directory;
}

function getPendingBackupFilePath(dataRoot: string): string {
  return path.join(dataRoot, '.backup-pending.json');
}

function createConfiguredStatus() {
  return {
    enabled: true,
    configured: true,
    bucket: 'blog-data',
    prefix: 'blog-navigation',
    endpoint: 'https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com',
    snapshotOnWrite: false,
    hasAccessKeyId: true,
    hasSecretAccessKey: true,
    source: 'env' as const,
    message: null,
    securityWarning: null,
  };
}

function createBackupPayload(id: string) {
  return {
    version: 1 as const,
    exportedAt: '2026-05-26T00:00:00.000Z',
    source: 'local' as const,
    persistent: true,
    dataRoot: '/var/lib/blog-navigation',
    data: {
      articles: [],
      navigation: [],
      settings: {
        ...DEFAULT_SITE_SETTINGS,
        siteName: id,
      },
    },
    manifest: {
      version: 1 as const,
      updatedAt: '2026-05-26T00:00:00.000Z',
      resources: {},
    },
  };
}

function createDeferred<T = R2UploadResult>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return {
    promise,
    resolve,
  };
}

describe('remote backup sync', () => {
  beforeEach(() => {
    createTempDataRoot();
    vi.clearAllMocks();
    resetRemoteBackupQueueForTests();
  });

  afterEach(() => {
    resetRemoteBackupQueueForTests();

    if (ORIGINAL_BLOG_DATA_ROOT === undefined) {
      delete process.env.BLOG_DATA_ROOT;
    } else {
      process.env.BLOG_DATA_ROOT = ORIGINAL_BLOG_DATA_ROOT;
    }

    while (tempDirectories.length > 0) {
      fs.rmSync(tempDirectories.pop() as string, { recursive: true, force: true });
    }
  });

  it('reports invalid R2 settings without creating or uploading a backup payload', async () => {
    mockedGetR2BackupConfig.mockImplementation(() => {
      throw new R2BackupSettingsInvalidError('cloudflare-r2.json');
    });

    await expect(syncCurrentBackupToRemote({ reason: 'articles-write' })).resolves.toEqual({
      enabled: true,
      success: false,
      invalidConfiguration: true,
      message: 'Cloudflare R2 配置文件损坏，请修复或删除后重试。',
    });
    expect(mockedGetR2BackupStatus).not.toHaveBeenCalled();
    expect(mockedCreateCurrentEditorBackupPayload).not.toHaveBeenCalled();
    expect(mockedUploadBackupPayloadToR2).not.toHaveBeenCalled();
  });

  it('serializes queued write backups in durable order', async () => {
    const firstUpload = createDeferred<R2UploadResult>();
    const uploadResult: R2UploadResult = {
      latestKey: 'blog-navigation/latest/backup.json',
      snapshotKey: null,
    };

    mockedGetR2BackupConfig.mockReturnValue({
      bucket: 'blog-data',
      endpoint: 'https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com',
      accessKeyId: 'access-key',
      secretAccessKey: 'secret-key',
      prefix: 'blog-navigation',
      snapshotOnWrite: false,
    });
    mockedGetR2BackupStatus.mockReturnValue(createConfiguredStatus());
    mockedCreateCurrentEditorBackupPayload
      .mockResolvedValueOnce(createBackupPayload('first'))
      .mockResolvedValueOnce(createBackupPayload('stale-middle'))
      .mockResolvedValueOnce(createBackupPayload('latest'));
    mockedUploadBackupPayloadToR2
      .mockReturnValueOnce(firstUpload.promise)
      .mockResolvedValue(uploadResult);

    expect(queueCurrentBackupToRemote({ reason: 'first-write' })).toEqual(
      expect.objectContaining({
        queued: true,
      })
    );
    await Promise.resolve();
    await Promise.resolve();

    queueCurrentBackupToRemote({ reason: 'stale-middle-write' });
    queueCurrentBackupToRemote({ reason: 'latest-write' });

    firstUpload.resolve(uploadResult);
    await waitForRemoteBackupQueueIdleForTests();

    expect(mockedUploadBackupPayloadToR2).toHaveBeenCalledTimes(3);
    expect(mockedUploadBackupPayloadToR2).toHaveBeenNthCalledWith(1, expect.any(Object), {
      reason: 'first-write',
      writeSnapshot: false,
      writeLatest: undefined,
    });
    expect(mockedUploadBackupPayloadToR2).toHaveBeenNthCalledWith(2, expect.any(Object), {
      reason: 'stale-middle-write',
      writeSnapshot: false,
      writeLatest: undefined,
    });
    expect(mockedUploadBackupPayloadToR2).toHaveBeenNthCalledWith(3, expect.any(Object), {
      reason: 'latest-write',
      writeSnapshot: false,
      writeLatest: undefined,
    });
  });

  it('drains a persisted pending backup after a restart', async () => {
    const dataRoot = process.env.BLOG_DATA_ROOT as string;

    mockedGetR2BackupConfig.mockReturnValue({
      bucket: 'blog-data',
      endpoint: 'https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com',
      accessKeyId: 'access-key',
      secretAccessKey: 'secret-key',
      prefix: 'blog-navigation',
      snapshotOnWrite: false,
    });
    mockedGetR2BackupStatus.mockReturnValue(createConfiguredStatus());
    mockedCreateCurrentEditorBackupPayload.mockResolvedValue(createBackupPayload('persisted'));
    mockedUploadBackupPayloadToR2.mockResolvedValue({
      latestKey: 'blog-navigation/latest/backup.json',
      snapshotKey: null,
    });

    expect(queueCurrentBackupToRemote({ reason: 'before-restart' })).toEqual(
      expect.objectContaining({
        queued: true,
      })
    );
    expect(fs.existsSync(getPendingBackupFilePath(dataRoot))).toBe(true);

    await drainPendingBackups();

    expect(mockedUploadBackupPayloadToR2).toHaveBeenCalledWith(expect.any(Object), {
      reason: 'before-restart',
      writeSnapshot: false,
      writeLatest: undefined,
    });
    expect(fs.existsSync(getPendingBackupFilePath(dataRoot))).toBe(false);
  });
});

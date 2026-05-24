import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCurrentEditorBackupPayload } from '@/lib/editor-data-backup';
import { syncCurrentBackupToRemote } from '@/lib/editor-remote-backup';
import {
  getR2BackupConfig,
  getR2BackupStatus,
  R2BackupSettingsInvalidError,
  uploadBackupPayloadToR2,
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

describe('remote backup sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});

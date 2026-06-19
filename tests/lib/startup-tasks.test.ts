import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  drainPendingBackups,
  queueCurrentBackupToRemote,
} from '@/lib/editor-remote-backup';
import {
  verifyEditorMediaStorageConsistency,
} from '@/lib/editor-media-storage';
import {
  resetServerStartupTasksForTests,
  SCHEDULED_REMOTE_BACKUP_INTERVAL_MS,
  startServerStartupTasks,
} from '@/lib/startup-tasks';

vi.mock('@/lib/editor-remote-backup', () => ({
  drainPendingBackups: vi.fn(async () => undefined),
  queueCurrentBackupToRemote: vi.fn(() => ({
    queued: true,
    enabled: true,
    success: null,
    message: 'R2 backup sync has been queued.',
  })),
}));

vi.mock('@/lib/editor-media-storage', () => ({
  verifyEditorMediaStorageConsistency: vi.fn(async () => ({
    checkedAssets: 0,
    checkedFiles: 0,
    missingFiles: [],
    hashMismatches: [],
    orphanFiles: [],
  })),
}));

const mockedDrainPendingBackups = vi.mocked(drainPendingBackups);
const mockedQueueCurrentBackupToRemote = vi.mocked(queueCurrentBackupToRemote);
const mockedVerifyEditorMediaStorageConsistency = vi.mocked(verifyEditorMediaStorageConsistency);

beforeEach(() => {
  vi.useFakeTimers();
  resetServerStartupTasksForTests();
  vi.clearAllMocks();
});

afterEach(() => {
  resetServerStartupTasksForTests();
  vi.useRealTimers();
});

describe('server startup tasks', () => {
  it('drains pending remote backup tasks on startup', async () => {
    startServerStartupTasks();

    await vi.waitFor(() => {
      expect(mockedDrainPendingBackups).toHaveBeenCalledOnce();
    });
  });

  it('queues a full remote backup every three hours without duplicate timers', async () => {
    startServerStartupTasks();
    startServerStartupTasks();

    await vi.advanceTimersByTimeAsync(SCHEDULED_REMOTE_BACKUP_INTERVAL_MS);

    await vi.waitFor(() => {
      expect(mockedDrainPendingBackups).toHaveBeenCalledOnce();
      expect(mockedQueueCurrentBackupToRemote).toHaveBeenCalledOnce();
    });

    expect(mockedQueueCurrentBackupToRemote).toHaveBeenCalledWith({
      reason: 'scheduled-3h',
      writeLatest: true,
      writeSnapshot: true,
    });
  });

  it('warns when scheduled remote backup cannot be queued while R2 is enabled', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    mockedQueueCurrentBackupToRemote.mockReturnValueOnce({
      queued: false,
      enabled: true,
      success: false,
      message: 'Cloudflare R2 配置文件损坏，请修复或删除后重试。',
      invalidConfiguration: true,
    });

    startServerStartupTasks();
    await vi.advanceTimersByTimeAsync(SCHEDULED_REMOTE_BACKUP_INTERVAL_MS);

    await vi.waitFor(() => {
      expect(mockedQueueCurrentBackupToRemote).toHaveBeenCalledOnce();
      expect(consoleWarn).toHaveBeenCalledWith(
        '[startup-tasks] Scheduled remote backup was not queued:',
        'Cloudflare R2 配置文件损坏，请修复或删除后重试。'
      );
    });
  });

  it('does not warn when scheduled remote backup is disabled explicitly', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    mockedQueueCurrentBackupToRemote.mockReturnValueOnce({
      queued: false,
      enabled: false,
      success: false,
      message: 'R2 backup is disabled.',
    });

    startServerStartupTasks();
    await vi.advanceTimersByTimeAsync(SCHEDULED_REMOTE_BACKUP_INTERVAL_MS);

    await vi.waitFor(() => {
      expect(mockedQueueCurrentBackupToRemote).toHaveBeenCalledOnce();
    });

    expect(consoleWarn).not.toHaveBeenCalledWith(
      '[startup-tasks] Scheduled remote backup was not queued:',
      expect.anything()
    );
  });

  it('verifies media storage consistency on startup and only warns on drift', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockedVerifyEditorMediaStorageConsistency.mockResolvedValueOnce({
      checkedAssets: 1,
      checkedFiles: 2,
      missingFiles: ['files/2026/06/missing.png'],
      hashMismatches: [],
      orphanFiles: ['files/2026/06/orphan.png'],
    });

    startServerStartupTasks();

    await vi.waitFor(() => {
      expect(mockedVerifyEditorMediaStorageConsistency).toHaveBeenCalledOnce();
      expect(consoleWarn).toHaveBeenCalledWith(
        '[startup-tasks] Media storage consistency issues detected:',
        expect.objectContaining({
          missingFiles: ['files/2026/06/missing.png'],
          orphanFiles: ['files/2026/06/orphan.png'],
        })
      );
      expect(mockedDrainPendingBackups).toHaveBeenCalledOnce();
    });
  });
});

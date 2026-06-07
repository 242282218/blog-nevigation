import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  drainPendingBackups,
  queueCurrentBackupToRemote,
} from '@/lib/editor-remote-backup';
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

const mockedDrainPendingBackups = vi.mocked(drainPendingBackups);
const mockedQueueCurrentBackupToRemote = vi.mocked(queueCurrentBackupToRemote);

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
});

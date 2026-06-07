import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  drainPendingBackupTasks,
  enqueuePendingBackupTask,
  getBackupQueueStatus,
  readPendingBackupTasksForTests,
  resetBackupCoordinatorForTests,
  retryFailedBackupTasks,
} from '@/lib/backup-coordinator';

const ORIGINAL_BLOG_DATA_ROOT = process.env.BLOG_DATA_ROOT;
const tempDirectories: string[] = [];

function createTempDataRoot(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-navigation-backup-coordinator-'));
  tempDirectories.push(directory);
  process.env.BLOG_DATA_ROOT = directory;
  return directory;
}

function getPendingFilePath(dataRoot: string): string {
  return path.join(dataRoot, '.backup-pending.json');
}

afterEach(() => {
  vi.restoreAllMocks();

  if (ORIGINAL_BLOG_DATA_ROOT === undefined) {
    delete process.env.BLOG_DATA_ROOT;
  } else {
    process.env.BLOG_DATA_ROOT = ORIGINAL_BLOG_DATA_ROOT;
  }

  while (tempDirectories.length > 0) {
    fs.rmSync(tempDirectories.pop() as string, { recursive: true, force: true });
  }
});

beforeEach(() => {
  createTempDataRoot();
  resetBackupCoordinatorForTests();
});

describe('backup coordinator', () => {
  it('persists pending backup tasks atomically', () => {
    const dataRoot = process.env.BLOG_DATA_ROOT as string;
    const task = enqueuePendingBackupTask({
      reason: 'articles-write',
      writeSnapshot: true,
      writeLatest: false,
    });
    const pendingFile = getPendingFilePath(dataRoot);

    expect(fs.existsSync(pendingFile)).toBe(true);
    expect(JSON.parse(fs.readFileSync(pendingFile, 'utf8'))).toEqual({
      version: 2,
      tasks: [
        expect.objectContaining({
          id: task.id,
          reason: 'articles-write',
          retries: 0,
          attempts: 0,
          status: 'pending',
          writeSnapshot: true,
          writeLatest: false,
        }),
      ],
    });
  });

  it('drains successful tasks and removes the pending file', async () => {
    const dataRoot = process.env.BLOG_DATA_ROOT as string;
    enqueuePendingBackupTask({
      reason: 'manual-sync',
      writeSnapshot: false,
    });

    const execute = vi.fn(async () => true);

    await drainPendingBackupTasks(execute);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(readPendingBackupTasksForTests()).toEqual([]);
    expect(fs.existsSync(getPendingFilePath(dataRoot))).toBe(false);
  });

  it('reads legacy version 1 pending tasks as pending version 2 tasks', () => {
    const dataRoot = process.env.BLOG_DATA_ROOT as string;
    const pendingFile = getPendingFilePath(dataRoot);

    fs.writeFileSync(pendingFile, JSON.stringify({
      version: 1,
      tasks: [
        {
          id: 'legacy-task',
          reason: 'legacy-write',
          timestamp: '2026-06-07T00:00:00.000Z',
          retries: 1,
          writeSnapshot: true,
          writeLatest: true,
        },
      ],
    }), 'utf8');

    expect(readPendingBackupTasksForTests()).toEqual([
      expect.objectContaining({
        id: 'legacy-task',
        attempts: 1,
        status: 'pending',
      }),
    ]);
  });

  it('persists snapshot manifest references for auditable queued snapshots', () => {
    const dataRoot = process.env.BLOG_DATA_ROOT as string;
    const snapshotManifest = {
      version: 1 as const,
      updatedAt: '2026-06-07T00:00:00.000Z',
      resources: {
        articles: {
          revision: 'articles-revision',
          hash: 'articles-hash',
          updatedAt: '2026-06-07T00:00:00.000Z',
        },
      },
    };

    enqueuePendingBackupTask({
      reason: 'snapshot-write',
      writeSnapshot: true,
      writeLatest: true,
      snapshotManifest,
      snapshotManifestHash: 'manifest-hash',
    });

    expect(JSON.parse(fs.readFileSync(getPendingFilePath(dataRoot), 'utf8'))).toEqual(
      expect.objectContaining({
        tasks: [
          expect.objectContaining({
            snapshotManifest,
            snapshotManifestHash: 'manifest-hash',
          }),
        ],
      })
    );
  });

  it('marks tasks failed after three attempts instead of deleting them', async () => {
    enqueuePendingBackupTask({
      reason: 'write-failure',
      writeSnapshot: false,
    });

    let currentTime = Date.parse('2026-06-07T00:00:00.000Z');
    const sleep = vi.fn(async (milliseconds: number) => {
      currentTime += milliseconds;
    });
    const execute = vi.fn(async () => false);

    await drainPendingBackupTasks(execute, {
      retryDelayMs: (retries) => retries * 10,
      sleep,
      now: () => new Date(currentTime),
    });

    expect(execute).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 10);
    expect(sleep).toHaveBeenNthCalledWith(2, 20);
    const tasks = readPendingBackupTasksForTests();

    expect(tasks).toEqual([
      expect.objectContaining({
        reason: 'write-failure',
        retries: 3,
        attempts: 3,
        status: 'failed',
        lastError: 'Backup task failed.',
        lastAttemptAt: '2026-06-07T00:00:00.030Z',
      }),
    ]);
    expect(getBackupQueueStatus()).toEqual({
      pending: 0,
      failed: 1,
      failedTasks: [
        expect.objectContaining({
          reason: 'write-failure',
          attempts: 3,
          lastError: 'Backup task failed.',
        }),
      ],
    });
  });

  it('retries failed tasks after manual requeue', async () => {
    enqueuePendingBackupTask({
      reason: 'manual-retry',
      writeSnapshot: false,
    });
    const failingExecute = vi.fn(async () => false);

    await drainPendingBackupTasks(failingExecute, {
      retryDelayMs: () => 0,
      sleep: async () => undefined,
      now: () => new Date('2026-06-07T00:00:00.000Z'),
    });

    expect(readPendingBackupTasksForTests()[0]?.status).toBe('failed');
    expect(retryFailedBackupTasks()).toBe(1);
    expect(readPendingBackupTasksForTests()[0]).toEqual(
      expect.objectContaining({
        status: 'pending',
        retries: 0,
        attempts: 0,
      })
    );

    const successfulExecute = vi.fn(async () => true);

    await drainPendingBackupTasks(successfulExecute);

    expect(successfulExecute).toHaveBeenCalledTimes(1);
    expect(readPendingBackupTasksForTests()).toEqual([]);
  });

  it('keeps concurrent enqueue calls in durable order', async () => {
    await Promise.all([
      Promise.resolve(enqueuePendingBackupTask({ reason: 'first-write', writeSnapshot: false })),
      Promise.resolve(enqueuePendingBackupTask({ reason: 'second-write', writeSnapshot: true })),
      Promise.resolve(enqueuePendingBackupTask({ reason: 'third-write', writeSnapshot: false })),
    ]);

    expect(readPendingBackupTasksForTests().map((task) => task.reason)).toEqual([
      'first-write',
      'second-write',
      'third-write',
    ]);
  });
});

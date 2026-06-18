import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  acquireEditorDataRootLock,
  releaseEditorDataRootLock,
} from '@/lib/editor-data-lock';
import {
  cleanupTempDirectories,
  createTempDirectory,
} from '../helpers/api-route';

const tempDirectories: string[] = [];

function createTempDataRoot(): string {
  const directory = createTempDirectory('blog-navigation-editor-data-lock-');
  tempDirectories.push(directory);
  return directory;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

afterEach(() => {
  vi.restoreAllMocks();
  cleanupTempDirectories(tempDirectories);
});

describe('editor data lock', () => {
  it('serializes lock acquisition through the filesystem lock directory', async () => {
    const dataRoot = createTempDataRoot();
    const firstLock = await acquireEditorDataRootLock(dataRoot);
    let secondAcquired = false;

    const secondLockPromise = acquireEditorDataRootLock(dataRoot).then((lock) => {
      secondAcquired = true;
      return lock;
    });

    await sleep(75);
    expect(secondAcquired).toBe(false);

    releaseEditorDataRootLock(firstLock);
    const secondLock = await secondLockPromise;

    expect(secondAcquired).toBe(true);
    releaseEditorDataRootLock(secondLock);
  });

  it('removes stale locks owned by dead processes before acquiring', async () => {
    const dataRoot = createTempDataRoot();
    const lockDirectory = path.join(dataRoot, '.data-write.lock');
    const heartbeatPath = path.join(lockDirectory, 'heartbeat.json');
    const staleDate = new Date(Date.now() - 60_000);
    const processKill = vi.spyOn(process, 'kill').mockImplementation((() => {
      const error = new Error('Process no longer exists.') as NodeJS.ErrnoException;
      error.code = 'ESRCH';
      throw error;
    }) as typeof process.kill);

    fs.mkdirSync(lockDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(lockDirectory, 'owner.json'),
      JSON.stringify({
        token: 'stale-token',
        pid: 123456,
        acquiredAt: staleDate.toISOString(),
      }),
      'utf8'
    );
    fs.writeFileSync(heartbeatPath, '{}', 'utf8');
    fs.utimesSync(heartbeatPath, staleDate, staleDate);

    const lock = await acquireEditorDataRootLock(dataRoot);

    expect(processKill).toHaveBeenCalledWith(123456, 0);
    expect(JSON.parse(fs.readFileSync(path.join(lockDirectory, 'owner.json'), 'utf8'))).toEqual(
      expect.objectContaining({
        pid: process.pid,
      })
    );

    releaseEditorDataRootLock(lock);
  });
});

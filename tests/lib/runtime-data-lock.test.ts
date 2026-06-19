import { afterEach, describe, expect, it, vi } from 'vitest';
import { withRuntimeDataRootLock } from '@/lib/runtime-data-lock';
import {
  cleanupTempDirectories,
  createTempDirectory,
  restoreEnv,
} from '../helpers/api-route';

const ORIGINAL_ENV = {
  BLOG_DATA_ROOT: process.env.BLOG_DATA_ROOT,
};
const tempDirectories: string[] = [];

function createTempDataRoot(): string {
  const directory = createTempDirectory('blog-navigation-runtime-data-lock-');

  tempDirectories.push(directory);
  return directory;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

afterEach(() => {
  vi.restoreAllMocks();
  restoreEnv(ORIGINAL_ENV);
  cleanupTempDirectories(tempDirectories);
});

describe('runtime data root lock', () => {
  it('serializes concurrent top-level operations instead of treating them as reentrant', async () => {
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    const order: string[] = [];
    let releaseFirstOperation: (() => void) | undefined;
    const firstOperationBlocked = new Promise<void>((resolve) => {
      releaseFirstOperation = () => resolve();
    });

    const firstOperation = withRuntimeDataRootLock(async () => {
      order.push('first-start');
      await firstOperationBlocked;
      order.push('first-end');
    });

    await sleep(0);

    const secondOperation = withRuntimeDataRootLock(async () => {
      order.push('second-start');
      order.push('second-end');
    });

    await sleep(50);
    expect(order).toEqual(['first-start']);

    releaseFirstOperation?.();

    await Promise.all([firstOperation, secondOperation]);

    expect(order).toEqual([
      'first-start',
      'first-end',
      'second-start',
      'second-end',
    ]);
  });

  it('allows nested calls in the same async flow without deadlocking', async () => {
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    const order: string[] = [];

    await withRuntimeDataRootLock(async () => {
      order.push('outer-start');

      await withRuntimeDataRootLock(async () => {
        order.push('inner');
      });

      order.push('outer-end');
    });

    expect(order).toEqual([
      'outer-start',
      'inner',
      'outer-end',
    ]);
  });
});

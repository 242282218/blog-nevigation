import path from 'node:path';
import {
    acquireEditorDataRootLock,
    decrementHeldEditorDataLockCount,
    getHeldEditorDataLockCount,
    incrementHeldEditorDataLockCount,
    releaseEditorDataRootLock,
    setHeldEditorDataLockCount,
} from '@/lib/editor-data-lock';
import { getRuntimeDataRootPath } from '@/lib/runtime-config';

export async function withRuntimeDataRootLock<T>(operation: () => T | Promise<T>): Promise<T> {
    const resolvedRoot = path.resolve(getRuntimeDataRootPath());
    const heldCount = getHeldEditorDataLockCount(resolvedRoot);

    if (heldCount > 0) {
        incrementHeldEditorDataLockCount(resolvedRoot);

        try {
            return await operation();
        } finally {
            decrementHeldEditorDataLockCount(resolvedRoot);
        }
    }

    const lock = await acquireEditorDataRootLock(resolvedRoot);
    setHeldEditorDataLockCount(resolvedRoot, 1);

    try {
        return await operation();
    } finally {
        setHeldEditorDataLockCount(resolvedRoot, 0);
        releaseEditorDataRootLock(lock);
    }
}

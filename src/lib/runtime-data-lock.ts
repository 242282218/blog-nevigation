import path from 'node:path';
import {
    acquireEditorDataRootLock,
    getHeldEditorDataLockCount,
    releaseEditorDataRootLock,
    runWithHeldEditorDataLockContext,
} from '@/lib/editor-data-lock';
import { getRuntimeDataRootPath } from '@/lib/runtime-config';

export async function withRuntimeDataRootLock<T>(operation: () => T | Promise<T>): Promise<T> {
    const resolvedRoot = path.resolve(getRuntimeDataRootPath());
    const heldCount = getHeldEditorDataLockCount(resolvedRoot);

    if (heldCount > 0) {
        return await runWithHeldEditorDataLockContext(resolvedRoot, operation);
    }

    const lock = await acquireEditorDataRootLock(resolvedRoot);

    return await runWithHeldEditorDataLockContext(resolvedRoot, async () => {
        try {
            return await operation();
        } finally {
            releaseEditorDataRootLock(lock);
        }
    });
}

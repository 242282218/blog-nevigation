import fs from 'node:fs';
import path from 'node:path';
import { getRuntimeDataRootPath } from '@/lib/runtime-config';

let startupTasksStarted = false;
let scheduledRemoteBackupTimer: ReturnType<typeof setInterval> | null = null;

export const SCHEDULED_REMOTE_BACKUP_INTERVAL_MS = 3 * 60 * 60 * 1000;

async function drainRemoteBackupQueue(): Promise<void> {
    const { drainPendingBackups } = await import('@/lib/editor-remote-backup');

    await drainPendingBackups();
}

async function queueScheduledRemoteBackup(): Promise<void> {
    const { queueCurrentBackupToRemote } = await import('@/lib/editor-remote-backup');

    queueCurrentBackupToRemote({
        reason: 'scheduled-3h',
        writeLatest: true,
        writeSnapshot: true,
    });
}

async function verifyMediaStorageConsistency(): Promise<void> {
    const { verifyEditorMediaStorageConsistency } = await import('@/lib/editor-media-storage');
    const report = await verifyEditorMediaStorageConsistency();

    if (report.missingFiles.length === 0 && report.hashMismatches.length === 0 && report.orphanFiles.length === 0) {
        return;
    }

    console.warn('[startup-tasks] Media storage consistency issues detected:', report);
}

function schedulePeriodicRemoteBackup(): void {
    if (scheduledRemoteBackupTimer) {
        return;
    }

    scheduledRemoteBackupTimer = setInterval(() => {
        void queueScheduledRemoteBackup().catch((error) => {
            console.error('[startup-tasks] Failed to queue scheduled remote backup:', error);
        });
    }, SCHEDULED_REMOTE_BACKUP_INTERVAL_MS);

    scheduledRemoteBackupTimer.unref?.();
}

// Verifies the runtime data root is writable so misconfiguration surfaces at
// startup instead of during the first write attempt. Errors are logged only;
// they do not abort startup so the process can still serve read-only traffic.
function verifyDataRootWritable(): void {
    const dataRoot = getRuntimeDataRootPath();
    const probePath = path.join(dataRoot, `.startup-probe-${process.pid}-${Date.now()}.tmp`);

    try {
        fs.mkdirSync(dataRoot, { recursive: true });
        fs.writeFileSync(probePath, 'startup-probe', 'utf8');
        fs.unlinkSync(probePath);
    } catch (error) {
        console.error(`[startup-tasks] Data root is not writable: ${dataRoot}`, error);
    }
}

export function startServerStartupTasks(): void {
    if (startupTasksStarted) {
        return;
    }

    startupTasksStarted = true;
    verifyDataRootWritable();
    schedulePeriodicRemoteBackup();

    void verifyMediaStorageConsistency().catch((error) => {
        console.error('[startup-tasks] Failed to verify media storage consistency:', error);
    });

    void drainRemoteBackupQueue().catch((error) => {
        console.error('[startup-tasks] Failed to drain pending backups:', error);
    });
}

export function resetServerStartupTasksForTests(): void {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('resetServerStartupTasksForTests must not be called in production.');
    }

    startupTasksStarted = false;

    if (scheduledRemoteBackupTimer) {
        clearInterval(scheduledRemoteBackupTimer);
        scheduledRemoteBackupTimer = null;
    }
}

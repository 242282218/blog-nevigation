import {
    drainPendingBackups,
    queueCurrentBackupToRemote,
} from '@/lib/editor-remote-backup';

let startupTasksStarted = false;
let scheduledRemoteBackupTimer: ReturnType<typeof setInterval> | null = null;

export const SCHEDULED_REMOTE_BACKUP_INTERVAL_MS = 3 * 60 * 60 * 1000;

function schedulePeriodicRemoteBackup(): void {
    if (scheduledRemoteBackupTimer) {
        return;
    }

    scheduledRemoteBackupTimer = setInterval(() => {
        try {
            queueCurrentBackupToRemote({
                reason: 'scheduled-3h',
                writeLatest: true,
                writeSnapshot: true,
            });
        } catch (error) {
            console.error('[startup-tasks] Failed to queue scheduled remote backup:', error);
        }
    }, SCHEDULED_REMOTE_BACKUP_INTERVAL_MS);

    scheduledRemoteBackupTimer.unref?.();
}

export function startServerStartupTasks(): void {
    if (startupTasksStarted) {
        return;
    }

    startupTasksStarted = true;
    schedulePeriodicRemoteBackup();

    void drainPendingBackups().catch((error) => {
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

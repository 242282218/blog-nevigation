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

export function startServerStartupTasks(): void {
    if (startupTasksStarted) {
        return;
    }

    startupTasksStarted = true;
    schedulePeriodicRemoteBackup();

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

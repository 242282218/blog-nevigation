import { drainPendingBackups } from '@/lib/editor-remote-backup';

let startupTasksStarted = false;

export function startServerStartupTasks(): void {
    if (startupTasksStarted) {
        return;
    }

    startupTasksStarted = true;

    void drainPendingBackups().catch((error) => {
        console.error('[startup-tasks] Failed to drain pending backups:', error);
    });
}

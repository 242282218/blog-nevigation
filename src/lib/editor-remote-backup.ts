import { createCurrentEditorBackupPayload } from '@/lib/editor-data-backup';
import {
    getR2BackupConfig,
    getR2BackupStatus,
    uploadBackupPayloadToR2,
} from '@/lib/r2-backup-storage';

export type RemoteBackupResult =
    | {
        enabled: false;
        success: false;
        message: string;
    }
    | {
        enabled: true;
        success: true;
        latestKey: string;
        snapshotKey: string | null;
    }
    | {
        enabled: true;
        success: false;
        message: string;
    };

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Remote backup failed.';
}

export async function syncCurrentBackupToRemote(options: {
    reason: string;
    writeSnapshot?: boolean;
}): Promise<RemoteBackupResult> {
    const config = getR2BackupConfig();
    const status = getR2BackupStatus();

    if (!status.enabled) {
        return {
            enabled: false,
            success: false,
            message: 'R2 backup is disabled.',
        };
    }

    if (!config) {
        return {
            enabled: true,
            success: false,
            message: status.message ?? 'R2 backup is not configured.',
        };
    }

    try {
        const payload = createCurrentEditorBackupPayload();
        const result = await uploadBackupPayloadToR2(payload, {
            reason: options.reason,
            writeSnapshot: options.writeSnapshot ?? config.snapshotOnWrite,
        });

        return {
            enabled: true,
            success: true,
            latestKey: result.latestKey,
            snapshotKey: result.snapshotKey,
        };
    } catch (error) {
        console.error('[editor-remote-backup] Failed to sync backup to R2:', error);

        return {
            enabled: true,
            success: false,
            message: getErrorMessage(error),
        };
    }
}

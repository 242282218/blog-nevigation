import { createCurrentEditorBackupPayload } from '@/lib/editor-data-backup';
import {
    getR2BackupConfig,
    getR2BackupStatus,
    R2BackupSettingsInvalidError,
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
        latestKey: string | null;
        snapshotKey: string | null;
    }
    | {
        enabled: true;
        success: false;
        message: string;
        invalidConfiguration?: boolean;
    };

export type QueuedRemoteBackupResult =
    | {
        queued: false;
        enabled: false;
        success: false;
        message: string;
    }
    | {
        queued: true;
        enabled: true;
        success: null;
        message: string;
    }
    | {
        queued: false;
        enabled: true;
        success: false;
        message: string;
        invalidConfiguration?: boolean;
    };

type RemoteBackupOptions = {
    reason: string;
    writeSnapshot?: boolean;
    writeLatest?: boolean;
};

let activeRemoteBackup: Promise<RemoteBackupResult> | null = null;
let pendingRemoteBackupOptions: RemoteBackupOptions | null = null;

function getErrorMessage(error: unknown): string {
    if (error instanceof R2BackupSettingsInvalidError) {
        return 'Cloudflare R2 配置文件损坏，请修复或删除后重试。';
    }

    return error instanceof Error && error.message ? error.message : 'Remote backup failed.';
}

function createQueuedResult(): QueuedRemoteBackupResult {
    return {
        queued: true,
        enabled: true,
        success: null,
        message: 'R2 backup sync has been queued.',
    };
}

export function queueCurrentBackupToRemote(options: {
    reason: string;
    writeSnapshot?: boolean;
    writeLatest?: boolean;
}): QueuedRemoteBackupResult {
    try {
        const config = getR2BackupConfig();
        const status = getR2BackupStatus();

        if (!status.enabled) {
            return {
                queued: false,
                enabled: false,
                success: false,
                message: 'R2 backup is disabled.',
            };
        }

        if (!config) {
            return {
                queued: false,
                enabled: true,
                success: false,
                message: status.message ?? 'R2 backup is not configured.',
            };
        }

        enqueueRemoteBackup({
            reason: options.reason,
            writeSnapshot: options.writeSnapshot ?? config.snapshotOnWrite,
            writeLatest: options.writeLatest,
        });

        return createQueuedResult();
    } catch (error) {
        if (error instanceof R2BackupSettingsInvalidError) {
            return {
                queued: false,
                enabled: true,
                success: false,
                invalidConfiguration: true,
                message: 'Cloudflare R2 配置文件损坏，请修复或删除后重试。',
            };
        }

        throw error;
    }
}

function enqueueRemoteBackup(options: RemoteBackupOptions): void {
    pendingRemoteBackupOptions = options;

    if (activeRemoteBackup) {
        return;
    }

    void drainRemoteBackupQueue();
}

async function drainRemoteBackupQueue(): Promise<void> {
    while (pendingRemoteBackupOptions) {
        const options = pendingRemoteBackupOptions;
        pendingRemoteBackupOptions = null;
        activeRemoteBackup = syncCurrentBackupToRemote(options);

        try {
            await activeRemoteBackup;
        } catch (error) {
            console.error('[editor-remote-backup] Queued backup failed:', error);
        } finally {
            activeRemoteBackup = null;
        }
    }
}

export async function syncCurrentBackupToRemote(options: RemoteBackupOptions): Promise<RemoteBackupResult> {
    let config;
    let status;

    try {
        config = getR2BackupConfig();
        status = getR2BackupStatus();
    } catch (error) {
        if (error instanceof R2BackupSettingsInvalidError) {
            return {
                enabled: true,
                success: false,
                invalidConfiguration: true,
                message: 'Cloudflare R2 配置文件损坏，请修复或删除后重试。',
            };
        }

        throw error;
    }

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
        const payload = await createCurrentEditorBackupPayload();
        const result = await uploadBackupPayloadToR2(payload, {
            reason: options.reason,
            writeSnapshot: options.writeSnapshot ?? config.snapshotOnWrite,
            writeLatest: options.writeLatest,
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

export function resetRemoteBackupQueueForTests(): void {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('resetRemoteBackupQueueForTests must not be called in production.');
    }

    activeRemoteBackup = null;
    pendingRemoteBackupOptions = null;
}

export async function waitForRemoteBackupQueueIdleForTests(): Promise<void> {
    while (activeRemoteBackup || pendingRemoteBackupOptions) {
        await activeRemoteBackup?.catch(() => undefined);
        await Promise.resolve();
    }
}

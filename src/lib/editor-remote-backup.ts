import {
    createCurrentEditorBackupPayload,
    createCurrentEditorManifestSnapshotReference,
    createEditorDataManifestHash,
    isSameEditorManifestSnapshot,
} from '@/lib/editor-data-backup';
import {
    drainPendingBackupTasks,
    enqueuePendingBackupTask,
    getBackupQueueStatus,
    resetBackupCoordinatorForTests,
    retryFailedBackupTasks,
    waitForBackupCoordinatorIdleForTests,
    type BackupTask,
    type BackupQueueStatus,
} from '@/lib/backup-coordinator';
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
    expectedSnapshotManifest?: BackupTask['snapshotManifest'];
    expectedSnapshotManifestHash?: string;
};

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
    const snapshotReference = options.writeSnapshot
        ? createCurrentEditorManifestSnapshotReference()
        : null;

    enqueuePendingBackupTask({
        reason: options.reason,
        writeSnapshot: Boolean(options.writeSnapshot),
        writeLatest: options.writeLatest,
        snapshotManifest: snapshotReference?.manifest,
        snapshotManifestHash: snapshotReference?.manifestHash,
    });
    void drainPendingBackups();
}

async function executePendingBackupTask(task: BackupTask): Promise<boolean> {
    const result = await syncCurrentBackupToRemote({
        reason: task.reason,
        writeSnapshot: task.writeSnapshot,
        writeLatest: task.writeLatest,
        expectedSnapshotManifest: task.snapshotManifest,
        expectedSnapshotManifestHash: task.snapshotManifestHash,
    });

    if (result.enabled === true && result.success === true) {
        return true;
    }

    throw new Error(result.message);
}

export async function drainPendingBackups(): Promise<void> {
    await drainPendingBackupTasks(executePendingBackupTask);
}

export function getRemoteBackupQueueStatus(): BackupQueueStatus {
    return getBackupQueueStatus();
}

export function retryFailedRemoteBackups(): { retried: number; backupQueue: BackupQueueStatus } {
    const retried = retryFailedBackupTasks();

    if (retried > 0) {
        void drainPendingBackups();
    }

    return {
        retried,
        backupQueue: getRemoteBackupQueueStatus(),
    };
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
        const currentManifest = payload.manifest;

        if (options.writeSnapshot && options.expectedSnapshotManifest) {
            if (!currentManifest || !isSameEditorManifestSnapshot(options.expectedSnapshotManifest, currentManifest)) {
                throw new Error('R2 snapshot manifest changed before upload; snapshot was not written.');
            }
        }

        if (options.writeSnapshot && options.expectedSnapshotManifestHash && currentManifest) {
            const currentManifestHash = createEditorDataManifestHash(currentManifest);

            if (currentManifestHash !== options.expectedSnapshotManifestHash) {
                throw new Error('R2 snapshot manifest hash changed before upload; snapshot was not written.');
            }
        }

        const result = await uploadBackupPayloadToR2(payload, {
            reason: options.reason,
            writeSnapshot: options.writeSnapshot ?? config.snapshotOnWrite,
            writeLatest: options.writeLatest,
            manifestHash: options.expectedSnapshotManifestHash,
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

    resetBackupCoordinatorForTests();
}

export async function waitForRemoteBackupQueueIdleForTests(): Promise<void> {
    await waitForBackupCoordinatorIdleForTests();
}

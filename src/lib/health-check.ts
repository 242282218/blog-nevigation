import { getAppVersionInfo } from '@/lib/app-version';
import { getRemoteBackupQueueStatus } from '@/lib/editor-remote-backup';
import {
    getEditorDataManifestFilePath,
    readEditorDataManifest,
} from '@/lib/editor-data-storage';
import { getRuntimeDataRoot } from '@/lib/runtime-config';
import { hasWritableRuntimeDataRoot } from '@/lib/runtime-data-root';

export type HealthCheckStatus = 'ok' | 'degraded';

type BackupQueueStatus =
    | ReturnType<typeof getRemoteBackupQueueStatus>
    | {
        pending: null;
        failed: null;
        failedTasks: [];
        message: string;
    };

type ManifestStatus =
    | {
        valid: true;
        path: string | null;
        updatedAt: string;
        schemaVersion: number | null;
    }
    | {
        valid: false;
        path: string | null;
        message: string;
    };

async function createBaseHealthPayload() {
    const dataRoot = getRuntimeDataRoot();
    const writable = await hasWritableRuntimeDataRoot();

    return {
        version: getAppVersionInfo(),
        dataRoot: {
            path: dataRoot.path,
            source: dataRoot.source,
            writable,
        },
    };
}

function readManifestStatus(): ManifestStatus {
    const manifestPath = getEditorDataManifestFilePath();

    try {
        const currentManifest = readEditorDataManifest();

        return {
            valid: true,
            path: manifestPath,
            updatedAt: currentManifest.updatedAt,
            schemaVersion: currentManifest.schemaVersion ?? null,
        };
    } catch (error) {
        return {
            valid: false,
            path: manifestPath,
            message: error instanceof Error ? error.message : 'Manifest check failed.',
        };
    }
}

function readBackupQueueStatus(): BackupQueueStatus {
    try {
        return getRemoteBackupQueueStatus();
    } catch (error) {
        return {
            pending: null,
            failed: null,
            failedTasks: [],
            message: error instanceof Error ? error.message : 'Backup queue check failed.',
        };
    }
}

export async function getHealthPayload() {
    const basePayload = await createBaseHealthPayload();
    const status: HealthCheckStatus = basePayload.dataRoot.writable ? 'ok' : 'degraded';

    return {
        status,
        ...basePayload,
    };
}

export async function getReadinessPayload() {
    const basePayload = await createBaseHealthPayload();
    const manifest = readManifestStatus();
    const backupQueue = readBackupQueueStatus();
    const backupQueueHealthy = backupQueue.pending !== null && backupQueue.failed !== null && backupQueue.failed === 0;
    const status: HealthCheckStatus =
        basePayload.dataRoot.writable && manifest.valid && backupQueueHealthy ? 'ok' : 'degraded';

    return {
        status,
        ...basePayload,
        manifest,
        backupQueue,
    };
}

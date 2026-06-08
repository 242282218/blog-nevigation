import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { getAppVersionInfo } from '@/lib/app-version';
import { getRemoteBackupQueueStatus } from '@/lib/editor-remote-backup';
import {
    getEditorDataManifestFilePath,
    readEditorDataManifest,
} from '@/lib/editor-data-storage';
import { getRuntimeDataRoot } from '@/lib/runtime-config';

export const dynamic = 'force-dynamic';

type HealthCheckStatus = 'ok' | 'degraded';

async function canWriteRuntimeDataRoot(pathname: string): Promise<boolean> {
    try {
        await fsPromises.access(pathname, fs.constants.W_OK);
        return true;
    } catch {
        return false;
    }
}

export async function GET(): Promise<NextResponse> {
    const dataRoot = getRuntimeDataRoot();
    const manifestPath = getEditorDataManifestFilePath();
    const writable = await canWriteRuntimeDataRoot(dataRoot.path);
    let manifest:
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
    let backupQueue:
        | ReturnType<typeof getRemoteBackupQueueStatus>
        | {
            pending: null;
            failed: null;
            failedTasks: [];
            message: string;
        };

    try {
        const currentManifest = readEditorDataManifest();

        manifest = {
            valid: true,
            path: manifestPath,
            updatedAt: currentManifest.updatedAt,
            schemaVersion: currentManifest.schemaVersion ?? null,
        };
    } catch (error) {
        manifest = {
            valid: false,
            path: manifestPath,
            message: error instanceof Error ? error.message : 'Manifest check failed.',
        };
    }

    try {
        backupQueue = getRemoteBackupQueueStatus();
    } catch (error) {
        backupQueue = {
            pending: null,
            failed: null,
            failedTasks: [],
            message: error instanceof Error ? error.message : 'Backup queue check failed.',
        };
    }

    const status: HealthCheckStatus = writable && manifest.valid ? 'ok' : 'degraded';

    return NextResponse.json(
        {
            status,
            version: getAppVersionInfo(),
            dataRoot: {
                path: dataRoot.path,
                source: dataRoot.source,
                writable,
            },
            manifest,
            backupQueue,
        },
        {
            status: status === 'ok' ? 200 : 503,
            headers: {
                'Cache-Control': 'no-store',
            },
        }
    );
}

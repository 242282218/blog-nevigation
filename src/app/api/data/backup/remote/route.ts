import { NextRequest, NextResponse } from 'next/server';
import {
    createEditorDataFileInvalidResponse,
    createEditorDataLockTimeoutResponse,
    createEditorDataRootRequiredResponse,
    ensureEditorSession,
} from '@/lib/editor-api-auth';
import { isEditorDataRootConfigured } from '@/lib/editor-data-storage';
import { restoreEditorBackupPayload } from '@/lib/editor-data-backup';
import { syncCurrentBackupToRemote } from '@/lib/editor-remote-backup';
import {
    downloadLatestBackupPayloadFromR2,
    getR2BackupStatus,
    R2BackupNotConfiguredError,
    R2BackupSettingsInvalidError,
} from '@/lib/r2-backup-storage';
import {
    createRestoreConflictResponse,
    createRestorePreconditionRequiredResponse,
    parseRestoreCurrentManifest,
} from '../restore-precondition';

type RemoteBackupAction = 'sync' | 'restore';

type RemoteBackupRequestBody = {
    action?: unknown;
    currentManifest?: unknown;
};

function parseAction(value: unknown): RemoteBackupAction | null {
    return value === 'sync' || value === 'restore' ? value : null;
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : '远端备份操作失败。';
}

function createInvalidR2SettingsResponse(error: unknown): NextResponse | null {
    if (!(error instanceof R2BackupSettingsInvalidError)) {
        return null;
    }

    return NextResponse.json(
        {
            message: 'Cloudflare R2 配置文件损坏，请修复或删除后重试。',
        },
        { status: 500 }
    );
}

export async function GET(request: NextRequest) {
    const authError = await ensureEditorSession(request);

    if (authError) {
        return authError;
    }

    try {
        return NextResponse.json(getR2BackupStatus());
    } catch (error) {
        const invalidResponse = createInvalidR2SettingsResponse(error);

        if (invalidResponse) {
            return invalidResponse;
        }

        throw error;
    }
}

export async function POST(request: NextRequest) {
    const authError = await ensureEditorSession(request);

    if (authError) {
        return authError;
    }

    if (!isEditorDataRootConfigured()) {
        return createEditorDataRootRequiredResponse();
    }

    const body = (await request.json().catch(() => null)) as RemoteBackupRequestBody | null;
    const action = parseAction(body?.action);

    if (!action) {
        return NextResponse.json(
            {
                message: '远端备份操作无效。',
            },
            { status: 400 }
        );
    }

    if (action === 'sync') {
        const remoteBackup = await syncCurrentBackupToRemote({
            reason: 'manual-sync',
            writeSnapshot: true,
        });
        const status = remoteBackup.success
            ? 200
            : remoteBackup.enabled
                ? ('invalidConfiguration' in remoteBackup && remoteBackup.invalidConfiguration ? 500 : 502)
                : 409;

        return NextResponse.json(
            {
                success: remoteBackup.success,
                remoteBackup,
            },
            { status }
        );
    }

    try {
        const currentManifest = parseRestoreCurrentManifest(body?.currentManifest);

        if (!currentManifest) {
            return createRestorePreconditionRequiredResponse();
        }

        const payload = await downloadLatestBackupPayloadFromR2();
        const result = restoreEditorBackupPayload(payload, { currentManifest });

        if (!result) {
            return NextResponse.json(
                {
                    message: 'R2 最新备份格式无效，恢复失败。',
                },
                { status: 400 }
            );
        }

        const remoteBackup = await syncCurrentBackupToRemote({
            reason: 'remote-restore',
            writeSnapshot: true,
        });

        return NextResponse.json({
            success: true,
            counts: {
                articles: result.articles,
                categories: result.categories,
                settings: result.settings,
            },
            remoteBackup,
        });
    } catch (error) {
        const lockTimeoutResponse = createEditorDataLockTimeoutResponse(error);

        if (lockTimeoutResponse) {
            return lockTimeoutResponse;
        }

        const invalidResponse = createEditorDataFileInvalidResponse(error);

        if (invalidResponse) {
            return invalidResponse;
        }

        const conflictResponse = createRestoreConflictResponse(error);

        if (conflictResponse) {
            return conflictResponse;
        }

        const invalidR2SettingsResponse = createInvalidR2SettingsResponse(error);

        if (invalidR2SettingsResponse) {
            return invalidR2SettingsResponse;
        }

        const status = error instanceof R2BackupSettingsInvalidError
            ? 500
            : error instanceof R2BackupNotConfiguredError
                ? 503
                : 502;

        return NextResponse.json(
            {
                message: getErrorMessage(error),
            },
            { status }
        );
    }
}

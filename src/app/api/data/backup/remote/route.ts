import { NextRequest, NextResponse } from 'next/server';
import {
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
} from '@/lib/r2-backup-storage';

type RemoteBackupAction = 'sync' | 'restore';

type RemoteBackupRequestBody = {
    action?: unknown;
};

function parseAction(value: unknown): RemoteBackupAction {
    return value === 'restore' ? 'restore' : 'sync';
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : '远端备份操作失败。';
}

export async function GET(request: NextRequest) {
    const authError = await ensureEditorSession(request);

    if (authError) {
        return authError;
    }

    return NextResponse.json(getR2BackupStatus());
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

    if (action === 'sync') {
        const remoteBackup = await syncCurrentBackupToRemote({
            reason: 'manual-sync',
            writeSnapshot: true,
        });
        const status = remoteBackup.success ? 200 : remoteBackup.enabled ? 502 : 409;

        return NextResponse.json(
            {
                success: remoteBackup.success,
                remoteBackup,
            },
            { status }
        );
    }

    try {
        const payload = await downloadLatestBackupPayloadFromR2();
        const result = restoreEditorBackupPayload(payload);

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
        const status = error instanceof R2BackupNotConfiguredError ? 503 : 502;

        return NextResponse.json(
            {
                message: getErrorMessage(error),
            },
            { status }
        );
    }
}

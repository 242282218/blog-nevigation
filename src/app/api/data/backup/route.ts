import { NextRequest, NextResponse } from 'next/server';
import {
    createEditorDataFileInvalidResponse,
    createEditorDataRootRequiredResponse,
    ensureEditorSession,
} from '@/lib/editor-api-auth';
import {
    isEditorDataRootConfigured,
} from '@/lib/editor-data-storage';
import {
    createCurrentEditorBackupPayload,
    restoreEditorBackupPayload,
} from '@/lib/editor-data-backup';
import { syncCurrentBackupToRemote } from '@/lib/editor-remote-backup';
import {
    createRestoreConflictResponse,
    createRestorePreconditionRequiredResponse,
    parseRestoreCurrentManifest,
} from './restore-precondition';

type BackupRequestBody = {
    articles?: unknown;
    navigation?: unknown;
    settings?: unknown;
    currentManifest?: unknown;
    data?: {
        articles?: unknown;
        navigation?: unknown;
        settings?: unknown;
    };
};

export async function GET(request: NextRequest) {
    const authError = await ensureEditorSession(request);

    if (authError) {
        return authError;
    }

    try {
        return NextResponse.json(createCurrentEditorBackupPayload());
    } catch (error) {
        const invalidResponse = createEditorDataFileInvalidResponse(error);

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

    const body = (await request.json().catch(() => null)) as BackupRequestBody | null;
    const currentManifest = parseRestoreCurrentManifest(body?.currentManifest);

    if (!currentManifest) {
        return createRestorePreconditionRequiredResponse();
    }

    let result;

    try {
        result = restoreEditorBackupPayload(body, { currentManifest });
    } catch (error) {
        const invalidResponse = createEditorDataFileInvalidResponse(error);

        if (invalidResponse) {
            return invalidResponse;
        }

        const conflictResponse = createRestoreConflictResponse(error);

        if (conflictResponse) {
            return conflictResponse;
        }

        throw error;
    }

    if (!result) {
        return NextResponse.json(
            {
                message: '备份文件格式无效，恢复失败。',
            },
            { status: 400 }
        );
    }

    const remoteBackup = await syncCurrentBackupToRemote({
        reason: 'local-restore',
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
}

import { NextRequest, NextResponse } from 'next/server';
import {
    createJsonBodyParseErrorResponse,
    createJsonBodyTooLargeResponse,
    EDITOR_JSON_BODY_LIMIT_BYTES,
    JsonBodyParseError,
    JsonBodyTooLargeError,
    readJsonBodyWithLimit,
} from '@/lib/api-json-body';
import {
    createEditorDataFileInvalidResponse,
    createEditorDataLockTimeoutResponse,
    ensureEditorWriteRequest,
    ensureEditorSession,
} from '@/lib/editor-api-auth';
import {
    createCurrentEditorBackupPayload,
    restoreEditorBackupPayload,
} from '@/lib/editor-data-backup';
import { syncCurrentBackupToRemote } from '@/lib/editor-remote-backup';
import { invalidatePublicContentCache } from '@/lib/public-cache-invalidation';
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
        return NextResponse.json(await createCurrentEditorBackupPayload());
    } catch (error) {
        const lockTimeoutResponse = createEditorDataLockTimeoutResponse(error);

        if (lockTimeoutResponse) {
            return lockTimeoutResponse;
        }

        const invalidResponse = createEditorDataFileInvalidResponse(error);

        if (invalidResponse) {
            return invalidResponse;
        }

        throw error;
    }
}

export async function POST(request: NextRequest) {
    const authError = await ensureEditorWriteRequest(request);

    if (authError) {
        return authError;
    }

    let body: BackupRequestBody | null;

    try {
        body = await readJsonBodyWithLimit<BackupRequestBody>(request, EDITOR_JSON_BODY_LIMIT_BYTES);
    } catch (error) {
        if (error instanceof JsonBodyTooLargeError) {
            return createJsonBodyTooLargeResponse();
        }

        if (error instanceof JsonBodyParseError) {
            return createJsonBodyParseErrorResponse();
        }

        throw error;
    }

    const currentManifest = parseRestoreCurrentManifest(body?.currentManifest);

    if (!currentManifest) {
        return createRestorePreconditionRequiredResponse();
    }

    let result;

    try {
        result = await restoreEditorBackupPayload(body, { currentManifest });
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
    invalidatePublicContentCache('local-restore');

    return NextResponse.json({
        success: true,
        counts: {
            articles: result.articles,
            categories: result.categories,
            settings: result.settings,
            media: result.media,
        },
        remoteBackup,
    });
}

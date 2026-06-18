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
    getEditorDataResourceManifest,
    readNavigationFromDisk,
    writeNavigationToDiskIfRevisionMatches,
} from '@/lib/editor-data-storage';
import { queueCurrentBackupToRemote } from '@/lib/editor-remote-backup';
import { parseNavigationData } from '@/lib/navigation-data';
import { invalidatePublicContentCache } from '@/lib/public-cache-invalidation';

type NavigationRequestBody = {
    categories?: unknown;
    revision?: unknown;
};

export async function GET(request: NextRequest) {
    const authError = await ensureEditorSession(request);

    if (authError) {
        return authError;
    }

    try {
        const categories = readNavigationFromDisk();
        const resourceManifest = getEditorDataResourceManifest('navigation', categories);

        return NextResponse.json({
            persistent: true,
            revision: resourceManifest?.revision ?? null,
            categories,
        });
    } catch (error) {
        const invalidResponse = createEditorDataFileInvalidResponse(error);

        if (invalidResponse) {
            return invalidResponse;
        }

        throw error;
    }
}

export async function PUT(request: NextRequest) {
    const authError = await ensureEditorWriteRequest(request);

    if (authError) {
        return authError;
    }

    let body: NavigationRequestBody | null;

    try {
        body = await readJsonBodyWithLimit<NavigationRequestBody>(request, EDITOR_JSON_BODY_LIMIT_BYTES);
    } catch (error) {
        if (error instanceof JsonBodyTooLargeError) {
            return createJsonBodyTooLargeResponse();
        }

        if (error instanceof JsonBodyParseError) {
            return createJsonBodyParseErrorResponse();
        }

        throw error;
    }

    const parsed = parseNavigationData(body?.categories);

    if (!parsed) {
        return NextResponse.json(
            {
                message: '导航数据格式无效。',
            },
            { status: 400 }
        );
    }

    const expectedRevision = typeof body?.revision === 'string' ? body.revision : null;
    let writeResult;

    try {
        writeResult = await writeNavigationToDiskIfRevisionMatches(parsed, expectedRevision);
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

    if (!writeResult.success) {
        return NextResponse.json(
            {
                message: '导航数据已被其他会话更新，请刷新后重试。',
                revision: writeResult.currentManifest?.revision ?? null,
                categories: writeResult.currentValue,
            },
            { status: 409 }
        );
    }

    const remoteBackup = queueCurrentBackupToRemote({
        reason: 'navigation-write',
    });
    invalidatePublicContentCache('navigation-write');

    return NextResponse.json({
        success: true,
        revision: writeResult.resourceManifest.revision,
        remoteBackup,
    });
}

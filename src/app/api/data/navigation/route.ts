import { NextRequest, NextResponse } from 'next/server';
import {
    createEditorDataFileInvalidResponse,
    createEditorDataLockTimeoutResponse,
    createEditorDataRootRequiredResponse,
    ensureEditorSession,
} from '@/lib/editor-api-auth';
import {
    getEditorDataResourceManifest,
    isEditorDataRootConfigured,
    readNavigationFromDisk,
    writeNavigationToDiskIfRevisionMatches,
} from '@/lib/editor-data-storage';
import { syncCurrentBackupToRemote } from '@/lib/editor-remote-backup';
import { parseNavigationData } from '@/lib/navigation-data';

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
            persistent: isEditorDataRootConfigured(),
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
    const authError = await ensureEditorSession(request);

    if (authError) {
        return authError;
    }

    if (!isEditorDataRootConfigured()) {
        return createEditorDataRootRequiredResponse();
    }

    const body = (await request.json().catch(() => null)) as NavigationRequestBody | null;
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
        writeResult = writeNavigationToDiskIfRevisionMatches(parsed, expectedRevision);
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

    const remoteBackup = await syncCurrentBackupToRemote({
        reason: 'navigation-write',
    });

    return NextResponse.json({
        success: true,
        revision: writeResult.resourceManifest.revision,
        remoteBackup,
    });
}

import { NextRequest, NextResponse } from 'next/server';
import {
    createEditorDataRootRequiredResponse,
    ensureEditorSession,
} from '@/lib/editor-api-auth';
import {
    getEditorDataResourceManifest,
    isEditorDataRootConfigured,
    readNavigationFromDisk,
    writeNavigationToDisk,
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

    const categories = readNavigationFromDisk();
    const resourceManifest = getEditorDataResourceManifest('navigation', categories);

    return NextResponse.json({
        persistent: isEditorDataRootConfigured(),
        revision: resourceManifest?.revision ?? null,
        categories,
    });
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

    const currentCategories = readNavigationFromDisk();
    const currentManifest = getEditorDataResourceManifest('navigation', currentCategories);
    const expectedRevision = typeof body?.revision === 'string' ? body.revision : null;

    if (!expectedRevision || currentManifest?.revision !== expectedRevision) {
        return NextResponse.json(
            {
                message: '导航数据已被其他会话更新，请刷新后重试。',
                revision: currentManifest?.revision ?? null,
                categories: currentCategories,
            },
            { status: 409 }
        );
    }

    const resourceManifest = writeNavigationToDisk(parsed);
    const remoteBackup = await syncCurrentBackupToRemote({
        reason: 'navigation-write',
    });

    return NextResponse.json({
        success: true,
        revision: resourceManifest.revision,
        remoteBackup,
    });
}

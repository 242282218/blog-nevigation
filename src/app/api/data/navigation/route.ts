import { NextRequest, NextResponse } from 'next/server';
import {
    createEditorDataRootRequiredResponse,
    ensureEditorSession,
} from '@/lib/editor-api-auth';
import {
    isEditorDataRootConfigured,
    readNavigationFromDisk,
    writeNavigationToDisk,
} from '@/lib/editor-data-storage';
import { syncCurrentBackupToRemote } from '@/lib/editor-remote-backup';
import { parseNavigationData } from '@/lib/navigation-data';

type NavigationRequestBody = {
    categories?: unknown;
};

export async function GET(request: NextRequest) {
    const authError = await ensureEditorSession(request);

    if (authError) {
        return authError;
    }

    return NextResponse.json({
        persistent: isEditorDataRootConfigured(),
        categories: readNavigationFromDisk(),
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

    writeNavigationToDisk(parsed);
    const remoteBackup = await syncCurrentBackupToRemote({
        reason: 'navigation-write',
    });

    return NextResponse.json({
        success: true,
        remoteBackup,
    });
}

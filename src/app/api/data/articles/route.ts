import { NextRequest, NextResponse } from 'next/server';
import { parseArticlesData } from '@/lib/article-data';
import {
    createEditorDataFileInvalidResponse,
    createEditorDataLockTimeoutResponse,
    createEditorDataRootRequiredResponse,
    ensureEditorSession,
} from '@/lib/editor-api-auth';
import {
    isEditorDataRootConfigured,
    getEditorDataResourceManifest,
    readArticlesFromDisk,
    writeArticlesToDiskIfRevisionMatches,
} from '@/lib/editor-data-storage';
import { syncCurrentBackupToRemote } from '@/lib/editor-remote-backup';

type ArticlesRequestBody = {
    articles?: unknown;
    revision?: unknown;
};

export async function GET(request: NextRequest) {
    const authError = await ensureEditorSession(request);

    if (authError) {
        return authError;
    }

    try {
        const articles = readArticlesFromDisk();
        const resourceManifest = getEditorDataResourceManifest('articles', articles);

        return NextResponse.json({
            persistent: isEditorDataRootConfigured(),
            revision: resourceManifest?.revision ?? null,
            articles,
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

    const body = (await request.json().catch(() => null)) as ArticlesRequestBody | null;
    const articles = parseArticlesData(body?.articles);

    if (!articles) {
        return NextResponse.json(
            {
                message: '文章数据格式无效。',
            },
            { status: 400 }
        );
    }

    const expectedRevision = typeof body?.revision === 'string' ? body.revision : null;
    let writeResult;

    try {
        writeResult = writeArticlesToDiskIfRevisionMatches(articles, expectedRevision);
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
                message: '文章数据已被其他会话更新，请刷新后重试。',
                revision: writeResult.currentManifest?.revision ?? null,
                articles: writeResult.currentValue,
            },
            { status: 409 }
        );
    }

    const remoteBackup = await syncCurrentBackupToRemote({
        reason: 'articles-write',
    });

    return NextResponse.json({
        success: true,
        revision: writeResult.resourceManifest.revision,
        remoteBackup,
    });
}

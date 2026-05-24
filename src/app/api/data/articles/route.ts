import { NextRequest, NextResponse } from 'next/server';
import { parseArticlesData } from '@/lib/article-data';
import {
    createEditorDataFileInvalidResponse,
    createEditorDataRootRequiredResponse,
    ensureEditorSession,
} from '@/lib/editor-api-auth';
import {
    isEditorDataRootConfigured,
    getEditorDataResourceManifest,
    readArticlesFromDisk,
    writeArticlesToDisk,
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

    let currentArticles;
    let currentManifest;

    try {
        currentArticles = readArticlesFromDisk();
        currentManifest = getEditorDataResourceManifest('articles', currentArticles);
    } catch (error) {
        const invalidResponse = createEditorDataFileInvalidResponse(error);

        if (invalidResponse) {
            return invalidResponse;
        }

        throw error;
    }

    const expectedRevision = typeof body?.revision === 'string' ? body.revision : null;

    if (!expectedRevision || currentManifest?.revision !== expectedRevision) {
        return NextResponse.json(
            {
                message: '文章数据已被其他会话更新，请刷新后重试。',
                revision: currentManifest?.revision ?? null,
                articles: currentArticles,
            },
            { status: 409 }
        );
    }

    const resourceManifest = writeArticlesToDisk(articles);
    const remoteBackup = await syncCurrentBackupToRemote({
        reason: 'articles-write',
    });

    return NextResponse.json({
        success: true,
        revision: resourceManifest.revision,
        remoteBackup,
    });
}

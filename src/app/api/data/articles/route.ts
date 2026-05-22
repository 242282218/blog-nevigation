import { NextRequest, NextResponse } from 'next/server';
import type { Article } from '@/app/types/article';
import {
    createEditorDataRootRequiredResponse,
    ensureEditorSession,
} from '@/lib/editor-api-auth';
import {
    isEditorDataRootConfigured,
    isArticle,
    readArticlesFromDisk,
    writeArticlesToDisk,
} from '@/lib/editor-data-storage';
import { syncCurrentBackupToRemote } from '@/lib/editor-remote-backup';

type ArticlesRequestBody = {
    articles?: unknown;
};

export async function GET(request: NextRequest) {
    const authError = await ensureEditorSession(request);

    if (authError) {
        return authError;
    }

    return NextResponse.json({
        persistent: isEditorDataRootConfigured(),
        articles: readArticlesFromDisk(),
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

    const body = (await request.json().catch(() => null)) as ArticlesRequestBody | null;
    const articles = body?.articles;

    if (!Array.isArray(articles) || !articles.every(isArticle)) {
        return NextResponse.json(
            {
                message: '文章数据格式无效。',
            },
            { status: 400 }
        );
    }

    writeArticlesToDisk(articles);
    const remoteBackup = await syncCurrentBackupToRemote({
        reason: 'articles-write',
    });

    return NextResponse.json({
        success: true,
        remoteBackup,
    });
}

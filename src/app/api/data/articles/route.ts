import { NextRequest, NextResponse } from 'next/server';
import {
    createJsonBodyParseErrorResponse,
    createJsonBodyTooLargeResponse,
    EDITOR_JSON_BODY_LIMIT_BYTES,
    JsonBodyParseError,
    JsonBodyTooLargeError,
    readJsonBodyWithLimit,
} from '@/lib/api-json-body';
import { parseArticlesData } from '@/lib/article-data';
import {
    createEditorDataFileInvalidResponse,
    createEditorDataLockTimeoutResponse,
    createEditorDataRootRequiredResponse,
    ensureEditorWriteRequest,
    ensureEditorSession,
} from '@/lib/editor-api-auth';
import {
    isEditorDataRootConfigured,
    getEditorDataResourceManifest,
    readArticlesFromDisk,
    writeArticlesToDiskIfRevisionMatches,
} from '@/lib/editor-data-storage';
import { queueCurrentBackupToRemote } from '@/lib/editor-remote-backup';

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
    const authError = await ensureEditorWriteRequest(request);

    if (authError) {
        return authError;
    }

    if (!isEditorDataRootConfigured()) {
        return createEditorDataRootRequiredResponse();
    }

    let body: ArticlesRequestBody | null;

    try {
        body = await readJsonBodyWithLimit<ArticlesRequestBody>(request, EDITOR_JSON_BODY_LIMIT_BYTES);
    } catch (error) {
        if (error instanceof JsonBodyTooLargeError) {
            return createJsonBodyTooLargeResponse();
        }

        if (error instanceof JsonBodyParseError) {
            return createJsonBodyParseErrorResponse();
        }

        throw error;
    }

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
        writeResult = await writeArticlesToDiskIfRevisionMatches(articles, expectedRevision);
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

    const remoteBackup = queueCurrentBackupToRemote({
        reason: 'articles-write',
    });

    return NextResponse.json({
        success: true,
        revision: writeResult.resourceManifest.revision,
        remoteBackup,
    });
}

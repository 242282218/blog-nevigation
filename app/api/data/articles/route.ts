import { NextRequest, NextResponse } from 'next/server';
import type { Article } from '@/app/types/article';
import {
    EDITOR_SESSION_COOKIE,
    getEditorAccessToken,
    isValidEditorSession,
} from '@/lib/editor-auth';
import {
    readArticlesFromDisk,
    writeArticlesToDisk,
} from '@/lib/editor-data-storage';

type ArticlesRequestBody = {
    articles?: unknown;
};

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isArticle(value: unknown): value is Article {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
        typeof candidate.id === 'string' &&
        typeof candidate.title === 'string' &&
        typeof candidate.date === 'string' &&
        typeof candidate.description === 'string' &&
        isStringArray(candidate.tags) &&
        typeof candidate.content === 'string' &&
        isFiniteNumber(candidate.createdAt) &&
        isFiniteNumber(candidate.updatedAt)
    );
}

async function ensureEditorSession(request: NextRequest): Promise<NextResponse | null> {
    if (!getEditorAccessToken()) {
        return NextResponse.json(
            {
                message: '未配置 EDITOR_ACCESS_TOKEN，编辑区已被锁定。',
            },
            { status: 503 }
        );
    }

    const session = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;

    if (!(await isValidEditorSession(session))) {
        return NextResponse.json(
            {
                message: '未授权访问编辑数据。',
            },
            { status: 401 }
        );
    }

    return null;
}

export async function GET(request: NextRequest) {
    const authError = await ensureEditorSession(request);

    if (authError) {
        return authError;
    }

    return NextResponse.json({
        articles: readArticlesFromDisk(),
    });
}

export async function PUT(request: NextRequest) {
    const authError = await ensureEditorSession(request);

    if (authError) {
        return authError;
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

    return NextResponse.json({
        success: true,
    });
}

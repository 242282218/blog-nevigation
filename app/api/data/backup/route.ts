import { NextRequest, NextResponse } from 'next/server';
import type { Article } from '@/app/types/article';
import {
    EDITOR_SESSION_COOKIE,
    getEditorAccessToken,
    isValidEditorSession,
} from '@/lib/editor-auth';
import {
    getEditorDataRoot,
    readArticlesFromDisk,
    readNavigationFromDisk,
    writeArticlesToDisk,
    writeNavigationToDisk,
} from '@/lib/editor-data-storage';
import { parseNavigationData } from '@/lib/navigation-data';

type BackupRequestBody = {
    articles?: unknown;
    navigation?: unknown;
    data?: {
        articles?: unknown;
        navigation?: unknown;
    };
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

function parseArticles(value: unknown): Article[] | null {
    if (!Array.isArray(value)) {
        return null;
    }

    if (!value.every(isArticle)) {
        return null;
    }

    return value;
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
        version: 1,
        exportedAt: new Date().toISOString(),
        dataRoot: getEditorDataRoot(),
        articles: readArticlesFromDisk(),
        navigation: readNavigationFromDisk(),
    });
}

export async function POST(request: NextRequest) {
    const authError = await ensureEditorSession(request);

    if (authError) {
        return authError;
    }

    const body = (await request.json().catch(() => null)) as BackupRequestBody | null;
    const source = body?.data ?? body;

    const articles = parseArticles(source?.articles);
    const navigation = parseNavigationData(source?.navigation);

    if (!articles || !navigation) {
        return NextResponse.json(
            {
                message: '备份文件格式无效，恢复失败。',
            },
            { status: 400 }
        );
    }

    writeArticlesToDisk(articles);
    writeNavigationToDisk(navigation);

    return NextResponse.json({
        success: true,
        counts: {
            articles: articles.length,
            categories: navigation.length,
        },
    });
}

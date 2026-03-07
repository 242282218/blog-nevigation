import { NextRequest, NextResponse } from 'next/server';
import type { Category } from '@/app/types/navigation';
import {
    EDITOR_SESSION_COOKIE,
    getEditorAccessToken,
    isValidEditorSession,
} from '@/lib/editor-auth';
import {
    readNavigationFromDisk,
    writeNavigationToDisk,
} from '@/lib/editor-data-storage';
import { parseNavigationData } from '@/lib/navigation-data';

type NavigationRequestBody = {
    categories?: unknown;
};

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
        categories: readNavigationFromDisk(),
    });
}

export async function PUT(request: NextRequest) {
    const authError = await ensureEditorSession(request);

    if (authError) {
        return authError;
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

    writeNavigationToDisk(parsed as Category[]);

    return NextResponse.json({
        success: true,
    });
}

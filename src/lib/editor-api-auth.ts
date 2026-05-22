import { NextRequest, NextResponse } from 'next/server';
import {
    EDITOR_SESSION_COOKIE,
    getEditorAccessToken,
    isValidEditorSession,
} from '@/lib/editor-auth';

export async function ensureEditorSession(request: NextRequest): Promise<NextResponse | null> {
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

export function createEditorDataRootRequiredResponse(): NextResponse {
    return NextResponse.json(
        {
            message: '未配置 BLOG_DATA_ROOT，编辑数据仅保存在当前浏览器，无法写入服务器。',
        },
        { status: 503 }
    );
}

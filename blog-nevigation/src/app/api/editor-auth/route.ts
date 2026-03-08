import { NextRequest, NextResponse } from 'next/server';
import {
    EDITOR_SESSION_COOKIE,
    createEditorSessionValue,
    getEditorCookieOptions,
    getEditorAccessToken,
    isValidEditorSecret,
} from '@/lib/editor-auth';

export async function POST(request: NextRequest) {
    const configuredSecret = getEditorAccessToken();

    if (!configuredSecret) {
        return NextResponse.json(
            {
                message: '未配置 EDITOR_ACCESS_TOKEN，编辑区已被锁定。',
            },
            { status: 503 }
        );
    }

    const body = await request.json().catch(() => null);
    const secret = typeof body?.secret === 'string' ? body.secret : '';

    if (!(await isValidEditorSecret(secret))) {
        return NextResponse.json(
            {
                message: '口令错误。',
            },
            { status: 401 }
        );
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set(
        EDITOR_SESSION_COOKIE,
        await createEditorSessionValue(configuredSecret),
        getEditorCookieOptions()
    );

    return response;
}

export async function DELETE() {
    const response = NextResponse.json({ success: true });

    response.cookies.set(EDITOR_SESSION_COOKIE, '', {
        ...getEditorCookieOptions(),
        maxAge: 0,
    });

    return response;
}

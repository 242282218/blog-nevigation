import { NextRequest, NextResponse } from 'next/server';
import {
    EDITOR_SESSION_COOKIE,
    getEditorCookieOptions,
} from '@/lib/editor-auth';
import {
    RuntimeEditorAuthAlreadyConfiguredError,
    RuntimeEditorAuthInvalidSecretError,
    createRuntimeEditorSession,
    getCurrentRuntimeEditorSessionValue,
    initializeRuntimeEditorAuth,
    isRuntimeEditorAuthConfigured,
    isRuntimeEditorAuthSetupEnabled,
    isRuntimeEditorAuthSetupTokenRequired,
    isValidRuntimeEditorAuthSetupToken,
    isValidRuntimeEditorSecret,
    isValidRuntimeEditorSession,
    revokeRuntimeEditorSession,
} from '@/lib/editor-auth-runtime';

function createSessionResponse(sessionValue: string): NextResponse {
    const response = NextResponse.json({ success: true });

    response.cookies.set(
        EDITOR_SESSION_COOKIE,
        sessionValue,
        getEditorCookieOptions()
    );

    return response;
}

export async function GET(request: NextRequest) {
    const session = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;

    return NextResponse.json({
        configured: isRuntimeEditorAuthConfigured(),
        authenticated: await isValidRuntimeEditorSession(session),
        setupEnabled: isRuntimeEditorAuthSetupEnabled(),
        setupTokenRequired: isRuntimeEditorAuthSetupTokenRequired(),
    });
}

export async function POST(request: NextRequest) {
    if (!isRuntimeEditorAuthConfigured()) {
        return NextResponse.json(
            {
                message: '未初始化编辑口令，请先完成首次初始化。',
            },
            { status: 503 }
        );
    }

    const body = await request.json().catch(() => null);
    const secret = typeof body?.secret === 'string' ? body.secret : '';

    if (!(await isValidRuntimeEditorSecret(secret))) {
        return NextResponse.json(
            {
                message: '口令错误。',
            },
            { status: 401 }
        );
    }

    const sessionValue = getCurrentRuntimeEditorSessionValue()
        ?? await createRuntimeEditorSession();

    if (!sessionValue) {
        return NextResponse.json(
            {
                message: '未初始化编辑口令，请先完成首次初始化。',
            },
            { status: 503 }
        );
    }

    return createSessionResponse(sessionValue);
}

export async function PUT(request: NextRequest) {
    const body = await request.json().catch(() => null);
    const secret = typeof body?.secret === 'string' ? body.secret : '';
    const confirmSecret = typeof body?.confirmSecret === 'string' ? body.confirmSecret : '';
    const setupToken = typeof body?.setupToken === 'string' ? body.setupToken : '';

    if (!isRuntimeEditorAuthSetupEnabled()) {
        return NextResponse.json(
            {
                message: '首次初始化未启用，请先在服务器配置初始化密钥。',
            },
            { status: 403 }
        );
    }

    if (!isValidRuntimeEditorAuthSetupToken(setupToken)) {
        return NextResponse.json(
            {
                message: '初始化密钥错误。',
            },
            { status: 403 }
        );
    }

    if (!secret.trim() || secret.trim() !== confirmSecret.trim()) {
        return NextResponse.json(
            {
                message: '两次输入的编辑口令不一致。',
            },
            { status: 400 }
        );
    }

    try {
        const sessionValue = await initializeRuntimeEditorAuth(secret);
        return createSessionResponse(sessionValue);
    } catch (error) {
        if (error instanceof RuntimeEditorAuthAlreadyConfiguredError) {
            return NextResponse.json(
                {
                    message: '编辑口令已初始化，请直接登录。',
                },
                { status: 409 }
            );
        }

        if (error instanceof RuntimeEditorAuthInvalidSecretError) {
            return NextResponse.json(
                {
                    message: '编辑口令至少需要 8 个字符。',
                },
                { status: 400 }
            );
        }

        console.error('Failed to initialize editor auth:', error);
        return NextResponse.json(
            {
                message: '初始化编辑口令失败，请检查服务器数据目录写入权限。',
            },
            { status: 500 }
        );
    }
}

export async function DELETE() {
    revokeRuntimeEditorSession();

    const response = NextResponse.json({ success: true });

    response.cookies.set(EDITOR_SESSION_COOKIE, '', {
        ...getEditorCookieOptions(),
        maxAge: 0,
    });

    return response;
}

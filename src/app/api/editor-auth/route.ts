import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import {
    createJsonBodyParseErrorResponse,
    createJsonBodyTooLargeResponse,
    EDITOR_AUTH_JSON_BODY_LIMIT_BYTES,
    JsonBodyParseError,
    JsonBodyTooLargeError,
    readJsonBodyWithLimit,
} from '@/lib/api-json-body';
import {
    EDITOR_CSRF_COOKIE,
    EDITOR_SESSION_COOKIE,
    getEditorAccessToken,
    getEditorCsrfCookieOptions,
    getEditorCookieOptions,
} from '@/lib/editor-auth';
import {
    createEditorAuthConfigInvalidResponse,
    ensureEditorWriteRequest,
} from '@/lib/editor-api-auth';
import {
    RuntimeEditorAuthAlreadyConfiguredError,
    RuntimeEditorAuthInvalidSecretError,
    createRuntimeEditorSession,
    getRuntimeEditorAuthSetupConfigurationError,
    initializeRuntimeEditorAuth,
    isRuntimeEditorAuthConfigured,
    isRuntimeEditorAuthSetupEnabled,
    isRuntimeEditorAuthSetupTokenRequired,
    isValidRuntimeEditorAuthSetupToken,
    isValidRuntimeEditorSecret,
    isValidRuntimeEditorSession,
    readRuntimeEditorAuthConfig,
    revokeRuntimeEditorSession,
} from '@/lib/editor-auth-runtime';
import {
    clearEditorAuthFailures,
    getEditorAuthRateLimitResponse,
    recordEditorAuthFailure,
} from '@/lib/editor-auth-rate-limit';

const EDITOR_RUNTIME_AUTH_SETUP_CONFIG_ERROR_MESSAGE =
    '生产环境开启运行时编辑口令初始化时，必须配置 EDITOR_RUNTIME_AUTH_SETUP_TOKEN。';

function createRuntimeAuthSetupConfigurationErrorResponse(): NextResponse {
    return NextResponse.json(
        {
            message: EDITOR_RUNTIME_AUTH_SETUP_CONFIG_ERROR_MESSAGE,
        },
        { status: 500 }
    );
}

function createSessionResponse(sessionValue: string): NextResponse {
    const csrfToken = randomBytes(32).toString('hex');
    const response = NextResponse.json({ success: true });

    response.cookies.set(
        EDITOR_SESSION_COOKIE,
        sessionValue,
        getEditorCookieOptions()
    );
    response.cookies.set(
        EDITOR_CSRF_COOKIE,
        csrfToken,
        getEditorCsrfCookieOptions()
    );

    return response;
}

function clearSessionCookie(response: NextResponse): NextResponse {
    response.cookies.set(EDITOR_SESSION_COOKIE, '', {
        ...getEditorCookieOptions(),
        maxAge: 0,
    });
    response.cookies.set(EDITOR_CSRF_COOKIE, '', {
        ...getEditorCsrfCookieOptions(),
        maxAge: 0,
    });

    return response;
}

export async function GET(request: NextRequest) {
    try {
        const setupConfigurationError = getRuntimeEditorAuthSetupConfigurationError();

        if (setupConfigurationError) {
            return createRuntimeAuthSetupConfigurationErrorResponse();
        }

        const session = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;

        return NextResponse.json({
            configured: isRuntimeEditorAuthConfigured(),
            authenticated: await isValidRuntimeEditorSession(session),
            setupEnabled: isRuntimeEditorAuthSetupEnabled(),
            setupTokenRequired: isRuntimeEditorAuthSetupTokenRequired(),
        });
    } catch (error) {
        const invalidResponse = createEditorAuthConfigInvalidResponse(error);

        if (invalidResponse) {
            return invalidResponse;
        }

        throw error;
    }
}

export async function POST(request: NextRequest) {
    try {
        if (!isRuntimeEditorAuthConfigured()) {
            return NextResponse.json(
                {
                    message: '未初始化编辑口令，请先完成首次初始化。',
                },
                { status: 503 }
            );
        }

        const rateLimitResponse = getEditorAuthRateLimitResponse(request, 'login');

        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        const body = await readJsonBodyWithLimit<{ secret?: unknown }>(
            request,
            EDITOR_AUTH_JSON_BODY_LIMIT_BYTES
        ).catch((error: unknown) => {
            if (error instanceof JsonBodyTooLargeError) {
                return error;
            }

            if (error instanceof JsonBodyParseError) {
                return error;
            }

            throw error;
        });

        if (body instanceof JsonBodyTooLargeError) {
            return createJsonBodyTooLargeResponse();
        }

        if (body instanceof JsonBodyParseError) {
            return createJsonBodyParseErrorResponse();
        }

        const secret = typeof body?.secret === 'string' ? body.secret : '';

        if (!(await isValidRuntimeEditorSecret(secret))) {
            recordEditorAuthFailure(request, 'login');
            return NextResponse.json(
                {
                    message: '口令错误。',
                },
                { status: 401 }
            );
        }

        clearEditorAuthFailures(request, 'login');
        const sessionValue = await createRuntimeEditorSession();

        if (!sessionValue) {
            return NextResponse.json(
                {
                    message: '未初始化编辑口令，请先完成首次初始化。',
                },
                { status: 503 }
            );
        }

        return createSessionResponse(sessionValue);
    } catch (error) {
        const invalidResponse = createEditorAuthConfigInvalidResponse(error);

        if (invalidResponse) {
            return invalidResponse;
        }

        throw error;
    }
}

export async function PUT(request: NextRequest) {
    try {
        const setupConfigurationError = getRuntimeEditorAuthSetupConfigurationError();

        if (setupConfigurationError) {
            return createRuntimeAuthSetupConfigurationErrorResponse();
        }

        if (!getEditorAccessToken()) {
            readRuntimeEditorAuthConfig();
        }
    } catch (error) {
        const invalidResponse = createEditorAuthConfigInvalidResponse(error);

        if (invalidResponse) {
            return invalidResponse;
        }

        throw error;
    }

    const body = await readJsonBodyWithLimit<{
        secret?: unknown;
        confirmSecret?: unknown;
        setupToken?: unknown;
    }>(request, EDITOR_AUTH_JSON_BODY_LIMIT_BYTES).catch((error: unknown) => {
        if (error instanceof JsonBodyTooLargeError) {
            return error;
        }

        if (error instanceof JsonBodyParseError) {
            return error;
        }

        throw error;
    });

    if (body instanceof JsonBodyTooLargeError) {
        return createJsonBodyTooLargeResponse();
    }

    if (body instanceof JsonBodyParseError) {
        return createJsonBodyParseErrorResponse();
    }

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

    const rateLimitResponse = getEditorAuthRateLimitResponse(request, 'setup');

    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    if (!isValidRuntimeEditorAuthSetupToken(setupToken)) {
        recordEditorAuthFailure(request, 'setup');
        return NextResponse.json(
            {
                message: '初始化密钥错误。',
            },
            { status: 403 }
        );
    }

    if (!secret.trim() || secret.trim() !== confirmSecret.trim()) {
        recordEditorAuthFailure(request, 'setup');
        return NextResponse.json(
            {
                message: '两次输入的编辑口令不一致。',
            },
            { status: 400 }
        );
    }

    try {
        const sessionValue = await initializeRuntimeEditorAuth(secret);
        clearEditorAuthFailures(request, 'setup');
        return createSessionResponse(sessionValue);
    } catch (error) {
        const invalidResponse = createEditorAuthConfigInvalidResponse(error);

        if (invalidResponse) {
            return invalidResponse;
        }

        if (error instanceof RuntimeEditorAuthAlreadyConfiguredError) {
            return NextResponse.json(
                {
                    message: '编辑口令已初始化，请直接登录。',
                },
                { status: 409 }
            );
        }

        if (error instanceof RuntimeEditorAuthInvalidSecretError) {
            recordEditorAuthFailure(request, 'setup');
            return NextResponse.json(
                {
                    message: '编辑口令至少需要 12 个字符。',
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

export async function DELETE(request: NextRequest) {
    const authError = await ensureEditorWriteRequest(request);

    if (authError) {
        return authError;
    }

    try {
        revokeRuntimeEditorSession();
    } catch (error) {
        const invalidResponse = createEditorAuthConfigInvalidResponse(error);

        if (invalidResponse) {
            return clearSessionCookie(invalidResponse);
        }

        throw error;
    }

    return clearSessionCookie(NextResponse.json({ success: true }));
}

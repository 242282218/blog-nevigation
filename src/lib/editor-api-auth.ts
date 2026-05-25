import { NextRequest, NextResponse } from 'next/server';
import {
    EDITOR_SESSION_COOKIE,
} from '@/lib/editor-auth';
import {
    RuntimeEditorAuthConfigInvalidError,
    isRuntimeEditorAuthConfigured,
    isValidRuntimeEditorSession,
} from '@/lib/editor-auth-runtime';
import {
    EditorDataFileInvalidError,
    EditorDataLockTimeoutError,
} from '@/lib/editor-data-storage';

export const EDITOR_AUTH_CONFIG_INVALID_MESSAGE = '编辑口令配置文件损坏，请修复或删除后重试。';

export async function ensureEditorSession(request: NextRequest): Promise<NextResponse | null> {
    try {
        if (!isRuntimeEditorAuthConfigured()) {
            return NextResponse.json(
                {
                    message: '未初始化编辑口令，编辑区已被锁定。',
                },
                { status: 503 }
            );
        }

        const session = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;

        if (!(await isValidRuntimeEditorSession(session))) {
            return NextResponse.json(
                {
                    message: '未授权访问编辑数据。',
                },
                { status: 401 }
            );
        }
    } catch (error) {
        const invalidResponse = createEditorAuthConfigInvalidResponse(error);

        if (invalidResponse) {
            return invalidResponse;
        }

        throw error;
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

export function createEditorDataFileInvalidResponse(error: unknown): NextResponse | null {
    if (!(error instanceof EditorDataFileInvalidError)) {
        return null;
    }

    return NextResponse.json(
        {
            message: '服务器运行时数据文件损坏，请修复数据文件后重试。',
            resource: error.resource,
        },
        { status: 500 }
    );
}

export function createEditorDataLockTimeoutResponse(error: unknown): NextResponse | null {
    if (!(error instanceof EditorDataLockTimeoutError)) {
        return null;
    }

    return NextResponse.json(
        {
            message: '服务器运行时数据正在写入，请稍后重试。',
        },
        { status: 423 }
    );
}

export function createEditorAuthConfigInvalidResponse(error: unknown): NextResponse | null {
    if (!(error instanceof RuntimeEditorAuthConfigInvalidError)) {
        return null;
    }

    return NextResponse.json(
        {
            message: EDITOR_AUTH_CONFIG_INVALID_MESSAGE,
        },
        { status: 500 }
    );
}

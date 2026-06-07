import { NextRequest, NextResponse } from 'next/server';
import {
    createJsonBodyParseErrorResponse,
    createJsonBodyTooLargeResponse,
    EDITOR_SETTINGS_JSON_BODY_LIMIT_BYTES,
    JsonBodyParseError,
    JsonBodyTooLargeError,
    readJsonBodyWithLimit,
} from '@/lib/api-json-body';
import {
    AppRuntimeConfigInvalidError,
    getEditableAppRuntimeConfig,
    getSafeAppRuntimeConfig,
    saveAppRuntimeConfig,
    type EditableAppRuntimeConfig,
} from '@/lib/app-runtime-config';
import {
    RuntimeEditorAuthInvalidSecretError,
    initializeRuntimeEditorAuth,
    isRuntimeEditorAuthConfigured,
    isRuntimeEditorAuthSetupTokenRequired,
    isValidRuntimeEditorAuthSetupToken,
    updateRuntimeEditorAuthSecret,
} from '@/lib/editor-auth-runtime';
import {
    getEditableR2BackupSettings,
    getR2BackupStatus,
    saveEditableR2BackupSettings,
    type EditableR2BackupSettings,
} from '@/lib/r2-backup-storage';
import {
    CloudflareR2BootstrapError,
    bootstrapCloudflareR2Settings,
    type CloudflareR2BootstrapInput,
} from '@/lib/cloudflare-r2-bootstrap';
import { setEditorSessionCookies } from '@/lib/editor-session-response';
import { isApplicationSetupComplete } from '@/lib/setup-state';

type R2SetupMode = 'disabled' | 'manual' | 'cloudflare';

type SetupRequestBody = {
    config?: Partial<Record<keyof EditableAppRuntimeConfig, unknown>>;
    editorSecret?: unknown;
    confirmEditorSecret?: unknown;
    setupToken?: unknown;
    r2SetupMode?: unknown;
    r2Settings?: Partial<Record<keyof EditableR2BackupSettings, unknown>>;
    cloudflareR2Setup?: Partial<Record<keyof CloudflareR2BootstrapInput, unknown>>;
};

function asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function parseTrustedProxyIps(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .map((item) => typeof item === 'string' ? item.trim() : '')
            .filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
}

function parseRuntimeConfig(value: SetupRequestBody['config']): EditableAppRuntimeConfig | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    return {
        publicSiteUrl: asString(value.publicSiteUrl),
        cookieSecure: value.cookieSecure === true,
        trustedProxyIps: parseTrustedProxyIps(value.trustedProxyIps),
        dataRootPath: asString(value.dataRootPath),
    };
}

function validateRuntimeConfigBeforeExternalSetup(config: EditableAppRuntimeConfig): string | null {
    const publicSiteUrl = config.publicSiteUrl.trim();

    if (publicSiteUrl) {
        try {
            const url = new URL(publicSiteUrl);

            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                return '公开站点 URL 必须是有效的 HTTP 或 HTTPS 地址。';
            }
        } catch {
            return '公开站点 URL 必须是有效的 HTTP 或 HTTPS 地址。';
        }
    }

    if (config.trustedProxyIps.some((ip) => ip.includes('\n') || ip.includes('\r') || ip.includes(','))) {
        return '可信代理 IP 请按行填写，不能包含逗号或换行符。';
    }

    return null;
}

function parseR2SetupMode(value: unknown, r2Settings: SetupRequestBody['r2Settings']): R2SetupMode {
    if (value === 'disabled' || value === 'manual' || value === 'cloudflare') {
        return value;
    }

    return r2Settings?.enabled === true ? 'manual' : 'disabled';
}

function createDisabledR2Settings(value: SetupRequestBody['r2Settings']): EditableR2BackupSettings {
    return {
        enabled: false,
        accountId: asString(value?.accountId),
        bucket: asString(value?.bucket),
        accessKeyId: '',
        secretAccessKey: '',
        prefix: asString(value?.prefix) || 'blog-navigation',
        endpoint: asString(value?.endpoint),
        snapshotOnWrite: value?.snapshotOnWrite === true,
    };
}

function parseCloudflareR2Setup(value: SetupRequestBody['cloudflareR2Setup']): CloudflareR2BootstrapInput | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    return {
        authEmail: asString(value.authEmail),
        globalApiKey: asString(value.globalApiKey),
        accountId: asString(value.accountId),
        bucket: asString(value.bucket),
        prefix: asString(value.prefix),
        snapshotOnWrite: value.snapshotOnWrite === true,
    };
}

function parseR2Settings(value: SetupRequestBody['r2Settings']): EditableR2BackupSettings | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    return {
        enabled: value.enabled === true,
        accountId: asString(value.accountId),
        bucket: asString(value.bucket),
        accessKeyId: asString(value.accessKeyId),
        secretAccessKey: asString(value.secretAccessKey),
        prefix: asString(value.prefix),
        endpoint: asString(value.endpoint),
        snapshotOnWrite: value.snapshotOnWrite === true,
    };
}

function createInvalidRuntimeConfigResponse(error: unknown): NextResponse | null {
    if (!(error instanceof AppRuntimeConfigInvalidError)) {
        return null;
    }

    return NextResponse.json(
        {
            message: '运行时配置文件损坏，请修复或删除后重试。',
        },
        { status: 500 }
    );
}

export async function GET() {
    try {
        return NextResponse.json({
            setupCompleted: isApplicationSetupComplete(),
            authConfigured: isRuntimeEditorAuthConfigured(),
            setupTokenRequired: isRuntimeEditorAuthSetupTokenRequired(),
            config: getSafeAppRuntimeConfig(),
            editable: getEditableAppRuntimeConfig(),
            r2Settings: getEditableR2BackupSettings(),
            r2Status: getR2BackupStatus(),
        });
    } catch (error) {
        const invalidResponse = createInvalidRuntimeConfigResponse(error);

        if (invalidResponse) {
            return invalidResponse;
        }

        throw error;
    }
}

export async function PUT(request: NextRequest) {
    if (isApplicationSetupComplete()) {
        return NextResponse.json(
            {
                message: '首次启动引导已完成。',
            },
            { status: 409 }
        );
    }

    let body: SetupRequestBody | null;

    try {
        body = await readJsonBodyWithLimit<SetupRequestBody>(request, EDITOR_SETTINGS_JSON_BODY_LIMIT_BYTES);
    } catch (error) {
        if (error instanceof JsonBodyTooLargeError) {
            return createJsonBodyTooLargeResponse();
        }

        if (error instanceof JsonBodyParseError) {
            return createJsonBodyParseErrorResponse();
        }

        throw error;
    }

    const config = parseRuntimeConfig(body?.config);
    const r2SetupMode = parseR2SetupMode(body?.r2SetupMode, body?.r2Settings);
    const r2Settings = r2SetupMode === 'manual'
        ? parseR2Settings(body?.r2Settings)
        : createDisabledR2Settings(body?.r2Settings);
    const cloudflareR2Setup = r2SetupMode === 'cloudflare'
        ? parseCloudflareR2Setup(body?.cloudflareR2Setup)
        : null;
    const editorSecret = asString(body?.editorSecret).trim();
    const confirmEditorSecret = asString(body?.confirmEditorSecret).trim();
    const setupToken = asString(body?.setupToken);

    if (!config || !r2Settings || (r2SetupMode === 'cloudflare' && !cloudflareR2Setup)) {
        return NextResponse.json(
            {
                message: '初始化配置格式无效。',
            },
            { status: 400 }
        );
    }

    if (isRuntimeEditorAuthSetupTokenRequired() && !isValidRuntimeEditorAuthSetupToken(setupToken)) {
        return NextResponse.json(
            {
                message: '初始化密钥错误。',
            },
            { status: 403 }
        );
    }

    if (!isRuntimeEditorAuthConfigured() && !editorSecret) {
        return NextResponse.json(
            {
                message: '请设置编辑口令。',
            },
            { status: 400 }
        );
    }

    if (editorSecret && editorSecret !== confirmEditorSecret) {
        return NextResponse.json(
            {
                message: '两次输入的编辑口令不一致。',
            },
            { status: 400 }
        );
    }

    if (editorSecret && editorSecret.length < 12) {
        return NextResponse.json(
            {
                message: '编辑口令至少需要 12 个字符。',
            },
            { status: 400 }
        );
    }

    const runtimeConfigError = validateRuntimeConfigBeforeExternalSetup(config);

    if (runtimeConfigError) {
        return NextResponse.json({ message: runtimeConfigError }, { status: 400 });
    }

    try {
        if (r2SetupMode === 'cloudflare') {
            await bootstrapCloudflareR2Settings(cloudflareR2Setup as CloudflareR2BootstrapInput);
        } else {
            saveEditableR2BackupSettings(r2Settings);
        }

        let sessionValue: string | null = null;

        if (editorSecret) {
            sessionValue = isRuntimeEditorAuthConfigured()
                ? await updateRuntimeEditorAuthSecret(editorSecret)
                : await initializeRuntimeEditorAuth(editorSecret);
        }

        saveAppRuntimeConfig(config, { markSetupComplete: true });

        if (!sessionValue) {
            return NextResponse.json({
                success: true,
                config: getSafeAppRuntimeConfig(),
            });
        }

        return setEditorSessionCookies(NextResponse.json({
            success: true,
            config: getSafeAppRuntimeConfig(),
        }), sessionValue);
    } catch (error) {
        const invalidResponse = createInvalidRuntimeConfigResponse(error);

        if (invalidResponse) {
            return invalidResponse;
        }

        if (error instanceof RuntimeEditorAuthInvalidSecretError) {
            return NextResponse.json(
                {
                    message: '编辑口令至少需要 12 个字符。',
                },
                { status: 400 }
            );
        }

        if (error instanceof CloudflareR2BootstrapError) {
            return NextResponse.json(
                { message: error.message },
                { status: error.statusCode }
            );
        }

        const message = error instanceof Error
            ? error.message
            : '首次启动初始化失败。';

        return NextResponse.json({ message }, { status: 400 });
    }
}

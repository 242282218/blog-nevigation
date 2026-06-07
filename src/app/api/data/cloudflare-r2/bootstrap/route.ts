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
    CloudflareR2BootstrapError,
    bootstrapCloudflareR2Settings,
    type CloudflareR2BootstrapInput,
} from '@/lib/cloudflare-r2-bootstrap';
import {
    createEditorDataRootRequiredResponse,
    ensureEditorWriteRequest,
} from '@/lib/editor-api-auth';
import { isEditorDataRootConfigured } from '@/lib/editor-data-storage';
import { R2BackupSettingsInvalidError } from '@/lib/r2-backup-storage';

type CloudflareR2BootstrapRequestBody = {
    bootstrap?: Partial<Record<keyof CloudflareR2BootstrapInput, unknown>>;
};

function asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function parseBootstrapInput(value: CloudflareR2BootstrapRequestBody['bootstrap']): CloudflareR2BootstrapInput | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    return {
        authEmail: asString(value.authEmail),
        globalApiKey: asString(value.globalApiKey),
        accountId: asString(value.accountId),
        bucket: asString(value.bucket),
        backupEncryptionPassphrase: asString(value.backupEncryptionPassphrase),
        prefix: asString(value.prefix),
        snapshotOnWrite: value.snapshotOnWrite === true,
    };
}

function createInvalidR2SettingsResponse(error: unknown): NextResponse | null {
    if (!(error instanceof R2BackupSettingsInvalidError)) {
        return null;
    }

    return NextResponse.json(
        {
            message: 'Cloudflare R2 配置文件损坏，请修复或删除后重试。',
        },
        { status: 500 }
    );
}

export async function POST(request: NextRequest) {
    const authError = await ensureEditorWriteRequest(request);

    if (authError) {
        return authError;
    }

    if (!isEditorDataRootConfigured()) {
        return createEditorDataRootRequiredResponse();
    }

    let body: CloudflareR2BootstrapRequestBody | null;

    try {
        body = await readJsonBodyWithLimit<CloudflareR2BootstrapRequestBody>(
            request,
            EDITOR_SETTINGS_JSON_BODY_LIMIT_BYTES
        );
    } catch (error) {
        if (error instanceof JsonBodyTooLargeError) {
            return createJsonBodyTooLargeResponse();
        }

        if (error instanceof JsonBodyParseError) {
            return createJsonBodyParseErrorResponse();
        }

        throw error;
    }

    const bootstrap = parseBootstrapInput(body?.bootstrap);

    if (!bootstrap) {
        return NextResponse.json(
            {
                message: 'Cloudflare R2 自动配置格式无效。',
            },
            { status: 400 }
        );
    }

    try {
        const result = await bootstrapCloudflareR2Settings(bootstrap);

        return NextResponse.json({
            success: true,
            settings: result.settings,
            status: result.status,
            bucketCreated: result.bucketCreated,
            tokenName: result.tokenName,
        });
    } catch (error) {
        const invalidResponse = createInvalidR2SettingsResponse(error);

        if (invalidResponse) {
            return invalidResponse;
        }

        if (error instanceof CloudflareR2BootstrapError) {
            return NextResponse.json(
                { message: error.message },
                { status: error.statusCode }
            );
        }

        return NextResponse.json(
            { message: 'Cloudflare R2 自动配置失败，请检查 Cloudflare 凭据和账号权限。' },
            { status: 502 }
        );
    }
}

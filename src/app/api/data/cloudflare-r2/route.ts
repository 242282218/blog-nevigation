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
    createEditorDataRootRequiredResponse,
    ensureEditorWriteRequest,
    ensureEditorSession,
} from '@/lib/editor-api-auth';
import { isEditorDataRootConfigured } from '@/lib/editor-data-storage';
import { getRemoteBackupQueueStatus } from '@/lib/editor-remote-backup';
import {
    getEditableR2BackupSettings,
    getR2BackupStatus,
    R2BackupSettingsInvalidError,
    saveEditableR2BackupSettings,
    type EditableR2BackupSettings,
} from '@/lib/r2-backup-storage';

type CloudflareR2RequestBody = {
    settings?: Partial<Record<keyof EditableR2BackupSettings, unknown>>;
};

function asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function parseSettings(value: CloudflareR2RequestBody['settings']): EditableR2BackupSettings | null {
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

export async function GET(request: NextRequest) {
    const authError = await ensureEditorSession(request);

    if (authError) {
        return authError;
    }

    try {
        return NextResponse.json({
            persistent: isEditorDataRootConfigured(),
            settings: getEditableR2BackupSettings(),
            status: getR2BackupStatus(),
            backupQueue: getRemoteBackupQueueStatus(),
        });
    } catch (error) {
        const invalidResponse = createInvalidR2SettingsResponse(error);

        if (invalidResponse) {
            return invalidResponse;
        }

        throw error;
    }
}

export async function PUT(request: NextRequest) {
    const authError = await ensureEditorWriteRequest(request);

    if (authError) {
        return authError;
    }

    if (!isEditorDataRootConfigured()) {
        return createEditorDataRootRequiredResponse();
    }

    let body: CloudflareR2RequestBody | null;

    try {
        body = await readJsonBodyWithLimit<CloudflareR2RequestBody>(request, EDITOR_SETTINGS_JSON_BODY_LIMIT_BYTES);
    } catch (error) {
        if (error instanceof JsonBodyTooLargeError) {
            return createJsonBodyTooLargeResponse();
        }

        if (error instanceof JsonBodyParseError) {
            return createJsonBodyParseErrorResponse();
        }

        throw error;
    }

    const settings = parseSettings(body?.settings);

    if (!settings) {
        return NextResponse.json(
            {
                message: 'Cloudflare R2 配置格式无效。',
            },
            { status: 400 }
        );
    }

    try {
        const savedSettings = saveEditableR2BackupSettings(settings);

        return NextResponse.json({
            success: true,
            settings: savedSettings,
            status: getR2BackupStatus(),
            backupQueue: getRemoteBackupQueueStatus(),
        });
    } catch (error) {
        const invalidResponse = createInvalidR2SettingsResponse(error);

        if (invalidResponse) {
            return invalidResponse;
        }

        const knownPrefixes = [
            '启用 R2 备份时必须填写',
            'Cloudflare R2 Endpoint',
        ];
        const message = error instanceof Error && knownPrefixes.some((prefix) => error.message.startsWith(prefix))
            ? error.message
            : 'Cloudflare R2 配置保存失败，请检查配置格式。';

        return NextResponse.json(
            { message },
            { status: 400 }
        );
    }
}

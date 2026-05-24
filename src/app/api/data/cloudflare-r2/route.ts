import { NextRequest, NextResponse } from 'next/server';
import {
    createEditorDataRootRequiredResponse,
    ensureEditorSession,
} from '@/lib/editor-api-auth';
import { isEditorDataRootConfigured } from '@/lib/editor-data-storage';
import {
    getEditableR2BackupSettings,
    getR2BackupStatus,
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

export async function GET(request: NextRequest) {
    const authError = await ensureEditorSession(request);

    if (authError) {
        return authError;
    }

    return NextResponse.json({
        persistent: isEditorDataRootConfigured(),
        settings: getEditableR2BackupSettings(),
        status: getR2BackupStatus(),
    });
}

export async function PUT(request: NextRequest) {
    const authError = await ensureEditorSession(request);

    if (authError) {
        return authError;
    }

    if (!isEditorDataRootConfigured()) {
        return createEditorDataRootRequiredResponse();
    }

    const body = (await request.json().catch(() => null)) as CloudflareR2RequestBody | null;
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
        });
    } catch (error) {
        return NextResponse.json(
            {
                message: error instanceof Error ? error.message : 'Cloudflare R2 配置保存失败。',
            },
            { status: 400 }
        );
    }
}

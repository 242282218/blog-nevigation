import { NextRequest, NextResponse } from 'next/server';
import {
    createEditorDataRootRequiredResponse,
    ensureEditorSession,
} from '@/lib/editor-api-auth';
import {
    isEditorDataRootConfigured,
    readSiteSettingsFromDisk,
    writeSiteSettingsToDisk,
} from '@/lib/editor-data-storage';
import { syncCurrentBackupToRemote } from '@/lib/editor-remote-backup';
import { parseSiteSettings } from '@/lib/site-settings';

type SettingsRequestBody = {
    settings?: unknown;
};

export async function GET(request: NextRequest) {
    const authError = await ensureEditorSession(request);

    if (authError) {
        return authError;
    }

    return NextResponse.json({
        persistent: isEditorDataRootConfigured(),
        settings: readSiteSettingsFromDisk(),
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

    const body = (await request.json().catch(() => null)) as SettingsRequestBody | null;
    const settings = parseSiteSettings(body?.settings);

    if (!settings) {
        return NextResponse.json(
            {
                message: '站点设置格式无效。',
            },
            { status: 400 }
        );
    }

    writeSiteSettingsToDisk(settings);
    const remoteBackup = await syncCurrentBackupToRemote({
        reason: 'settings-write',
    });

    return NextResponse.json({
        success: true,
        settings,
        remoteBackup,
    });
}

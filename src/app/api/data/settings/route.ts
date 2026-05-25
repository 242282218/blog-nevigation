import { NextRequest, NextResponse } from 'next/server';
import {
    createEditorDataFileInvalidResponse,
    createEditorDataLockTimeoutResponse,
    createEditorDataRootRequiredResponse,
    ensureEditorSession,
} from '@/lib/editor-api-auth';
import {
    getEditorDataResourceManifest,
    isEditorDataRootConfigured,
    readSiteSettingsFromDisk,
    writeSiteSettingsToDiskIfRevisionMatches,
} from '@/lib/editor-data-storage';
import { syncCurrentBackupToRemote } from '@/lib/editor-remote-backup';
import { parseSiteSettings } from '@/lib/site-settings';

type SettingsRequestBody = {
    settings?: unknown;
    revision?: unknown;
};

export async function GET(request: NextRequest) {
    const authError = await ensureEditorSession(request);

    if (authError) {
        return authError;
    }

    try {
        const settings = readSiteSettingsFromDisk();
        const resourceManifest = getEditorDataResourceManifest('settings', settings);

        return NextResponse.json({
            persistent: isEditorDataRootConfigured(),
            revision: resourceManifest?.revision ?? null,
            settings,
        });
    } catch (error) {
        const invalidResponse = createEditorDataFileInvalidResponse(error);

        if (invalidResponse) {
            return invalidResponse;
        }

        throw error;
    }
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

    const expectedRevision = typeof body?.revision === 'string' ? body.revision : null;
    let writeResult;

    try {
        writeResult = writeSiteSettingsToDiskIfRevisionMatches(settings, expectedRevision);
    } catch (error) {
        const lockTimeoutResponse = createEditorDataLockTimeoutResponse(error);

        if (lockTimeoutResponse) {
            return lockTimeoutResponse;
        }

        const invalidResponse = createEditorDataFileInvalidResponse(error);

        if (invalidResponse) {
            return invalidResponse;
        }

        throw error;
    }

    if (!writeResult.success) {
        return NextResponse.json(
            {
                message: '站点设置已被其他会话更新，请刷新后重试。',
                revision: writeResult.currentManifest?.revision ?? null,
                settings: writeResult.currentValue,
            },
            { status: 409 }
        );
    }

    const remoteBackup = await syncCurrentBackupToRemote({
        reason: 'settings-write',
    });

    return NextResponse.json({
        success: true,
        settings,
        revision: writeResult.resourceManifest.revision,
        remoteBackup,
    });
}

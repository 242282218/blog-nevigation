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
    createEditorDataFileInvalidResponse,
    createEditorDataLockTimeoutResponse,
    createEditorDataRootRequiredResponse,
    ensureEditorWriteRequest,
    ensureEditorSession,
} from '@/lib/editor-api-auth';
import {
    getEditorDataResourceManifest,
    isEditorDataRootConfigured,
    readSiteSettingsFromDisk,
    writeSiteSettingsToDiskIfRevisionMatches,
} from '@/lib/editor-data-storage';
import { queueCurrentBackupToRemote } from '@/lib/editor-remote-backup';
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
    const authError = await ensureEditorWriteRequest(request);

    if (authError) {
        return authError;
    }

    if (!isEditorDataRootConfigured()) {
        return createEditorDataRootRequiredResponse();
    }

    let body: SettingsRequestBody | null;

    try {
        body = await readJsonBodyWithLimit<SettingsRequestBody>(request, EDITOR_SETTINGS_JSON_BODY_LIMIT_BYTES);
    } catch (error) {
        if (error instanceof JsonBodyTooLargeError) {
            return createJsonBodyTooLargeResponse();
        }

        if (error instanceof JsonBodyParseError) {
            return createJsonBodyParseErrorResponse();
        }

        throw error;
    }

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
        writeResult = await writeSiteSettingsToDiskIfRevisionMatches(settings, expectedRevision);
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

    const remoteBackup = queueCurrentBackupToRemote({
        reason: 'settings-write',
    });

    return NextResponse.json({
        success: true,
        settings,
        revision: writeResult.resourceManifest.revision,
        remoteBackup,
    });
}

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
} from '@/lib/editor-api-auth';
import {
    assertEditorBackupRestoreCurrentManifest,
    parseEditorBackupData,
    restoreEditorBackupPayload,
} from '@/lib/editor-data-backup';
import { restoreEditorMediaAssetsFromR2 } from '@/lib/editor-media-remote';
import {
    getRemoteBackupQueueStatus,
    retryFailedRemoteBackups,
    syncCurrentBackupToRemote,
} from '@/lib/editor-remote-backup';
import {
    downloadLatestBackupPayloadFromR2,
    getR2BackupStatus,
    R2BackupNotConfiguredError,
    R2BackupPayloadTooLargeError,
    R2BackupSettingsInvalidError,
} from '@/lib/r2-backup-storage';
import { invalidatePublicContentCache } from '@/lib/public-cache-invalidation';
import {
    createRestoreConflictResponse,
    createRestorePreconditionRequiredResponse,
    parseRestoreCurrentManifest,
} from '../restore-precondition';

export type RemoteBackupAction = 'sync' | 'restore';

export type RemoteBackupRequestBody = {
    action?: unknown;
    currentManifest?: unknown;
};

export function parseRemoteBackupAction(value: unknown): RemoteBackupAction | null {
    return value === 'sync' || value === 'restore' ? value : null;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof R2BackupSettingsInvalidError) {
        return '远端备份配置无效。';
    }

    if (error instanceof R2BackupPayloadTooLargeError) {
        return '备份数据超出大小限制。';
    }

    if (error instanceof R2BackupNotConfiguredError) {
        return '远端备份未配置。';
    }

    return '远端备份操作失败，请检查配置后重试。';
}

function createRemoteBackupFailureResponse(
    remoteBackup: Awaited<ReturnType<typeof syncCurrentBackupToRemote>>
): NextResponse {
    if (remoteBackup.success) {
        throw new Error('Expected failed remote backup result.');
    }

    return NextResponse.json(
        {
            message: remoteBackup.message,
            remoteBackup,
        },
        {
            status: 'invalidConfiguration' in remoteBackup && remoteBackup.invalidConfiguration ? 500 : 502,
        }
    );
}

function createRemoteBackupPayloadTooLargeResponse(error: R2BackupPayloadTooLargeError): NextResponse {
    return NextResponse.json(
        {
            code: 'remote_backup_too_large',
            message: `R2 远端备份文件超过 ${error.limitBytes} 字节，恢复失败。`,
        },
        { status: 413 }
    );
}

export function createInvalidR2SettingsResponse(error: unknown): NextResponse | null {
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

export async function readRemoteBackupRequestBody(
    request: NextRequest
): Promise<{ body: RemoteBackupRequestBody | null; response: null } | { body: null; response: NextResponse }> {
    try {
        return {
            body: await readJsonBodyWithLimit<RemoteBackupRequestBody>(request, EDITOR_SETTINGS_JSON_BODY_LIMIT_BYTES),
            response: null,
        };
    } catch (error) {
        if (error instanceof JsonBodyTooLargeError) {
            return {
                body: null,
                response: createJsonBodyTooLargeResponse(),
            };
        }

        if (error instanceof JsonBodyParseError) {
            return {
                body: null,
                response: createJsonBodyParseErrorResponse(),
            };
        }

        throw error;
    }
}

export function createRemoteBackupStatusResponse(): NextResponse {
    try {
        return NextResponse.json({
            ...getR2BackupStatus(),
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

export function createRemoteBackupRetryFailedResponse(): NextResponse {
    const result = retryFailedRemoteBackups();

    return NextResponse.json({
        success: true,
        ...result,
    });
}

export async function createRemoteBackupSyncResponse(): Promise<NextResponse> {
    const remoteBackup = await syncCurrentBackupToRemote({
        reason: 'manual-sync',
        writeSnapshot: true,
    });
    const status = remoteBackup.success
        ? 200
        : remoteBackup.enabled
            ? ('invalidConfiguration' in remoteBackup && remoteBackup.invalidConfiguration ? 500 : 502)
            : 409;

    return NextResponse.json(
        {
            success: remoteBackup.success,
            remoteBackup,
            backupQueue: getRemoteBackupQueueStatus(),
        },
        { status }
    );
}

export async function createRemoteBackupRestoreResponse(currentManifestValue: unknown): Promise<NextResponse> {
    try {
        const currentManifest = parseRestoreCurrentManifest(currentManifestValue);

        if (!currentManifest) {
            return createRestorePreconditionRequiredResponse();
        }

        const payload = await downloadLatestBackupPayloadFromR2();
        const data = parseEditorBackupData(payload);

        if (!data) {
            return NextResponse.json(
                {
                    message: 'R2 最新备份格式无效，恢复失败。',
                },
                { status: 400 }
            );
        }

        assertEditorBackupRestoreCurrentManifest(currentManifest);

        const preRestoreBackup = await syncCurrentBackupToRemote({
            reason: 'pre-remote-restore',
            writeSnapshot: true,
            writeLatest: false,
        });

        if (!preRestoreBackup.success) {
            return createRemoteBackupFailureResponse(preRestoreBackup);
        }

        const result = await restoreEditorBackupPayload({ data }, { currentManifest });

        if (!result) {
            return NextResponse.json(
                {
                    message: 'R2 最新备份格式无效，恢复失败。',
                },
                { status: 400 }
            );
        }

        const mediaRestore = await restoreEditorMediaAssetsFromR2(data.media);
        const remoteBackup = await syncCurrentBackupToRemote({
            reason: 'remote-restore',
            writeSnapshot: true,
        });
        invalidatePublicContentCache('remote-restore');

        return NextResponse.json({
            success: true,
            counts: {
                articles: result.articles,
                categories: result.categories,
                settings: result.settings,
                media: result.media,
            },
            mediaRestore,
            warnings: mediaRestore.failed > 0
                ? [`${mediaRestore.failed} 个媒体文件恢复失败，请检查 R2 媒体对象。`]
                : [],
            remoteBackup,
        });
    } catch (error) {
        const lockTimeoutResponse = createEditorDataLockTimeoutResponse(error);

        if (lockTimeoutResponse) {
            return lockTimeoutResponse;
        }

        const invalidResponse = createEditorDataFileInvalidResponse(error);

        if (invalidResponse) {
            return invalidResponse;
        }

        const conflictResponse = createRestoreConflictResponse(error);

        if (conflictResponse) {
            return conflictResponse;
        }

        const invalidR2SettingsResponse = createInvalidR2SettingsResponse(error);

        if (invalidR2SettingsResponse) {
            return invalidR2SettingsResponse;
        }

        if (error instanceof R2BackupPayloadTooLargeError) {
            return createRemoteBackupPayloadTooLargeResponse(error);
        }

        const status = error instanceof R2BackupSettingsInvalidError
            ? 500
            : error instanceof R2BackupNotConfiguredError
                ? 503
                : 502;

        return NextResponse.json(
            {
                message: getErrorMessage(error),
            },
            { status }
        );
    }
}

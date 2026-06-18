import { NextRequest, NextResponse } from 'next/server';
import { ensureEditorWriteRequest } from '@/lib/editor-api-auth';
import {
    EditorMediaFileTooLargeError,
    EditorMediaInvalidFileError,
    storeEditorMediaFile,
} from '@/lib/editor-media-storage';
import { queueCurrentBackupToRemote } from '@/lib/editor-remote-backup';
import {
    R2BackupSettingsInvalidError,
    uploadMediaAssetToR2,
} from '@/lib/r2-backup-storage';
import { withRuntimeDataRootLock } from '@/lib/runtime-data-lock';

function createInvalidMediaResponse(error: unknown): NextResponse | null {
    if (error instanceof EditorMediaFileTooLargeError) {
        return NextResponse.json(
            {
                code: 'media_too_large',
                message: '图片过大，请压缩后重试。',
                limitBytes: error.limitBytes,
            },
            { status: 413 }
        );
    }

    if (error instanceof EditorMediaInvalidFileError) {
        return NextResponse.json(
            {
                code: 'unsupported_media',
                message: error.message,
            },
            { status: 400 }
        );
    }

    return null;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof R2BackupSettingsInvalidError) {
        return 'Cloudflare R2 配置文件损坏，请修复或删除后重试。';
    }

    return error instanceof Error && error.message ? error.message : '媒体同步到 R2 失败。';
}

function getUploadedFile(value: FormDataEntryValue | null): File | null {
    if (!value || typeof value === 'string') {
        return null;
    }

    return value;
}

async function readUploadedImageBytes(request: NextRequest): Promise<Uint8Array | null> {
    const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';

    if (contentType.startsWith('image/')) {
        return new Uint8Array(await request.arrayBuffer());
    }

    if (!contentType.startsWith('multipart/form-data')) {
        return null;
    }

    const form = await request.formData();
    const file = getUploadedFile(form.get('file'));

    if (!file) {
        return null;
    }

    return new Uint8Array(await file.arrayBuffer());
}

export async function POST(request: NextRequest) {
    const authError = await ensureEditorWriteRequest(request);

    if (authError) {
        return authError;
    }

    let bytes: Uint8Array | null;

    try {
        bytes = await readUploadedImageBytes(request);
    } catch {
        return NextResponse.json(
            {
                message: '图片上传请求格式无效。',
            },
            { status: 400 }
        );
    }

    if (!bytes) {
        return NextResponse.json(
            {
                message: '请选择要上传的图片。',
            },
            { status: 400 }
        );
    }

    try {
        const stored = await withRuntimeDataRootLock(() => storeEditorMediaFile({ bytes }));
        let remoteMedia:
            | Awaited<ReturnType<typeof uploadMediaAssetToR2>>
            | { enabled: true; success: false; message: string; invalidConfiguration?: boolean };

        try {
            remoteMedia = await uploadMediaAssetToR2(stored.asset, bytes);
        } catch (error) {
            remoteMedia = {
                enabled: true,
                success: false,
                invalidConfiguration: error instanceof R2BackupSettingsInvalidError,
                message: getErrorMessage(error),
            };
        }

        const remoteBackup = queueCurrentBackupToRemote({
            reason: 'media-write',
            writeSnapshot: false,
        });

        return NextResponse.json({
            success: true,
            asset: stored.asset,
            remoteMedia,
            remoteBackup,
        });
    } catch (error) {
        const invalidMediaResponse = createInvalidMediaResponse(error);

        if (invalidMediaResponse) {
            return invalidMediaResponse;
        }

        throw error;
    }
}

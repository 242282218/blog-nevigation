import {
    downloadMediaAssetFromR2,
} from '@/lib/r2-backup-storage';
import {
    isEditorMediaAssetPresent,
    writeRestoredEditorMediaFile,
    type EditorMediaManifest,
} from '@/lib/editor-media-storage';

export interface EditorMediaRestoreFailure {
    path: string;
    message: string;
}

export interface EditorMediaRestoreResult {
    total: number;
    restored: number;
    skipped: number;
    failed: number;
    failures: EditorMediaRestoreFailure[];
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error && error.message ? error.message : '媒体文件恢复失败。';
}

export async function restoreEditorMediaAssetsFromR2(
    manifest: EditorMediaManifest | undefined
): Promise<EditorMediaRestoreResult> {
    const assets = manifest?.assets ?? [];
    const result: EditorMediaRestoreResult = {
        total: assets.length,
        restored: 0,
        skipped: 0,
        failed: 0,
        failures: [],
    };

    for (const asset of assets) {
        try {
            if (await isEditorMediaAssetPresent(asset)) {
                result.skipped += 1;
                continue;
            }

            const bytes = await downloadMediaAssetFromR2(asset);
            await writeRestoredEditorMediaFile(asset, bytes);
            result.restored += 1;
        } catch (error) {
            result.failed += 1;
            result.failures.push({
                path: asset.path,
                message: getErrorMessage(error),
            });
        }
    }

    return result;
}

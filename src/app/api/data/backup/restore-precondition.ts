import { NextResponse } from 'next/server';
import { EditorBackupRestoreConflictError } from '@/lib/editor-data-backup';
import {
    parseEditorDataManifest,
    type EditorDataManifest,
} from '@/lib/editor-data-storage';

export function parseRestoreCurrentManifest(value: unknown): EditorDataManifest | null {
    return parseEditorDataManifest(value);
}

export function createRestorePreconditionRequiredResponse(): NextResponse {
    return NextResponse.json(
        {
            message: '恢复前当前数据状态缺失，请刷新页面后重试。',
        },
        { status: 409 }
    );
}

export function createRestoreConflictResponse(error: unknown): NextResponse | null {
    if (!(error instanceof EditorBackupRestoreConflictError)) {
        return null;
    }

    return NextResponse.json(
        {
            message: '当前数据已被其他会话更新，请刷新后重新执行恢复。',
            currentManifest: error.currentManifest,
        },
        { status: 409 }
    );
}

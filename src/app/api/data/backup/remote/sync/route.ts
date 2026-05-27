import { NextRequest } from 'next/server';
import {
    createEditorDataRootRequiredResponse,
    ensureEditorWriteRequest,
} from '@/lib/editor-api-auth';
import { isEditorDataRootConfigured } from '@/lib/editor-data-storage';
import { createRemoteBackupSyncResponse } from '../actions';

export async function POST(request: NextRequest) {
    const authError = await ensureEditorWriteRequest(request);

    if (authError) {
        return authError;
    }

    if (!isEditorDataRootConfigured()) {
        return createEditorDataRootRequiredResponse();
    }

    return createRemoteBackupSyncResponse();
}

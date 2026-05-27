import { NextRequest } from 'next/server';
import {
    createEditorDataRootRequiredResponse,
    ensureEditorWriteRequest,
} from '@/lib/editor-api-auth';
import { isEditorDataRootConfigured } from '@/lib/editor-data-storage';
import {
    createRemoteBackupRestoreResponse,
    readRemoteBackupRequestBody,
} from '../actions';

export async function POST(request: NextRequest) {
    const authError = await ensureEditorWriteRequest(request);

    if (authError) {
        return authError;
    }

    if (!isEditorDataRootConfigured()) {
        return createEditorDataRootRequiredResponse();
    }

    const { body, response } = await readRemoteBackupRequestBody(request);

    if (response) {
        return response;
    }

    return createRemoteBackupRestoreResponse(body?.currentManifest);
}

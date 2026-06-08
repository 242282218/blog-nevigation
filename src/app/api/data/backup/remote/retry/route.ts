import { NextRequest } from 'next/server';
import {
    createEditorDataRootRequiredResponse,
    ensureEditorWriteRequest,
} from '@/lib/editor-api-auth';
import { isEditorDataRootConfigured } from '@/lib/editor-data-storage';
import { recordEditorAuditEvent } from '@/lib/editor-audit-log';
import { createRemoteBackupRetryFailedResponse } from '../actions';

export async function POST(request: NextRequest) {
    const authError = await ensureEditorWriteRequest(request);

    if (authError) {
        return authError;
    }

    if (!isEditorDataRootConfigured()) {
        return createEditorDataRootRequiredResponse();
    }

    const response = createRemoteBackupRetryFailedResponse();

    recordEditorAuditEvent({
        action: 'r2.backup.retry',
        resource: 'cloudflare-r2',
        outcome: 'success',
    });

    return response;
}

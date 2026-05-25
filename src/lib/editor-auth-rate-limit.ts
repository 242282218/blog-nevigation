import { NextRequest, NextResponse } from 'next/server';

const AUTH_FAILURE_LIMIT = 5;
const AUTH_FAILURE_WINDOW_MS = 15 * 60 * 1000;

type AuthOperation = 'login' | 'setup';

interface AuthFailureBucket {
    count: number;
    resetAt: number;
}

const authFailureBuckets = new Map<AuthOperation, AuthFailureBucket>();

function getActiveAuthFailureBucket(operation: AuthOperation): AuthFailureBucket | null {
    const bucket = authFailureBuckets.get(operation);

    if (!bucket) {
        return null;
    }

    if (bucket.resetAt <= Date.now()) {
        authFailureBuckets.delete(operation);
        return null;
    }

    return bucket;
}

function createRateLimitResponse(): NextResponse {
    return NextResponse.json(
        {
            message: '尝试次数过多，请稍后再试。',
        },
        { status: 429 }
    );
}

export function getEditorAuthRateLimitResponse(
    request: NextRequest,
    operation: AuthOperation
): NextResponse | null {
    void request;

    const bucket = getActiveAuthFailureBucket(operation);

    if (!bucket || bucket.count < AUTH_FAILURE_LIMIT) {
        return null;
    }

    return createRateLimitResponse();
}

export function recordEditorAuthFailure(request: NextRequest, operation: AuthOperation): void {
    void request;

    const bucket = getActiveAuthFailureBucket(operation);

    if (!bucket) {
        authFailureBuckets.set(operation, {
            count: 1,
            resetAt: Date.now() + AUTH_FAILURE_WINDOW_MS,
        });
        return;
    }

    bucket.count += 1;
}

export function clearEditorAuthFailures(request: NextRequest, operation: AuthOperation): void {
    void request;

    authFailureBuckets.delete(operation);
}

export function resetEditorAuthRateLimitForTests(): void {
    authFailureBuckets.clear();
}

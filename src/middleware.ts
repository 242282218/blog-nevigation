import { NextRequest, NextResponse } from 'next/server';
import {
    getSafeEditorNextPath,
} from '@/lib/editor-auth';

const EDITOR_AUTH_STATUS_TIMEOUT_MS = 1500;

function getEditorAuthInternalOrigin(request: NextRequest): string | null {
    const configuredOrigin = process.env.EDITOR_AUTH_INTERNAL_ORIGIN?.trim();

    if (configuredOrigin) {
        return configuredOrigin;
    }

    if (process.env.NODE_ENV !== 'production') {
        return request.nextUrl.origin;
    }

    return null;
}

async function fetchEditorAuthStatus(
    authStatusUrl: URL,
    cookieHeader: string
): Promise<unknown | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EDITOR_AUTH_STATUS_TIMEOUT_MS);

    try {
        const response = await fetch(authStatusUrl, {
            headers: {
                Cookie: cookieHeader,
            },
            signal: controller.signal,
        });

        if (!response.ok) {
            return null;
        }

        return await response.json().catch(() => null);
    } catch {
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    if (!pathname.startsWith('/editor') || pathname === '/editor/login') {
        return NextResponse.next();
    }

    const authInternalOrigin = getEditorAuthInternalOrigin(request);

    const cookieHeader = request.headers.get('cookie') ?? '';

    if (authInternalOrigin && cookieHeader) {
        const authStatusUrl = new URL('/api/editor-auth', authInternalOrigin);
        const authStatus = await fetchEditorAuthStatus(
            authStatusUrl,
            cookieHeader
        );

        if (typeof authStatus === 'object' && authStatus && 'authenticated' in authStatus) {
            if (authStatus.authenticated === true) {
                return NextResponse.next();
            }
        }
    }

    const loginUrl = new URL('/editor/login', request.url);
    loginUrl.searchParams.set('next', getSafeEditorNextPath(`${pathname}${search}`));

    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: ['/editor/:path*'],
};

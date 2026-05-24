import { NextRequest, NextResponse } from 'next/server';
import {
    EDITOR_SESSION_COOKIE,
    getSafeEditorNextPath,
    isValidEditorSession,
} from '@/lib/editor-auth';

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

export async function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    if (!pathname.startsWith('/editor') || pathname === '/editor/login') {
        return NextResponse.next();
    }

    const session = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;

    if (await isValidEditorSession(session)) {
        return NextResponse.next();
    }

    const authInternalOrigin = getEditorAuthInternalOrigin(request);

    if (authInternalOrigin) {
        const authStatusUrl = new URL('/api/editor-auth', authInternalOrigin);
        const authStatusResponse = await fetch(authStatusUrl, {
            headers: {
                Cookie: request.headers.get('cookie') ?? '',
            },
        }).catch(() => null);

        if (authStatusResponse?.ok) {
            const authStatus = await authStatusResponse.json().catch(() => null);

            if (authStatus?.authenticated === true) {
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

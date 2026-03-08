import { NextRequest, NextResponse } from 'next/server';
import {
    EDITOR_SESSION_COOKIE,
    getSafeEditorNextPath,
    isValidEditorSession,
} from '@/lib/editor-auth';

export async function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    if (!pathname.startsWith('/editor') || pathname === '/editor/login') {
        return NextResponse.next();
    }

    const session = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;

    if (await isValidEditorSession(session)) {
        return NextResponse.next();
    }

    const loginUrl = new URL('/editor/login', request.url);
    loginUrl.searchParams.set('next', getSafeEditorNextPath(`${pathname}${search}`));

    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: ['/editor/:path*'],
};

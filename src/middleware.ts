import { NextRequest, NextResponse } from 'next/server';
import {
    EDITOR_SESSION_COOKIE,
    getSafeEditorNextPath,
} from '@/lib/editor-auth';
import { getPublicRequestOrigin } from '@/lib/request-origin';

const CSP_NONCE_HEADER = 'x-nonce';

interface SecurityHeaders {
    contentSecurityPolicy: string;
    requestHeaders: Headers;
}

function normalizeCspHeader(value: string): string {
    return value.replace(/\s{2,}/g, ' ').trim();
}

function createContentSecurityPolicy(nonce: string): string {
    const scriptSrc = process.env.NODE_ENV === 'development'
        ? `'self' 'nonce-${nonce}' 'unsafe-eval'`
        : `'self' 'nonce-${nonce}'`;

    return normalizeCspHeader(`
        default-src 'self';
        script-src ${scriptSrc};
        style-src 'self' 'unsafe-inline';
        img-src 'self' data: blob: https:;
        font-src 'self' data:;
        connect-src 'self' https://cloudflareinsights.com;
        frame-ancestors 'none';
        base-uri 'self';
        form-action 'self'
    `);
}

function createSecurityHeaders(request: NextRequest): SecurityHeaders {
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
    const contentSecurityPolicy = createContentSecurityPolicy(nonce);
    const requestHeaders = new Headers(request.headers);

    requestHeaders.set(CSP_NONCE_HEADER, nonce);
    requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);

    return {
        contentSecurityPolicy,
        requestHeaders,
    };
}

function createSecurityHeadersResponse(securityHeaders: SecurityHeaders): NextResponse {
    const response = NextResponse.next({
        request: {
            headers: securityHeaders.requestHeaders,
        },
    });

    response.headers.set('Content-Security-Policy', securityHeaders.contentSecurityPolicy);

    if (process.env.NODE_ENV === 'production') {
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    return response;
}

function setSecurityHeaders(response: NextResponse, securityHeaders: SecurityHeaders): NextResponse {
    response.headers.set('Content-Security-Policy', securityHeaders.contentSecurityPolicy);

    if (process.env.NODE_ENV === 'production') {
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    return response;
}

export function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const securityHeaders = createSecurityHeaders(request);
    const response = createSecurityHeadersResponse(securityHeaders);

    if (!pathname.startsWith('/editor') || pathname === '/editor/login') {
        return response;
    }

    const sessionCookie = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;

    if (!sessionCookie) {
        const loginUrl = new URL('/editor/login', getPublicRequestOrigin(request));
        loginUrl.searchParams.set('next', getSafeEditorNextPath(`${pathname}${search}`));
        return setSecurityHeaders(NextResponse.redirect(loginUrl), securityHeaders);
    }

    return response;
}

export const config = {
    matcher: [
        {
            source: '/((?!api|_next/static|_next/image|favicon.ico|logo.svg).*)',
            missing: [
                { type: 'header', key: 'next-router-prefetch' },
                { type: 'header', key: 'purpose', value: 'prefetch' },
            ],
        },
    ],
};

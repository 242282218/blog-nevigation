export const EDITOR_SESSION_COOKIE = 'editor_session';
export const EDITOR_CSRF_COOKIE = 'editor_csrf';
export const EDITOR_CSRF_HEADER = 'x-editor-csrf-token';
export const EDITOR_SESSION_MAX_AGE = 60 * 60 * 8;
export const SESSION_NAMESPACE = 'blog-navigation-editor-session:v1';

export function getEditorAccessToken(): string | null {
    const token = process.env.EDITOR_ACCESS_TOKEN?.trim();
    return token ? token : null;
}

export function getEditorCookieOptions() {
    const forceInsecure = process.env.COOKIE_SECURE === 'false';

    if (forceInsecure && process.env.NODE_ENV === 'production') {
        console.warn('[editor-auth] COOKIE_SECURE=false in production disables the Secure cookie flag. This is insecure for HTTPS deployments.');
    }

    return {
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: !forceInsecure && process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: EDITOR_SESSION_MAX_AGE,
    };
}

export function getEditorCsrfCookieOptions() {
    const forceInsecure = process.env.COOKIE_SECURE === 'false';
    return {
        httpOnly: false,
        sameSite: 'lax' as const,
        secure: !forceInsecure && process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: EDITOR_SESSION_MAX_AGE,
    };
}

export function getSafeEditorNextPath(rawPath?: string | null): string {
    if (!rawPath) {
        return '/editor';
    }

    try {
        if (rawPath.startsWith('//')) {
            return '/editor';
        }

        const normalized = new URL(rawPath, 'http://localhost');

        if (normalized.host !== 'localhost') {
            return '/editor';
        }

        if (!normalized.pathname.startsWith('/editor')) {
            return '/editor';
        }

        return `${normalized.pathname}${normalized.search}`;
    } catch {
        return '/editor';
    }
}

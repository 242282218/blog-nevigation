export const EDITOR_SESSION_COOKIE = 'editor_session';
export const EDITOR_SESSION_MAX_AGE = 60 * 60 * 8;

const SESSION_NAMESPACE = 'blog-navigation-editor-session:v1';

function getCryptoApi(): Crypto {
    if (!globalThis.crypto) {
        throw new Error('Web Crypto API is not available in this runtime.');
    }

    return globalThis.crypto;
}

async function sha256(value: string): Promise<string> {
    const digest = await getCryptoApi().subtle.digest(
        'SHA-256',
        new TextEncoder().encode(value)
    );

    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

export function getEditorAccessToken(): string | null {
    const token = process.env.EDITOR_ACCESS_TOKEN?.trim();
    return token ? token : null;
}

export function isEditorAuthConfigured(): boolean {
    return Boolean(getEditorAccessToken());
}

export async function createEditorSessionValue(secret: string): Promise<string> {
    return sha256(`${SESSION_NAMESPACE}:${secret.trim()}`);
}

export async function isValidEditorSecret(candidate: string): Promise<boolean> {
    const configuredSecret = getEditorAccessToken();

    if (!configuredSecret || !candidate.trim()) {
        return false;
    }

    const [candidateHash, expectedHash] = await Promise.all([
        createEditorSessionValue(candidate),
        createEditorSessionValue(configuredSecret),
    ]);

    return candidateHash === expectedHash;
}

export async function isValidEditorSession(
    sessionValue: string | null | undefined
): Promise<boolean> {
    const configuredSecret = getEditorAccessToken();

    if (!configuredSecret || !sessionValue) {
        return false;
    }

    const expectedHash = await createEditorSessionValue(configuredSecret);
    return expectedHash === sessionValue;
}

export function getEditorCookieOptions() {
    return {
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: EDITOR_SESSION_MAX_AGE,
    };
}

export function getSafeEditorNextPath(rawPath?: string | null): string {
    if (!rawPath) {
        return '/editor';
    }

    try {
        const normalized = new URL(rawPath, 'http://localhost');
        const target = `${normalized.pathname}${normalized.search}`;

        if (!normalized.pathname.startsWith('/editor')) {
            return '/editor';
        }

        return target;
    } catch {
        return '/editor';
    }
}

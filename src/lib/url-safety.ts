function isLocalHttpHost(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function isSafeExternalUrl(value: string): boolean {
    try {
        const url = new URL(value.trim());

        if (url.protocol === 'https:') {
            return true;
        }

        if (process.env.NODE_ENV !== 'production' && url.protocol === 'http:') {
            return isLocalHttpHost(url.hostname);
        }

        return false;
    } catch {
        return false;
    }
}

export function normalizeSafeExternalUrl(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed && isSafeExternalUrl(trimmed) ? trimmed : null;
}

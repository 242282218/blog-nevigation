import type { NextRequest } from 'next/server';

const LOCAL_CLIENT_ID = 'local';
const UNKNOWN_CLIENT_ID = 'unknown';

export function getTrustedProxyIps(): Set<string> | null {
    const env = process.env.TRUSTED_PROXY_IPS;
    if (!env) {
        return null;
    }

    return new Set(
        env.split(',')
            .map((ip) => ip.trim())
            .filter(Boolean)
    );
}

const CLIENT_IP_HEADERS = [
    'cf-connecting-ip',
    'x-real-ip',
    'true-client-ip',
];

function normalizeClientPart(value: string | null): string | null {
    const normalized = value?.split(',')[0]?.trim();
    return normalized || null;
}

function isSkipIpValidationEnabled(): boolean {
    return process.env.SKIP_IP_VALIDATION === 'true';
}

export function isRequestClientIdReliable(): boolean {
    return (
        isSkipIpValidationEnabled() ||
        Boolean(getTrustedProxyIps()) ||
        process.env.NODE_ENV !== 'production'
    );
}

function getForwardedForParts(request: NextRequest): string[] {
    return request.headers.get('x-forwarded-for')
        ?.split(',')
        .map((part) => part.trim())
        .filter(Boolean) ?? [];
}

function getTrustedForwardedClientId(request: NextRequest, trustedProxyIps: Set<string>): string | null {
    if (trustedProxyIps.has('*')) {
        return getHeaderClientId(request);
    }

    const forwardedForParts = getForwardedForParts(request);

    if (forwardedForParts.length >= 2 && trustedProxyIps.has(forwardedForParts[forwardedForParts.length - 1])) {
        return forwardedForParts[0];
    }

    return null;
}

function getHeaderClientId(request: NextRequest): string | null {
    const forwardedForClient = normalizeClientPart(request.headers.get('x-forwarded-for'));

    if (forwardedForClient) {
        return forwardedForClient;
    }

    for (const header of CLIENT_IP_HEADERS) {
        const value = normalizeClientPart(request.headers.get(header));
        if (value) {
            return value;
        }
    }

    return null;
}

export function getRequestClientId(request: NextRequest): string {
    if (isSkipIpValidationEnabled()) {
        return getHeaderClientId(request) ?? UNKNOWN_CLIENT_ID;
    }

    const trustedProxyIps = getTrustedProxyIps();

    if (trustedProxyIps) {
        return getTrustedForwardedClientId(request, trustedProxyIps) ?? UNKNOWN_CLIENT_ID;
    }

    return process.env.NODE_ENV === 'test' ? LOCAL_CLIENT_ID : UNKNOWN_CLIENT_ID;
}

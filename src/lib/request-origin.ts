import type { NextRequest } from 'next/server';

function getFirstForwardedValue(value: string | null): string | null {
    const firstValue = value?.split(',')[0]?.trim();
    return firstValue || null;
}

function isTrustedProxyForwardingConfigured(): boolean {
    return Boolean(process.env.TRUSTED_PROXY_IPS?.trim());
}

function normalizeProtocol(value: string | null): string | null {
    if (!value) {
        return null;
    }

    const normalized = value.replace(/:$/, '').toLowerCase();
    return normalized === 'http' || normalized === 'https' ? normalized : null;
}

export function getPublicRequestOrigin(request: NextRequest): string {
    const forwardedHost = getFirstForwardedValue(request.headers.get('x-forwarded-host'));
    const forwardedProto = normalizeProtocol(getFirstForwardedValue(request.headers.get('x-forwarded-proto')));
    const trustForwardedHeaders = isTrustedProxyForwardingConfigured();
    const host = trustForwardedHeaders && forwardedHost
        ? forwardedHost
        : request.headers.get('host') ?? request.nextUrl.host;
    const protocol = trustForwardedHeaders && forwardedProto
        ? forwardedProto
        : request.nextUrl.protocol.replace(/:$/, '');

    return `${protocol}://${host}`;
}

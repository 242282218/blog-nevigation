import { getRuntimePublicSiteUrl } from '@/lib/app-runtime-config';

export function getSiteUrl(): URL {
    try {
        return new URL(getRuntimePublicSiteUrl());
    } catch {
        return new URL('http://localhost:3000');
    }
}

export function createOgImagePath(input: { title: string; description?: string }): string {
    const params = new URLSearchParams({
        title: input.title,
    });

    if (input.description?.trim()) {
        params.set('description', input.description.trim());
    }

    return `/og?${params.toString()}`;
}

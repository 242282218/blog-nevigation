const DEFAULT_SITE_URL = 'http://localhost:3000';

export function getSiteUrl(): URL {
    const rawUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
        (process.env.VERCEL_URL?.trim() ? `https://${process.env.VERCEL_URL.trim()}` : DEFAULT_SITE_URL);

    try {
        return new URL(rawUrl);
    } catch {
        return new URL(DEFAULT_SITE_URL);
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

import type { Article, ArticleRevisionNote, ArticleSourceLink } from '@/app/types/article';
import { normalizeArticleKind, normalizeArticleStatus } from '@/lib/article-metadata';

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isOptionalString(value: unknown): value is string | undefined {
    return value === undefined || typeof value === 'string';
}

function normalizeOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeOptionalBoolean(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
}

export function normalizeSlugPart(value: string): string {
    return value
        .trim()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
}

function normalizeIdSuffix(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .slice(-6) || 'entry';
}

export function createArticleSlug(article: Pick<Article, 'id' | 'title'>): string {
    const base = normalizeSlugPart(article.title) || 'article';
    return `${base}-${normalizeIdSuffix(article.id)}`;
}

export function normalizeStoredSlug(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const slug = normalizeSlugPart(value);
    return slug.length > 0 ? slug : null;
}

export function isArticle(value: unknown): value is Article {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof value.id === 'string' &&
        typeof value.title === 'string' &&
        typeof value.date === 'string' &&
        typeof value.description === 'string' &&
        isStringArray(value.tags) &&
        typeof value.content === 'string' &&
        isFiniteNumber(value.createdAt) &&
        isFiniteNumber(value.updatedAt) &&
        isOptionalString(value.slug) &&
        isOptionalString(value.kind) &&
        isOptionalString(value.status) &&
        isOptionalString(value.category) &&
        isOptionalString(value.series) &&
        isOptionalString(value.updatedDate) &&
        isOptionalString(value.templateId) &&
        (value.featured === undefined || typeof value.featured === 'boolean') &&
        (value.sourceLinks === undefined || Array.isArray(value.sourceLinks)) &&
        (value.revisionNotes === undefined || Array.isArray(value.revisionNotes))
    );
}

function normalizeSourceLinks(value: unknown): ArticleSourceLink[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((item) => {
        if (
            !isRecord(item) ||
            typeof item.title !== 'string' ||
            typeof item.url !== 'string' ||
            !item.title.trim() ||
            !item.url.trim()
        ) {
            return [];
        }

        return [{
            title: item.title.trim(),
            url: item.url.trim(),
            ...(typeof item.note === 'string' && item.note.trim() ? { note: item.note.trim() } : {}),
        }];
    });
}

function normalizeRevisionNotes(value: unknown): ArticleRevisionNote[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((item) => {
        if (
            !isRecord(item) ||
            typeof item.date !== 'string' ||
            typeof item.note !== 'string' ||
            !item.date.trim() ||
            !item.note.trim()
        ) {
            return [];
        }

        return [{
            date: item.date.trim(),
            note: item.note.trim(),
        }];
    });
}

function normalizeArticle(value: unknown): Article | null {
    if (!isArticle(value)) {
        return null;
    }

    return {
        ...value,
        slug: normalizeStoredSlug(value.slug) ?? createArticleSlug(value),
        kind: normalizeArticleKind(value.kind),
        status: normalizeArticleStatus(value.status),
        featured: normalizeOptionalBoolean(value.featured) ?? false,
        sourceLinks: normalizeSourceLinks(value.sourceLinks),
        revisionNotes: normalizeRevisionNotes(value.revisionNotes),
        ...(normalizeOptionalString(value.category) ? { category: normalizeOptionalString(value.category) } : {}),
        ...(normalizeOptionalString(value.series) ? { series: normalizeOptionalString(value.series) } : {}),
        ...(normalizeOptionalString(value.updatedDate) ? { updatedDate: normalizeOptionalString(value.updatedDate) } : {}),
        ...(normalizeOptionalString(value.templateId) ? { templateId: normalizeOptionalString(value.templateId) } : {}),
    };
}

export function filterArticlesData(value: unknown): Article[] {
    if (!Array.isArray(value)) {
        return [];
    }

    const slugs = new Set<string>();
    const articles: Article[] = [];

    for (const item of value) {
        const article = normalizeArticle(item);

        if (!article?.slug || slugs.has(article.slug)) {
            continue;
        }

        slugs.add(article.slug);
        articles.push(article);
    }

    return articles;
}

export function parseArticlesData(value: unknown): Article[] | null {
    if (!Array.isArray(value)) {
        return null;
    }

    const articles = value.map(normalizeArticle);

    if (articles.some((article) => article === null)) {
        return null;
    }

    const slugs = new Set<string>();

    for (const article of articles as Article[]) {
        if (!article.slug || slugs.has(article.slug)) {
            return null;
        }

        slugs.add(article.slug);
    }

    return articles as Article[];
}

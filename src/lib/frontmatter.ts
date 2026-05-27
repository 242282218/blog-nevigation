import matter from 'gray-matter';
import type { Frontmatter } from '@/app/types/article';
import type { ArticleRevisionNote, ArticleSourceLink } from '@/app/types/article';
import { normalizeArticleKind, normalizeArticleStatus } from '@/lib/article-metadata';
import { isRecord } from '@/lib/article-data';
import { normalizeSafeExternalUrl } from '@/lib/url-safety';

interface ParsedFrontmatterResult {
    content: string;
    frontmatter: Partial<Frontmatter>;
    hasFrontmatter: boolean;
}

function asString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function asDateString(value: unknown): string | undefined {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().split('T')[0];
    }

    return asString(value);
}

function asBoolean(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
}

export function normalizeSourceLinks(value: unknown): ArticleSourceLink[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((item) => {
        if (!isRecord(item) || typeof item.title !== 'string' || typeof item.url !== 'string') {
            return [];
        }

        const url = normalizeSafeExternalUrl(item.url);
        const title = item.title.trim();

        if (!title || !url) {
            return [];
        }

        return [{
            title,
            url,
            ...(typeof item.note === 'string' && item.note.trim() ? { note: item.note.trim() } : {}),
        }];
    });
}

export function normalizeRevisionNotes(value: unknown): ArticleRevisionNote[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((item) => {
        if (!isRecord(item) || typeof item.date !== 'string' || typeof item.note !== 'string') {
            return [];
        }

        const date = item.date.trim();
        const note = item.note.trim();

        if (!date || !note) {
            return [];
        }

        return [{
            date,
            note,
        }];
    });
}

function normalizeFrontmatterData(data: Record<string, unknown>): Partial<Frontmatter> {
    const frontmatter: Partial<Frontmatter> = {};
    const tags = asStringArray(data.tags);

    frontmatter.title = asString(data.title);
    frontmatter.slug = asString(data.slug);
    frontmatter.date = asDateString(data.date);
    frontmatter.updatedDate = asDateString(data.updatedDate);
    frontmatter.description = asString(data.description);
    frontmatter.category = asString(data.category);
    frontmatter.series = asString(data.series);
    frontmatter.featured = asBoolean(data.featured);
    frontmatter.templateId = asString(data.templateId);

    if (typeof data.kind === 'string') {
        frontmatter.kind = normalizeArticleKind(data.kind);
    }

    if (typeof data.status === 'string') {
        frontmatter.status = normalizeArticleStatus(data.status, 'draft');
    }

    if (tags) {
        frontmatter.tags = tags;
    }

    frontmatter.sourceLinks = normalizeSourceLinks(data.sourceLinks);
    frontmatter.revisionNotes = normalizeRevisionNotes(data.revisionNotes);

    return frontmatter;
}

function createOrderedFrontmatter(article: Frontmatter): Record<string, unknown> {
    return {
        title: article.title,
        ...(article.slug ? { slug: article.slug } : {}),
        date: article.date,
        ...(article.updatedDate ? { updatedDate: article.updatedDate } : {}),
        description: article.description,
        ...(article.kind ? { kind: article.kind } : {}),
        ...(article.status ? { status: article.status } : {}),
        ...(article.category ? { category: article.category } : {}),
        ...(article.series ? { series: article.series } : {}),
        ...(article.featured ? { featured: article.featured } : {}),
        tags: article.tags,
        ...(article.sourceLinks?.length ? { sourceLinks: article.sourceLinks } : {}),
        ...(article.revisionNotes?.length ? { revisionNotes: article.revisionNotes } : {}),
        ...(article.templateId ? { templateId: article.templateId } : {}),
    };
}

export function parseMarkdownWithFrontmatter(markdown: string): ParsedFrontmatterResult {
    const hasFrontmatter = /^---\r?\n/.test(markdown);
    const parsed = matter(markdown);

    return {
        content: parsed.content,
        frontmatter: normalizeFrontmatterData(parsed.data),
        hasFrontmatter,
    };
}

export function serializeMarkdownWithFrontmatter(article: Frontmatter & { content: string }): string {
    const frontmatter = createOrderedFrontmatter(article);

    return matter.stringify(article.content, frontmatter).replace(/\n*$/, '\n');
}

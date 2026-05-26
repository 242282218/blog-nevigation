import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getEditorDataRoot, readArticlesFromDisk } from '@/lib/editor-data-storage';
import type { Article, ArticleKind, ArticleRevisionNote, ArticleSourceLink, ArticleStatus } from '@/app/types/article';
import { createArticleSlug } from '@/lib/article-data';
import { isPublicArticleStatus, normalizeArticleKind, normalizeArticleStatus } from '@/lib/article-metadata';
import { countMarkdownWords } from '@/lib/article-quality';

export interface PostMeta {
    slug: string;
    slugArray: string[];
    title: string;
    date: string;
    description?: string;
    updatedDate?: string;
    tags: string[];
    kind: ArticleKind;
    status: ArticleStatus;
    category?: string;
    series?: string;
    featured: boolean;
    readingMinutes: number;
    sourceLinks: ArticleSourceLink[];
    revisionNotes: ArticleRevisionNote[];
}

const contentDir = path.join(process.cwd(), 'content', 'seeds', 'posts');

function isRuntimeArticleSourceEnabled(): boolean {
    return Boolean(getEditorDataRoot());
}

function normalizeDate(value: unknown): string {
    if (!value) {
        return '';
    }

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toISOString().split('T')[0];
}

function createRuntimeSlug(article: Article): string {
    return article.slug || createArticleSlug(article);
}

function normalizeOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
}

function normalizeSourceLinks(value: unknown): ArticleSourceLink[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((item) => {
        if (
            !item ||
            typeof item !== 'object' ||
            typeof (item as { title?: unknown }).title !== 'string' ||
            typeof (item as { url?: unknown }).url !== 'string'
        ) {
            return [];
        }

        const source = item as { title: string; url: string; note?: unknown };

        return [{
            title: source.title,
            url: source.url,
            ...(typeof source.note === 'string' ? { note: source.note } : {}),
        }];
    });
}

function normalizeRevisionNotes(value: unknown): ArticleRevisionNote[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((item) => {
        if (
            !item ||
            typeof item !== 'object' ||
            typeof (item as { date?: unknown }).date !== 'string' ||
            typeof (item as { note?: unknown }).note !== 'string'
        ) {
            return [];
        }

        const revision = item as { date: string; note: string };

        return [{ date: revision.date, note: revision.note }];
    });
}

function mapArticleToPostMeta(article: Article): PostMeta {
    const slug = createRuntimeSlug(article);

    return {
        slug,
        slugArray: [slug],
        title: article.title || 'Untitled',
        date: normalizeDate(article.date),
        description: article.description || '',
        updatedDate: normalizeDate(article.updatedDate),
        tags: article.tags,
        kind: normalizeArticleKind(article.kind),
        status: normalizeArticleStatus(article.status),
        category: normalizeOptionalString(article.category),
        series: normalizeOptionalString(article.series),
        featured: Boolean(article.featured),
        readingMinutes: Math.max(1, Math.ceil(countMarkdownWords(article.content) / 450)),
        sourceLinks: article.sourceLinks || [],
        revisionNotes: article.revisionNotes || [],
    };
}

function comparePostsByDateDescending(a: PostMeta, b: PostMeta): number {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
}

function getRuntimePosts(): PostMeta[] {
    return readArticlesFromDisk()
        .filter((article) => isPublicArticleStatus(article.status))
        .map(mapArticleToPostMeta)
        .sort(comparePostsByDateDescending);
}

let seedPostsCache: PostMeta[] | null = null;
let seedPostsCacheTime = 0;
const SEED_CACHE_TTL = 60_000;

function getSeedPosts(): PostMeta[] {
    const now = Date.now();
    if (seedPostsCache && now - seedPostsCacheTime < SEED_CACHE_TTL) {
        return seedPostsCache;
    }

    let files: string[] = [];

    if (!fs.existsSync(contentDir)) {
        return [];
    }

    function findMdFiles(dir: string) {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) {
                findMdFiles(fullPath);
            } else if (item.endsWith('.md')) {
                files.push(fullPath);
            }
        }
    }

    findMdFiles(contentDir);

    const result = files
        .map((file) => {
            const fileContent = fs.readFileSync(file, 'utf8');
            const { data, content } = matter(fileContent);
            const relativePath = path.relative(contentDir, file);
            const sluggablePath = relativePath.replace(/\\/g, '/').replace(/\.md$/, '');

            return {
                slug: sluggablePath,
                slugArray: sluggablePath.split('/'),
                title: data.title || path.basename(file, '.md'),
                date: normalizeDate(data.date),
                description: data.description || '',
                updatedDate: normalizeDate(data.updatedDate),
                tags: normalizeStringArray(data.tags),
                kind: normalizeArticleKind(data.kind),
                status: normalizeArticleStatus(data.status),
                category: normalizeOptionalString(data.category),
                series: normalizeOptionalString(data.series),
                featured: Boolean(data.featured),
                readingMinutes: Math.max(1, Math.ceil(countMarkdownWords(content) / 450)),
                sourceLinks: normalizeSourceLinks(data.sourceLinks),
                revisionNotes: normalizeRevisionNotes(data.revisionNotes),
            };
        })
        .filter((post) => isPublicArticleStatus(post.status))
        .sort(comparePostsByDateDescending);

    seedPostsCache = result;
    seedPostsCacheTime = Date.now();
    return result;
}

function getRuntimePostBySlugArray(slugArray: string[]) {
    if (slugArray.length !== 1) {
        return null;
    }

    const targetSlug = slugArray[0];
    const article = readArticlesFromDisk().find((candidate) => createRuntimeSlug(candidate) === targetSlug);

    if (!article) {
        return null;
    }

    if (!isPublicArticleStatus(article.status)) {
        return null;
    }

    return {
        meta: mapArticleToPostMeta(article),
        content: article.content,
    };
}

function getSeedPostBySlugArray(slugArray: string[]) {
    const relPath = slugArray.join('/');
    const targetPath = path.join(contentDir, relPath + '.md');
    const targetIndexPath = path.join(contentDir, relPath, 'index.md');

    const resolvedBase = path.resolve(contentDir) + path.sep;
    if (
        !path.resolve(targetPath).startsWith(resolvedBase) ||
        !path.resolve(targetIndexPath).startsWith(resolvedBase)
    ) {
        return null;
    }

    let matchedFile = '';

    if (fs.existsSync(targetPath)) {
        matchedFile = targetPath;
    } else if (fs.existsSync(targetIndexPath)) {
        matchedFile = targetIndexPath;
    }

    if (!matchedFile) {
        return null;
    }

    const fileContent = fs.readFileSync(matchedFile, 'utf8');
    const { data, content } = matter(fileContent);
    const status = normalizeArticleStatus(data.status);

    if (!isPublicArticleStatus(status)) {
        return null;
    }

    return {
        meta: {
            slug: relPath,
            slugArray,
            title: data.title || slugArray[slugArray.length - 1],
            date: normalizeDate(data.date),
            description: data.description || '',
            updatedDate: normalizeDate(data.updatedDate),
            tags: normalizeStringArray(data.tags),
            kind: normalizeArticleKind(data.kind),
            status,
            category: normalizeOptionalString(data.category),
            series: normalizeOptionalString(data.series),
            featured: Boolean(data.featured),
            readingMinutes: Math.max(1, Math.ceil(countMarkdownWords(content) / 450)),
            sourceLinks: normalizeSourceLinks(data.sourceLinks),
            revisionNotes: normalizeRevisionNotes(data.revisionNotes),
        },
        content,
    };
}

export function getPosts(): PostMeta[] {
    if (isRuntimeArticleSourceEnabled()) {
        const runtimePosts = getRuntimePosts();
        if (runtimePosts.length > 0) {
            return runtimePosts;
        }
    }
    return getSeedPosts();
}

export function getPostBySlugArray(slugArray: string[]) {
    let decoded: string[];

    try {
        decoded = slugArray.map((segment) => decodeURIComponent(segment));
    } catch {
        return null;
    }

    if (isRuntimeArticleSourceEnabled()) {
        const runtimePost = getRuntimePostBySlugArray(decoded);
        if (runtimePost) {
            return runtimePost;
        }
    }
    return getSeedPostBySlugArray(decoded);
}

export function getRelatedPosts(meta: PostMeta, limit = 4): PostMeta[] {
    return getPosts()
        .filter((post) => post.slug !== meta.slug && !post.slugArray.includes('navigation'))
        .map((post) => ({
            post,
            score: getRelatedScore(meta, post),
        }))
        .filter((item) => item.score > 0)
        .sort((first, second) => second.score - first.score || second.post.date.localeCompare(first.post.date))
        .slice(0, limit)
        .map((item) => item.post);
}

function getRelatedScore(current: PostMeta, candidate: PostMeta): number {
    let score = 0;

    if (current.series && candidate.series === current.series) {
        score += 8;
    }

    if (current.category && candidate.category === current.category) {
        score += 4;
    }

    const currentTags = new Set(current.tags);

    for (const tag of candidate.tags) {
        if (currentTags.has(tag)) {
            score += 2;
        }
    }

    if (candidate.kind === current.kind) {
        score += 1;
    }

    return score;
}

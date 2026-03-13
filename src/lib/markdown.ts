import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getEditorDataRoot, readArticlesFromDisk } from '@/lib/editor-data-storage';
import type { Article } from '@/app/types/article';

export interface PostMeta {
    slug: string;
    slugArray: string[];
    title: string;
    date: string;
    description?: string;
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
    const normalizedTitle = article.title
        .trim()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
    const base = normalizedTitle || 'article';
    const suffix = article.id
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .slice(-6) || 'entry';

    return `${base}-${suffix}`;
}

function mapArticleToPostMeta(article: Article): PostMeta {
    const slug = createRuntimeSlug(article);

    return {
        slug,
        slugArray: [slug],
        title: article.title || 'Untitled',
        date: normalizeDate(article.date),
        description: article.description || '',
    };
}

function comparePostsByDateDescending(a: PostMeta, b: PostMeta): number {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
}

function getRuntimePosts(): PostMeta[] {
    return readArticlesFromDisk()
        .map(mapArticleToPostMeta)
        .sort(comparePostsByDateDescending);
}

function getSeedPosts(): PostMeta[] {
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

    return files
        .map((file) => {
            const fileContent = fs.readFileSync(file, 'utf8');
            const { data } = matter(fileContent);
            const relativePath = path.relative(contentDir, file);
            const sluggablePath = relativePath.replace(/\\/g, '/').replace(/\.md$/, '');

            return {
                slug: sluggablePath,
                slugArray: sluggablePath.split('/'),
                title: data.title || path.basename(file, '.md'),
                date: normalizeDate(data.date),
                description: data.description || '',
            };
        })
        .sort(comparePostsByDateDescending);
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

    return {
        meta: mapArticleToPostMeta(article),
        content: article.content,
    };
}

function getSeedPostBySlugArray(slugArray: string[]) {
    const relPath = slugArray.join('/');
    const targetPath = path.join(contentDir, relPath + '.md');
    const targetIndexPath = path.join(contentDir, relPath, 'index.md');

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

    return {
        meta: {
            slug: relPath,
            slugArray,
            title: data.title || slugArray[slugArray.length - 1],
            date: normalizeDate(data.date),
            description: data.description || '',
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
    if (isRuntimeArticleSourceEnabled()) {
        const runtimePost = getRuntimePostBySlugArray(slugArray);
        if (runtimePost) {
            return runtimePost;
        }
    }
    return getSeedPostBySlugArray(slugArray);
}

import fs from 'node:fs';
import path from 'node:path';
import type { Article } from '@/app/types/article';
import type { Category } from '@/app/types/navigation';
import { parseNavigationData } from '@/lib/navigation-data';

const DEFAULT_DATA_ROOT = '/root/blog-nevigation';
const ARTICLES_FILE_NAME = 'articles.json';
const NAVIGATION_FILE_NAME = 'tools.json';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isArticle(value: unknown): value is Article {
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
        isFiniteNumber(value.updatedAt)
    );
}

function readJsonFile(filePath: string): unknown | null {
    if (!fs.existsSync(filePath)) {
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return null;
    }
}

function ensureParentDirectory(filePath: string): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJsonFile(filePath: string, value: unknown): void {
    ensureParentDirectory(filePath);
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

export function getEditorDataRoot(): string {
    const configured = process.env.BLOG_DATA_ROOT?.trim();
    return configured && configured.length > 0 ? configured : DEFAULT_DATA_ROOT;
}

export function getArticlesDataFilePath(): string {
    return path.join(getEditorDataRoot(), 'articles', ARTICLES_FILE_NAME);
}

export function getNavigationDataFilePath(): string {
    return path.join(getEditorDataRoot(), 'navigation', NAVIGATION_FILE_NAME);
}

export function getDefaultNavigationSeedFilePath(): string {
    return path.join(process.cwd(), 'content', 'posts', 'navigation', 'data', 'tools.json');
}

export function readArticlesFromDisk(): Article[] {
    const raw = readJsonFile(getArticlesDataFilePath());

    if (!Array.isArray(raw)) {
        return [];
    }

    return raw.filter(isArticle);
}

export function writeArticlesToDisk(articles: Article[]): void {
    writeJsonFile(getArticlesDataFilePath(), articles);
}

export function readNavigationFromDisk(): Category[] {
    const navigationPath = getNavigationDataFilePath();
    const raw = readJsonFile(navigationPath);
    const parsed = parseNavigationData(raw);

    if (parsed) {
        return parsed;
    }

    const seedRaw = readJsonFile(getDefaultNavigationSeedFilePath());
    const seedParsed = parseNavigationData(seedRaw);

    if (!seedParsed) {
        return [];
    }

    if (raw === null) {
        writeNavigationToDisk(seedParsed);
    }

    return seedParsed;
}

export function writeNavigationToDisk(categories: Category[]): void {
    writeJsonFile(getNavigationDataFilePath(), categories);
}

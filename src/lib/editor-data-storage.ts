import fs from 'node:fs';
import path from 'node:path';
import type { Article } from '@/app/types/article';
import type { Category } from '@/app/types/navigation';
import { parseNavigationData } from '@/lib/navigation-data';

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

function readJsonFile(filePath: string | null): unknown | null {
    if (!filePath || !fs.existsSync(filePath)) {
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

function writeJsonFile(filePath: string | null, value: unknown): void {
    if (!filePath) {
        throw new Error('BLOG_DATA_ROOT is not configured.');
    }

    ensureParentDirectory(filePath);
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

export function getEditorDataRoot(): string | null {
    const configured = process.env.BLOG_DATA_ROOT?.trim();
    return configured && configured.length > 0 ? configured : null;
}

export function getArticlesDataFilePath(): string | null {
    const root = getEditorDataRoot();
    return root ? path.join(root, 'articles', ARTICLES_FILE_NAME) : null;
}

export function getNavigationDataFilePath(): string | null {
    const root = getEditorDataRoot();
    return root ? path.join(root, 'navigation', NAVIGATION_FILE_NAME) : null;
}

export function getDefaultNavigationSeedFilePath(): string {
    return path.join(
        process.cwd(),
        'content',
        'seeds',
        'navigation',
        'data',
        'tools.json'
    );
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

    if (raw === null && navigationPath) {
        writeNavigationToDisk(seedParsed);
    }

    return seedParsed;
}

export function writeNavigationToDisk(categories: Category[]): void {
    writeJsonFile(getNavigationDataFilePath(), categories);
}

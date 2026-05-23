import fs from 'node:fs';
import path from 'node:path';
import type { Article } from '@/app/types/article';
import type { Category } from '@/app/types/navigation';
import { filterArticlesData } from '@/lib/article-data';
import { parseNavigationData } from '@/lib/navigation-data';
import {
    createDefaultSiteSettings,
    parseSiteSettings,
    type SiteSettings,
} from '@/lib/site-settings';

const ARTICLES_FILE_NAME = 'articles.json';
const NAVIGATION_FILE_NAME = 'tools.json';
const SETTINGS_FILE_NAME = 'site.json';

export class EditorDataRootNotConfiguredError extends Error {
    constructor() {
        super('BLOG_DATA_ROOT is not configured.');
        this.name = 'EditorDataRootNotConfiguredError';
    }
}

function readJsonFile(filePath: string | null): unknown | null {
    if (!filePath || !fs.existsSync(filePath)) {
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.error(`[editor-data-storage] Failed to read JSON: ${filePath}`, error);
        return null;
    }
}

function ensureParentDirectory(filePath: string): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJsonFile(filePath: string | null, value: unknown): void {
    if (!filePath) {
        throw new EditorDataRootNotConfiguredError();
    }

    ensureParentDirectory(filePath);
    const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

    try {
        fs.writeFileSync(tempFilePath, JSON.stringify(value, null, 2), 'utf8');
        fs.renameSync(tempFilePath, filePath);
    } catch (error) {
        fs.rmSync(tempFilePath, { force: true });
        throw error;
    }
}

export function getEditorDataRoot(): string | null {
    const configured = process.env.BLOG_DATA_ROOT?.trim();
    return configured && configured.length > 0 ? configured : null;
}

export function isEditorDataRootConfigured(): boolean {
    return Boolean(getEditorDataRoot());
}

export function getArticlesDataFilePath(): string | null {
    const root = getEditorDataRoot();
    return root ? path.join(root, 'articles', ARTICLES_FILE_NAME) : null;
}

export function getNavigationDataFilePath(): string | null {
    const root = getEditorDataRoot();
    return root ? path.join(root, 'navigation', NAVIGATION_FILE_NAME) : null;
}

export function getSiteSettingsDataFilePath(): string | null {
    const root = getEditorDataRoot();
    return root ? path.join(root, 'settings', SETTINGS_FILE_NAME) : null;
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

    return filterArticlesData(raw);
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

export function readSiteSettingsFromDisk(): SiteSettings {
    const parsed = parseSiteSettings(readJsonFile(getSiteSettingsDataFilePath()));

    return parsed ?? createDefaultSiteSettings();
}

export function writeSiteSettingsToDisk(settings: SiteSettings): void {
    writeJsonFile(getSiteSettingsDataFilePath(), settings);
}

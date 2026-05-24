import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { Article } from '@/app/types/article';
import type { Category } from '@/app/types/navigation';
import { parseArticlesData } from '@/lib/article-data';
import { parseNavigationData } from '@/lib/navigation-data';
import {
    createDefaultSiteSettings,
    parseSiteSettings,
    type SiteSettings,
} from '@/lib/site-settings';

const ARTICLES_FILE_NAME = 'articles.json';
const NAVIGATION_FILE_NAME = 'tools.json';
const SETTINGS_FILE_NAME = 'site.json';
const MANIFEST_FILE_NAME = 'manifest.json';
const MANIFEST_VERSION = 1;

export type EditorDataResourceName = 'articles' | 'navigation' | 'settings';
export type EditorDataFileResourceName = EditorDataResourceName | 'manifest' | 'navigation-seed';

export interface EditorDataResourceManifest {
    revision: string;
    hash: string;
    updatedAt: string;
}

export interface EditorDataManifest {
    version: typeof MANIFEST_VERSION;
    updatedAt: string;
    resources: Partial<Record<EditorDataResourceName, EditorDataResourceManifest>>;
}

export class EditorDataRootNotConfiguredError extends Error {
    constructor() {
        super('BLOG_DATA_ROOT is not configured.');
        this.name = 'EditorDataRootNotConfiguredError';
    }
}

export class EditorDataFileInvalidError extends Error {
    constructor(
        public readonly resource: EditorDataFileResourceName,
        public readonly filePath: string,
        public readonly reason: string
    ) {
        super(`Invalid editor data file for ${resource}: ${reason}`);
        this.name = 'EditorDataFileInvalidError';
    }
}

function readJsonFile(filePath: string | null, resource: EditorDataFileResourceName): unknown | null {
    if (!filePath || !fs.existsSync(filePath)) {
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.error(`[editor-data-storage] Failed to read JSON: ${filePath}`, error);
        throw new EditorDataFileInvalidError(resource, filePath, 'invalid JSON');
    }
}

function createInvalidDataFileError(
    resource: EditorDataFileResourceName,
    filePath: string,
    reason: string
): EditorDataFileInvalidError {
    return new EditorDataFileInvalidError(resource, filePath, reason);
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

function createRestoreDirectory(root: string, name: string): string {
    const directory = path.join(root, `${name}-${process.pid}-${Date.now()}`);
    fs.mkdirSync(directory, { recursive: true });
    return directory;
}

function getEditorDataFiles(root: string): string[] {
    return [
        path.join(root, 'articles', ARTICLES_FILE_NAME),
        path.join(root, 'navigation', NAVIGATION_FILE_NAME),
        path.join(root, 'settings', SETTINGS_FILE_NAME),
        path.join(root, MANIFEST_FILE_NAME),
    ];
}

function copyExistingFiles(files: string[], fromRoot: string, toRoot: string): void {
    for (const filePath of files) {
        if (!fs.existsSync(filePath)) {
            continue;
        }

        const relativePath = path.relative(fromRoot, filePath);
        const backupPath = path.join(toRoot, relativePath);
        ensureParentDirectory(backupPath);
        fs.copyFileSync(filePath, backupPath);
    }
}

function restoreFilesFromBackup(files: string[], dataRoot: string, backupRoot: string): void {
    for (const filePath of files) {
        const relativePath = path.relative(dataRoot, filePath);
        const backupPath = path.join(backupRoot, relativePath);

        if (!fs.existsSync(backupPath)) {
            fs.rmSync(filePath, { force: true });
            continue;
        }

        ensureParentDirectory(filePath);
        fs.copyFileSync(backupPath, filePath);
    }
}

function replaceFilesFromStaging(files: string[], dataRoot: string, stagingRoot: string): void {
    for (const filePath of files) {
        const relativePath = path.relative(dataRoot, filePath);
        const stagedPath = path.join(stagingRoot, relativePath);

        if (!fs.existsSync(stagedPath)) {
            throw new Error(`Staged restore file is missing: ${relativePath}`);
        }

        ensureParentDirectory(filePath);
        fs.renameSync(stagedPath, filePath);
    }
}

function hashJson(value: unknown): string {
    return createHash('sha256')
        .update(JSON.stringify(value))
        .digest('hex');
}

function createResourceManifest(value: unknown): EditorDataResourceManifest {
    const hash = hashJson(value);
    const updatedAt = new Date().toISOString();

    return {
        revision: `${Date.now().toString(36)}-${process.hrtime.bigint().toString(36)}-${hash.slice(0, 12)}`,
        hash,
        updatedAt,
    };
}

function createDerivedResourceManifest(value: unknown, hash = hashJson(value)): EditorDataResourceManifest {
    return {
        revision: `derived-${hash}`,
        hash,
        updatedAt: '1970-01-01T00:00:00.000Z',
    };
}

function createManifestForData(data: {
    articles: Article[];
    navigation: Category[];
    settings: SiteSettings;
}): EditorDataManifest {
    const articles = createResourceManifest(data.articles);
    const navigation = createResourceManifest(data.navigation);
    const settings = createResourceManifest(data.settings);

    return {
        version: MANIFEST_VERSION,
        updatedAt: settings.updatedAt,
        resources: {
            articles,
            navigation,
            settings,
        },
    };
}

function isResourceManifest(value: unknown): value is EditorDataResourceManifest {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Partial<EditorDataResourceManifest>;

    return (
        typeof candidate.revision === 'string' &&
        typeof candidate.hash === 'string' &&
        typeof candidate.updatedAt === 'string'
    );
}

function parseManifest(value: unknown): EditorDataManifest | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const candidate = value as Partial<EditorDataManifest>;

    if (candidate.version !== MANIFEST_VERSION || !candidate.resources) {
        return null;
    }

    const resources: EditorDataManifest['resources'] = {};

    for (const resource of ['articles', 'navigation', 'settings'] as const) {
        const manifest = candidate.resources[resource];

        if (isResourceManifest(manifest)) {
            resources[resource] = manifest;
        }
    }

    return {
        version: MANIFEST_VERSION,
        updatedAt: typeof candidate.updatedAt === 'string'
            ? candidate.updatedAt
            : new Date().toISOString(),
        resources,
    };
}

export function parseEditorDataManifest(value: unknown): EditorDataManifest | null {
    return parseManifest(value);
}

function createEmptyManifest(): EditorDataManifest {
    return {
        version: MANIFEST_VERSION,
        updatedAt: new Date().toISOString(),
        resources: {},
    };
}

function getManifestProblems(
    data: {
        articles: Article[];
        navigation: Category[];
        settings: SiteSettings;
    },
    manifest: EditorDataManifest | null
): string[] {
    const problems: string[] = [];

    if (!manifest || manifest.version !== MANIFEST_VERSION) {
        return ['manifest.json is missing or invalid.'];
    }

    const resources = {
        articles: data.articles,
        navigation: data.navigation,
        settings: data.settings,
    };

    for (const resource of ['articles', 'navigation', 'settings'] as const) {
        const resourceManifest = manifest.resources[resource];

        if (!resourceManifest) {
            problems.push(`${resource} manifest is missing.`);
            continue;
        }

        if (resourceManifest.hash !== hashJson(resources[resource])) {
            problems.push(`${resource} hash does not match manifest.`);
        }
    }

    return problems;
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

export function getEditorDataManifestFilePath(): string | null {
    const root = getEditorDataRoot();
    return root ? path.join(root, MANIFEST_FILE_NAME) : null;
}

export function readEditorDataManifest(): EditorDataManifest {
    const manifestPath = getEditorDataManifestFilePath();
    const raw = readJsonFile(manifestPath, 'manifest');

    if (raw === null) {
        return createEmptyManifest();
    }

    const manifest = parseManifest(raw);

    if (!manifest && manifestPath) {
        throw createInvalidDataFileError('manifest', manifestPath, 'invalid manifest structure');
    }

    return manifest ?? createEmptyManifest();
}

export function writeEditorDataManifest(manifest: EditorDataManifest): void {
    writeJsonFile(getEditorDataManifestFilePath(), manifest);
}

export function touchEditorDataResourceManifest(
    resource: EditorDataResourceName,
    value: unknown
): EditorDataResourceManifest {
    const manifest = readEditorDataManifest();
    const resourceManifest = createResourceManifest(value);
    const nextManifest: EditorDataManifest = {
        version: MANIFEST_VERSION,
        updatedAt: resourceManifest.updatedAt,
        resources: {
            ...manifest.resources,
            [resource]: resourceManifest,
        },
    };

    writeEditorDataManifest(nextManifest);
    return resourceManifest;
}

export function getEditorDataResourceManifest(
    resource: EditorDataResourceName,
    value: unknown
): EditorDataResourceManifest | null {
    if (!isEditorDataRootConfigured()) {
        return null;
    }

    const manifest = readEditorDataManifest();
    const resourceManifest = manifest.resources[resource];
    const currentHash = hashJson(value);

    if (resourceManifest?.hash === currentHash) {
        return resourceManifest;
    }

    return createDerivedResourceManifest(value, currentHash);
}

export function createEditorDataManifestSnapshot(data: {
    articles: Article[];
    navigation: Category[];
    settings: SiteSettings;
}): EditorDataManifest {
    const articles = getEditorDataResourceManifest('articles', data.articles);
    const navigation = getEditorDataResourceManifest('navigation', data.navigation);
    const settings = getEditorDataResourceManifest('settings', data.settings);
    const updatedAts = [articles?.updatedAt, navigation?.updatedAt, settings?.updatedAt]
        .filter((value): value is string => typeof value === 'string')
        .sort();
    const updatedAt = updatedAts.length > 0
        ? updatedAts[updatedAts.length - 1]
        : new Date().toISOString();

    return {
        version: MANIFEST_VERSION,
        updatedAt,
        resources: {
            ...(articles ? { articles } : {}),
            ...(navigation ? { navigation } : {}),
            ...(settings ? { settings } : {}),
        },
    };
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
    const articlesPath = getArticlesDataFilePath();
    const raw = readJsonFile(articlesPath, 'articles');

    if (raw === null) {
        return [];
    }

    const articles = parseArticlesData(raw);

    if (!articles && articlesPath) {
        throw createInvalidDataFileError('articles', articlesPath, 'invalid articles structure');
    }

    return articles ?? [];
}

export function writeArticlesToDisk(articles: Article[]): EditorDataResourceManifest {
    writeJsonFile(getArticlesDataFilePath(), articles);
    return touchEditorDataResourceManifest('articles', articles);
}

export function readNavigationFromDisk(): Category[] {
    const navigationPath = getNavigationDataFilePath();
    const raw = readJsonFile(navigationPath, 'navigation');
    const parsed = parseNavigationData(raw);

    if (parsed) {
        return parsed;
    }

    if (raw !== null && navigationPath) {
        throw createInvalidDataFileError('navigation', navigationPath, 'invalid navigation structure');
    }

    const seedPath = getDefaultNavigationSeedFilePath();
    const seedRaw = readJsonFile(seedPath, 'navigation-seed');
    const seedParsed = parseNavigationData(seedRaw);

    if (!seedParsed) {
        if (seedRaw !== null) {
            throw createInvalidDataFileError('navigation-seed', seedPath, 'invalid navigation seed structure');
        }

        return [];
    }

    return seedParsed;
}

export function writeNavigationToDisk(categories: Category[]): EditorDataResourceManifest {
    writeJsonFile(getNavigationDataFilePath(), categories);
    return touchEditorDataResourceManifest('navigation', categories);
}

export function readSiteSettingsFromDisk(): SiteSettings {
    const settingsPath = getSiteSettingsDataFilePath();
    const raw = readJsonFile(settingsPath, 'settings');

    if (raw === null) {
        return createDefaultSiteSettings();
    }

    const parsed = parseSiteSettings(raw);

    if (!parsed && settingsPath) {
        throw createInvalidDataFileError('settings', settingsPath, 'invalid site settings structure');
    }

    return parsed ?? createDefaultSiteSettings();
}

export function writeSiteSettingsToDisk(settings: SiteSettings): EditorDataResourceManifest {
    writeJsonFile(getSiteSettingsDataFilePath(), settings);
    return touchEditorDataResourceManifest('settings', settings);
}

export function restoreEditorDataRootAtomically(data: {
    articles: Article[];
    navigation: Category[];
    settings: SiteSettings;
}): EditorDataManifest {
    const root = getEditorDataRoot();

    if (!root) {
        throw new EditorDataRootNotConfiguredError();
    }

    const stagingRoot = createRestoreDirectory(root, '.restore-staging');
    const backupRoot = createRestoreDirectory(root, '.restore-backup');
    const files = getEditorDataFiles(root);
    const manifest = createManifestForData(data);
    let backupCaptured = false;

    try {
        writeJsonFile(path.join(stagingRoot, 'articles', ARTICLES_FILE_NAME), data.articles);
        writeJsonFile(path.join(stagingRoot, 'navigation', NAVIGATION_FILE_NAME), data.navigation);
        writeJsonFile(path.join(stagingRoot, 'settings', SETTINGS_FILE_NAME), data.settings);
        writeJsonFile(path.join(stagingRoot, MANIFEST_FILE_NAME), manifest);

        const stagedArticles = parseArticlesData(readJsonFile(path.join(stagingRoot, 'articles', ARTICLES_FILE_NAME), 'articles'));
        const stagedNavigation = parseNavigationData(readJsonFile(path.join(stagingRoot, 'navigation', NAVIGATION_FILE_NAME), 'navigation'));
        const stagedSettings = parseSiteSettings(readJsonFile(path.join(stagingRoot, 'settings', SETTINGS_FILE_NAME), 'settings'));
        const stagedManifest = parseManifest(readJsonFile(path.join(stagingRoot, MANIFEST_FILE_NAME), 'manifest'));

        if (!stagedArticles || stagedArticles.length !== data.articles.length || !stagedNavigation || !stagedSettings) {
            throw new Error('Staged restore verification failed.');
        }

        const problems = getManifestProblems(
            {
                articles: stagedArticles,
                navigation: stagedNavigation,
                settings: stagedSettings,
            },
            stagedManifest
        );

        if (problems.length > 0) {
            throw new Error(`Staged restore verification failed: ${problems.join('; ')}`);
        }

        copyExistingFiles(files, root, backupRoot);
        backupCaptured = true;
        replaceFilesFromStaging(files, root, stagingRoot);

        return manifest;
    } catch (error) {
        if (backupCaptured) {
            restoreFilesFromBackup(files, root, backupRoot);
        }

        throw error;
    } finally {
        fs.rmSync(stagingRoot, { recursive: true, force: true });
        fs.rmSync(backupRoot, { recursive: true, force: true });
    }
}

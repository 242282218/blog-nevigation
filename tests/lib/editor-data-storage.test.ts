import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
    EditorDataFileInvalidError,
    EditorDataRootNotConfiguredError,
    getDefaultNavigationSeedFilePath,
    getEditorDataRoot,
    getEditorDataResourceManifest,
    isEditorDataRootConfigured,
    readArticlesFromDisk,
    readEditorDataManifest,
    readNavigationFromDisk,
    readSiteSettingsFromDisk,
    writeArticlesToDisk,
} from '@/lib/editor-data-storage';
import { DEFAULT_SITE_SETTINGS } from '@/lib/site-settings';

const ORIGINAL_BLOG_DATA_ROOT = process.env.BLOG_DATA_ROOT;
const tempDirectories: string[] = [];

function createTempDataRoot(): string {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-navigation-storage-'));
    tempDirectories.push(tempRoot);
    process.env.BLOG_DATA_ROOT = tempRoot;
    return tempRoot;
}

function writeText(filePath: string, value: string): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, value, 'utf8');
}

afterEach(() => {
    if (ORIGINAL_BLOG_DATA_ROOT === undefined) {
        delete process.env.BLOG_DATA_ROOT;
    } else {
        process.env.BLOG_DATA_ROOT = ORIGINAL_BLOG_DATA_ROOT;
    }

    while (tempDirectories.length > 0) {
        fs.rmSync(tempDirectories.pop() as string, { recursive: true, force: true });
    }
});

describe('editor data storage configuration', () => {
    it('does not bind to an external absolute directory when BLOG_DATA_ROOT is missing', () => {
        delete process.env.BLOG_DATA_ROOT;

        expect(getEditorDataRoot()).toBeNull();
        expect(isEditorDataRootConfigured()).toBe(false);
    });

    it('keeps committed navigation seed data under content/seeds', () => {
        expect(getDefaultNavigationSeedFilePath()).toContain('content');
        expect(getDefaultNavigationSeedFilePath()).toContain('seeds');
        expect(getDefaultNavigationSeedFilePath()).toContain('navigation');
    });

    it('fails writes explicitly when BLOG_DATA_ROOT is missing', () => {
        delete process.env.BLOG_DATA_ROOT;

        expect(() => writeArticlesToDisk([])).toThrow(EditorDataRootNotConfiguredError);
    });

    it('falls back to default site settings when runtime settings are missing', () => {
        delete process.env.BLOG_DATA_ROOT;

        expect(readSiteSettingsFromDisk()).toEqual(DEFAULT_SITE_SETTINGS);
    });

    it('creates and updates a manifest when runtime data is written', () => {
        createTempDataRoot();

        const firstManifest = writeArticlesToDisk([]);
        const manifestAfterWrite = readEditorDataManifest();
        const secondManifest = writeArticlesToDisk([]);

        expect(firstManifest.revision).toBe(manifestAfterWrite.resources.articles?.revision);
        expect(secondManifest.revision).not.toBe(firstManifest.revision);
    });

    it('derives a stable revision for existing data without writing a manifest during reads', () => {
        const tempRoot = createTempDataRoot();
        const articles: unknown[] = [];

        writeText(path.join(tempRoot, 'articles', 'articles.json'), JSON.stringify(articles));

        const manifest = getEditorDataResourceManifest('articles', articles);

        expect(manifest?.revision).toMatch(/^derived-/);
        expect(fs.existsSync(path.join(tempRoot, 'manifest.json'))).toBe(false);
    });

    it('rejects corrupt runtime article JSON instead of returning empty data', () => {
        const tempRoot = createTempDataRoot();
        const articlesPath = path.join(tempRoot, 'articles', 'articles.json');

        writeText(articlesPath, '{');

        expect(() => readArticlesFromDisk()).toThrow(EditorDataFileInvalidError);
        expect(fs.readFileSync(articlesPath, 'utf8')).toBe('{');
    });

    it('rejects invalid runtime settings instead of falling back to defaults', () => {
        const tempRoot = createTempDataRoot();

        writeText(path.join(tempRoot, 'settings', 'site.json'), JSON.stringify({ siteName: '' }));

        expect(() => readSiteSettingsFromDisk()).toThrow(EditorDataFileInvalidError);
    });

    it('does not write navigation seed data back during reads', () => {
        const tempRoot = createTempDataRoot();
        const navigationPath = path.join(tempRoot, 'navigation', 'tools.json');

        expect(readNavigationFromDisk().length).toBeGreaterThan(0);
        expect(fs.existsSync(navigationPath)).toBe(false);
    });
});

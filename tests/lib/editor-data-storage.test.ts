import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
    EditorDataRootNotConfiguredError,
    getDefaultNavigationSeedFilePath,
    getEditorDataRoot,
    isEditorDataRootConfigured,
    readEditorDataManifest,
    readSiteSettingsFromDisk,
    writeArticlesToDisk,
} from '@/lib/editor-data-storage';
import { DEFAULT_SITE_SETTINGS } from '@/lib/site-settings';

const ORIGINAL_BLOG_DATA_ROOT = process.env.BLOG_DATA_ROOT;
const tempDirectories: string[] = [];

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
        const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-navigation-manifest-'));
        tempDirectories.push(tempRoot);
        process.env.BLOG_DATA_ROOT = tempRoot;

        const firstManifest = writeArticlesToDisk([]);
        const manifestAfterWrite = readEditorDataManifest();
        const secondManifest = writeArticlesToDisk([]);

        expect(firstManifest.revision).toBe(manifestAfterWrite.resources.articles?.revision);
        expect(secondManifest.revision).not.toBe(firstManifest.revision);
    });
});

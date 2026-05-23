import { afterEach, describe, expect, it } from 'vitest';
import {
    EditorDataRootNotConfiguredError,
    getDefaultNavigationSeedFilePath,
    getEditorDataRoot,
    isEditorDataRootConfigured,
    readSiteSettingsFromDisk,
    writeArticlesToDisk,
} from '@/lib/editor-data-storage';
import { DEFAULT_SITE_SETTINGS } from '@/lib/site-settings';

const ORIGINAL_BLOG_DATA_ROOT = process.env.BLOG_DATA_ROOT;

afterEach(() => {
    if (ORIGINAL_BLOG_DATA_ROOT === undefined) {
        delete process.env.BLOG_DATA_ROOT;
        return;
    }

    process.env.BLOG_DATA_ROOT = ORIGINAL_BLOG_DATA_ROOT;
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
});

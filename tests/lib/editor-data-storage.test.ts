import { afterEach, describe, expect, it } from 'vitest';
import {
    getDefaultNavigationSeedFilePath,
    getEditorDataRoot,
} from '@/lib/editor-data-storage';

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
    });

    it('keeps committed navigation seed data under content/seeds', () => {
        expect(getDefaultNavigationSeedFilePath()).toContain('content');
        expect(getDefaultNavigationSeedFilePath()).toContain('seeds');
        expect(getDefaultNavigationSeedFilePath()).toContain('navigation');
    });
});

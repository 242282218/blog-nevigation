import { describe, expect, it } from 'vitest';
import {
    DEFAULT_SITE_SETTINGS,
    parseSiteSettings,
} from '@/lib/site-settings';

describe('site settings parser', () => {
    it('accepts complete settings and trims string values', () => {
        expect(
            parseSiteSettings({
                ...DEFAULT_SITE_SETTINGS,
                siteName: '  My Site  ',
            })
        ).toEqual({
            ...DEFAULT_SITE_SETTINGS,
            siteName: 'My Site',
        });
    });

    it('rejects missing or blank required values', () => {
        expect(parseSiteSettings({ ...DEFAULT_SITE_SETTINGS, siteName: '' })).toBeNull();
        expect(parseSiteSettings({ ...DEFAULT_SITE_SETTINGS, heroDescription: undefined })).toBeNull();
    });
});

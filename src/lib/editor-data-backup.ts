import type { Article } from '@/app/types/article';
import type { Category } from '@/app/types/navigation';
import { isRecord, parseArticlesData } from '@/lib/article-data';
import {
    getEditorDataRoot,
    isEditorDataRootConfigured,
    readEditorDataManifest,
    readArticlesFromDisk,
    readNavigationFromDisk,
    readSiteSettingsFromDisk,
    type EditorDataManifest,
    writeArticlesToDisk,
    writeNavigationToDisk,
    writeSiteSettingsToDisk,
} from '@/lib/editor-data-storage';
import { parseNavigationData } from '@/lib/navigation-data';
import {
    createDefaultSiteSettings,
    parseSiteSettings,
    type SiteSettings,
} from '@/lib/site-settings';

export const EDITOR_BACKUP_VERSION = 1;

export type EditorBackupSource = 'local' | 'r2';

export interface EditorBackupData {
    articles: Article[];
    navigation: Category[];
    settings: SiteSettings;
}

export interface EditorBackupPayload {
    version: typeof EDITOR_BACKUP_VERSION;
    exportedAt: string;
    source: EditorBackupSource;
    persistent: boolean;
    dataRoot: string | null;
    manifest?: EditorDataManifest;
    data: EditorBackupData;
}

export interface RestoreBackupResult {
    articles: number;
    categories: number;
    settings: boolean;
}

export function createEditorBackupPayload(
    data: EditorBackupData,
    source: EditorBackupSource = 'local'
): EditorBackupPayload {
    return {
        version: EDITOR_BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        source,
        persistent: isEditorDataRootConfigured(),
        dataRoot: getEditorDataRoot(),
        manifest: isEditorDataRootConfigured() ? readEditorDataManifest() : undefined,
        data,
    };
}
export function createCurrentEditorBackupPayload(): EditorBackupPayload {
    return createEditorBackupPayload({
        articles: readArticlesFromDisk(),
        navigation: readNavigationFromDisk(),
        settings: readSiteSettingsFromDisk(),
    });
}

export function parseEditorBackupData(value: unknown): EditorBackupData | null {
    if (!isRecord(value)) {
        return null;
    }

    const source = isRecord(value.data) ? value.data : value;
    const articles = parseArticlesData(source.articles);
    const navigation = parseNavigationData(source.navigation);
    const settings = parseSiteSettings(source.settings) ?? createDefaultSiteSettings();

    if (!articles || !navigation) {
        return null;
    }

    return {
        articles,
        navigation,
        settings,
    };
}

export function restoreEditorBackupPayload(value: unknown): RestoreBackupResult | null {
    const data = parseEditorBackupData(value);

    if (!data) {
        return null;
    }

    writeArticlesToDisk(data.articles);
    writeNavigationToDisk(data.navigation);
    writeSiteSettingsToDisk(data.settings);

    return {
        articles: data.articles.length,
        categories: data.navigation.length,
        settings: true,
    };
}

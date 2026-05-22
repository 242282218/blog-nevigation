import type { Article } from '@/app/types/article';
import type { Category } from '@/app/types/navigation';
import {
    getEditorDataRoot,
    isArticle,
    isEditorDataRootConfigured,
    readArticlesFromDisk,
    readNavigationFromDisk,
    writeArticlesToDisk,
    writeNavigationToDisk,
} from '@/lib/editor-data-storage';
import { parseNavigationData } from '@/lib/navigation-data';

export const EDITOR_BACKUP_VERSION = 1;

export type EditorBackupSource = 'local' | 'r2';

export interface EditorBackupData {
    articles: Article[];
    navigation: Category[];
}

export interface EditorBackupPayload {
    version: typeof EDITOR_BACKUP_VERSION;
    exportedAt: string;
    source: EditorBackupSource;
    persistent: boolean;
    dataRoot: string | null;
    data: EditorBackupData;
}

export interface RestoreBackupResult {
    articles: number;
    categories: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function parseArticles(value: unknown): Article[] | null {
    if (!Array.isArray(value) || !value.every(isArticle)) {
        return null;
    }

    return value;
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
        data,
    };
}
export function createCurrentEditorBackupPayload(): EditorBackupPayload {
    return createEditorBackupPayload({
        articles: readArticlesFromDisk(),
        navigation: readNavigationFromDisk(),
    });
}

export function parseEditorBackupData(value: unknown): EditorBackupData | null {
    if (!isRecord(value)) {
        return null;
    }

    const source = isRecord(value.data) ? value.data : value;
    const articles = parseArticles(source.articles);
    const navigation = parseNavigationData(source.navigation);

    if (!articles || !navigation) {
        return null;
    }

    return {
        articles,
        navigation,
    };
}

export function restoreEditorBackupPayload(value: unknown): RestoreBackupResult | null {
    const data = parseEditorBackupData(value);

    if (!data) {
        return null;
    }

    writeArticlesToDisk(data.articles);
    writeNavigationToDisk(data.navigation);

    return {
        articles: data.articles.length,
        categories: data.navigation.length,
    };
}

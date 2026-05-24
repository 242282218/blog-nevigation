import type { Article } from '@/app/types/article';
import type { Category } from '@/app/types/navigation';
import { isRecord, parseArticlesData } from '@/lib/article-data';
import {
    createEditorDataManifestSnapshot,
    getEditorDataRoot,
    isEditorDataRootConfigured,
    readArticlesFromDisk,
    readNavigationFromDisk,
    readSiteSettingsFromDisk,
    restoreEditorDataRootAtomically,
    type EditorDataManifest,
    type EditorDataResourceName,
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

interface RestoreBackupOptions {
    currentManifest?: EditorDataManifest;
}

export class EditorBackupRestoreConflictError extends Error {
    constructor(public readonly currentManifest: EditorDataManifest) {
        super('Current editor data manifest does not match the restore precondition.');
        this.name = 'EditorBackupRestoreConflictError';
    }
}

function readCurrentEditorBackupData(): EditorBackupData {
    return {
        articles: readArticlesFromDisk(),
        navigation: readNavigationFromDisk(),
        settings: readSiteSettingsFromDisk(),
    };
}

function isSameResourceManifest(
    expected: EditorDataManifest['resources'][EditorDataResourceName],
    current: EditorDataManifest['resources'][EditorDataResourceName]
): boolean {
    return Boolean(
        expected &&
        current &&
        expected.revision === current.revision &&
        expected.hash === current.hash
    );
}

function isSameManifestSnapshot(expected: EditorDataManifest, current: EditorDataManifest): boolean {
    if (expected.version !== current.version) {
        return false;
    }

    for (const resource of ['articles', 'navigation', 'settings'] as const) {
        if (!isSameResourceManifest(expected.resources[resource], current.resources[resource])) {
            return false;
        }
    }

    return true;
}

function assertCurrentManifestForRestore(expected: EditorDataManifest): void {
    const currentManifest = createEditorDataManifestSnapshot(readCurrentEditorBackupData());

    if (!isSameManifestSnapshot(expected, currentManifest)) {
        throw new EditorBackupRestoreConflictError(currentManifest);
    }
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
        manifest: isEditorDataRootConfigured() ? createEditorDataManifestSnapshot(data) : undefined,
        data,
    };
}
export function createCurrentEditorBackupPayload(): EditorBackupPayload {
    return createEditorBackupPayload(readCurrentEditorBackupData());
}

export function parseEditorBackupData(value: unknown): EditorBackupData | null {
    if (!isRecord(value)) {
        return null;
    }

    const source = isRecord(value.data) ? value.data : value;
    const articles = parseArticlesData(source.articles);
    const navigation = parseNavigationData(source.navigation);
    const settings =
        source.settings === undefined
            ? createDefaultSiteSettings()
            : parseSiteSettings(source.settings);

    if (!articles || !navigation || !settings) {
        return null;
    }

    return {
        articles,
        navigation,
        settings,
    };
}

export function restoreEditorBackupPayload(
    value: unknown,
    options: RestoreBackupOptions = {}
): RestoreBackupResult | null {
    const data = parseEditorBackupData(value);

    if (!data) {
        return null;
    }

    if (options.currentManifest) {
        assertCurrentManifestForRestore(options.currentManifest);
    }

    restoreEditorDataRootAtomically(data);

    return {
        articles: data.articles.length,
        categories: data.navigation.length,
        settings: true,
    };
}

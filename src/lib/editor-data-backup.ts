import type { Article } from '@/app/types/article';
import type { Category } from '@/app/types/navigation';
import { createHash } from 'node:crypto';
import { isRecord, parseArticlesData } from '@/lib/article-data';
import {
    createEditorDataManifestSnapshot,
    EDITOR_DATA_SCHEMA_VERSION,
    getEditorDataRoot,
    readArticlesFromDisk,
    readNavigationFromDisk,
    readSiteSettingsFromDisk,
    restoreEditorDataRootAtomically,
    withEditorDataRootLock,
    type EditorDataManifest,
    type EditorDataResourceName,
} from '@/lib/editor-data-storage';
import { parseNavigationData } from '@/lib/navigation-data';
import {
    createDefaultSiteSettings,
    parseSiteSettings,
    type SiteSettings,
} from '@/lib/site-settings';
import {
    parseEditorMediaManifest,
    readEditorMediaManifest,
    writeRestoredEditorMediaManifest,
    type EditorMediaManifest,
} from '@/lib/editor-media-storage';

export const EDITOR_BACKUP_VERSION = 1;

export type EditorBackupSource = 'local' | 'r2';

export interface EditorBackupData {
    articles: Article[];
    navigation: Category[];
    settings: SiteSettings;
    media?: EditorMediaManifest;
}

export interface EditorBackupPayload {
    version: typeof EDITOR_BACKUP_VERSION;
    schemaVersion?: typeof EDITOR_DATA_SCHEMA_VERSION;
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
    media: number;
}

interface RestoreBackupOptions {
    currentManifest?: EditorDataManifest;
}

export type EditorDataManifestSnapshotReference = {
    manifest: EditorDataManifest;
    manifestHash: string;
};

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
        media: readEditorMediaManifest(),
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

function stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }

    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map((key) => {
            const record = value as Record<string, unknown>;

            return `${JSON.stringify(key)}:${stableStringify(record[key])}`;
        }).join(',')}}`;
    }

    return JSON.stringify(value);
}

export function createEditorDataManifestHash(manifest: EditorDataManifest): string {
    const resourceHashes = {
        articles: manifest.resources.articles?.hash ?? null,
        navigation: manifest.resources.navigation?.hash ?? null,
        settings: manifest.resources.settings?.hash ?? null,
    };

    return createHash('sha256')
        .update(stableStringify({
            version: manifest.version,
            resources: resourceHashes,
        }))
        .digest('hex');
}

export function createCurrentEditorManifestSnapshotReference(data?: EditorBackupData): EditorDataManifestSnapshotReference {
    const manifest = createEditorDataManifestSnapshot(data ?? readCurrentEditorBackupData());

    return {
        manifest,
        manifestHash: createEditorDataManifestHash(manifest),
    };
}

export function isSameEditorManifestSnapshot(expected: EditorDataManifest, current: EditorDataManifest): boolean {
    return isSameManifestSnapshot(expected, current);
}

function assertCurrentManifestForRestore(expected: EditorDataManifest): void {
    const currentManifest = createEditorDataManifestSnapshot(readCurrentEditorBackupData());

    if (!isSameManifestSnapshot(expected, currentManifest)) {
        throw new EditorBackupRestoreConflictError(currentManifest);
    }
}

export function assertEditorBackupRestoreCurrentManifest(expected: EditorDataManifest): void {
    return assertCurrentManifestForRestore(expected);
}

export function createEditorBackupPayload(
    data: EditorBackupData,
    source: EditorBackupSource = 'local'
): EditorBackupPayload {
    return {
        version: EDITOR_BACKUP_VERSION,
        schemaVersion: EDITOR_DATA_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        source,
        persistent: true,
        dataRoot: getEditorDataRoot(),
        manifest: createEditorDataManifestSnapshot(data),
        data,
    };
}
export async function createCurrentEditorBackupPayload(): Promise<EditorBackupPayload> {
    return withEditorDataRootLock(() => createEditorBackupPayload(readCurrentEditorBackupData()));
}

export function parseEditorBackupData(value: unknown): EditorBackupData | null {
    if (!isRecord(value)) {
        return null;
    }

    if (
        value.schemaVersion !== undefined &&
        value.schemaVersion !== EDITOR_DATA_SCHEMA_VERSION
    ) {
        return null;
    }

    const source = isRecord(value.data) ? value.data : value;
    const articles = parseArticlesData(source.articles);
    const navigation = parseNavigationData(source.navigation);
    const settings =
        source.settings === undefined
            ? createDefaultSiteSettings()
            : parseSiteSettings(source.settings);
    const media = source.media === undefined
        ? undefined
        : parseEditorMediaManifest(source.media);

    if (!articles || !navigation || !settings || (source.media !== undefined && !media)) {
        return null;
    }

    return {
        articles,
        navigation,
        settings,
        ...(media ? { media } : {}),
    };
}

export async function restoreEditorBackupPayload(
    value: unknown,
    options: RestoreBackupOptions = {}
): Promise<RestoreBackupResult | null> {
    const data = parseEditorBackupData(value);

    if (!data) {
        return null;
    }

    return withEditorDataRootLock(async () => {
        if (options.currentManifest) {
            assertCurrentManifestForRestore(options.currentManifest);
        }

        await restoreEditorDataRootAtomically(data);

        if (data.media) {
            writeRestoredEditorMediaManifest(data.media);
        }

        return {
            articles: data.articles.length,
            categories: data.navigation.length,
            settings: true,
            media: data.media?.assets.length ?? 0,
        };
    });
}

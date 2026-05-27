import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
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
import { resetEditorRuntimeCaches } from '@/lib/editor-runtime-cache';

const ARTICLES_FILE_NAME = 'articles.json';
const NAVIGATION_FILE_NAME = 'tools.json';
const SETTINGS_FILE_NAME = 'site.json';
const MANIFEST_FILE_NAME = 'manifest.json';
const MANIFEST_VERSION = 1;
const DATA_LOCK_DIRECTORY_NAME = '.data-write.lock';
const DATA_LOCK_HEARTBEAT_FILE_NAME = 'heartbeat.json';
const DATA_LOCK_WAIT_TIMEOUT_MS = 5000;
const DATA_LOCK_STALE_MS = 5 * 60 * 1000;
const DATA_LOCK_HEARTBEAT_MS = 30 * 1000;
const DATA_LOCK_RETRY_MS = 50;
const DATA_CACHE_TTL_MS = 2_000;
const RESTORE_STATE_FILE_NAME = '.restore-state.json';
const RESTORE_STATE_VERSION = 1;

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

export type EditorDataResourceWriteResult<T> =
    | {
        success: true;
        resourceManifest: EditorDataResourceManifest;
    }
    | {
        success: false;
        currentValue: T;
        currentManifest: EditorDataResourceManifest | null;
    };

export class EditorDataRootNotConfiguredError extends Error {
    constructor() {
        super('BLOG_DATA_ROOT is not configured.');
        this.name = 'EditorDataRootNotConfiguredError';
    }
}

export class EditorDataLockTimeoutError extends Error {
    constructor(public readonly lockPath: string) {
        super('Timed out while waiting for the editor data write lock.');
        this.name = 'EditorDataLockTimeoutError';
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

export class EditorDataRestoreIncompleteError extends Error {
    constructor(public readonly statePath: string) {
        super('Editor data restore is incomplete and must be recovered before reads can continue.');
        this.name = 'EditorDataRestoreIncompleteError';
    }
}

const heldEditorDataLocks = new Map<string, number>();
const editorDataCache = new Map<string, {
    expiresAt: number;
    mtimeMs: number;
    size: number;
    value: unknown;
}>();

type EditorDataRootLock = {
    directory: string;
    token: string;
    heartbeatTimer: ReturnType<typeof setInterval> | null;
};

type EditorDataLockSnapshot = {
    mtimeMs: number;
    owner: string | null;
};

type EditorDataRestoreState = {
    version: typeof RESTORE_STATE_VERSION;
    phase: 'replacing' | 'committed';
    stagingDirectory: string;
    backupDirectory: string;
    files: string[];
    updatedAt: string;
};

async function sleep(milliseconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function sleepSync(milliseconds: number): void {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function getEditorDataRootOrThrow(): string {
    const root = getEditorDataRoot();

    if (!root) {
        throw new EditorDataRootNotConfiguredError();
    }

    return root;
}

function getLockDirectory(root: string): string {
    return path.join(root, DATA_LOCK_DIRECTORY_NAME);
}

function getLockHeartbeatPath(lockDirectory: string): string {
    return path.join(lockDirectory, DATA_LOCK_HEARTBEAT_FILE_NAME);
}

function readLockOwner(lockDirectory: string): string | null {
    try {
        return fs.readFileSync(path.join(lockDirectory, 'owner.json'), 'utf8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return null;
        }

        throw error;
    }
}

function getLockOwnerToken(lockDirectory: string): string | null {
    const owner = readLockOwner(lockDirectory);

    if (!owner) {
        return null;
    }

    try {
        const parsed = JSON.parse(owner) as { token?: unknown };

        return typeof parsed.token === 'string' ? parsed.token : null;
    } catch {
        return null;
    }
}

function readLockSnapshot(lockDirectory: string): EditorDataLockSnapshot | null {
    try {
        const stats = fs.statSync(
            fs.existsSync(getLockHeartbeatPath(lockDirectory))
                ? getLockHeartbeatPath(lockDirectory)
                : lockDirectory
        );

        return {
            mtimeMs: stats.mtimeMs,
            owner: readLockOwner(lockDirectory),
        };
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return null;
        }

        throw error;
    }
}

function isLockStale(snapshot: EditorDataLockSnapshot): boolean {
    return Date.now() - snapshot.mtimeMs > DATA_LOCK_STALE_MS;
}

function isSameLockSnapshot(
    first: EditorDataLockSnapshot,
    second: EditorDataLockSnapshot
): boolean {
    return first.mtimeMs === second.mtimeMs && first.owner === second.owner;
}

function removeStaleLockIfUnchanged(
    lockDirectory: string,
    staleSnapshot: EditorDataLockSnapshot
): boolean {
    const currentSnapshot = readLockSnapshot(lockDirectory);

    if (!currentSnapshot) {
        return true;
    }

    if (!isSameLockSnapshot(staleSnapshot, currentSnapshot)) {
        return false;
    }

    fs.rmSync(lockDirectory, { recursive: true, force: true });
    return true;
}

function writeLockHeartbeat(lock: Pick<EditorDataRootLock, 'directory' | 'token'>): void {
    if (getLockOwnerToken(lock.directory) !== lock.token) {
        return;
    }

    fs.writeFileSync(
        getLockHeartbeatPath(lock.directory),
        JSON.stringify({
            token: lock.token,
            pid: process.pid,
            heartbeatAt: new Date().toISOString(),
        }, null, 2),
        'utf8'
    );
}

function startLockHeartbeat(lock: Pick<EditorDataRootLock, 'directory' | 'token'>): ReturnType<typeof setInterval> {
    writeLockHeartbeat(lock);
    const heartbeatTimer = setInterval(() => {
        try {
            writeLockHeartbeat(lock);
        } catch (error) {
            console.error('[editor-data-storage] Failed to refresh data write lock heartbeat:', error);
        }
    }, DATA_LOCK_HEARTBEAT_MS);

    heartbeatTimer.unref?.();
    return heartbeatTimer;
}

const DATA_LOCK_SYNC_WAIT_TIMEOUT_MS = 500;

function tryAcquireLockCore(lockDirectory: string, token: string): EditorDataRootLock | null {
    try {
        fs.mkdirSync(lockDirectory);

        try {
            fs.writeFileSync(
                path.join(lockDirectory, 'owner.json'),
                JSON.stringify({
                    token,
                    pid: process.pid,
                    acquiredAt: new Date().toISOString(),
                }, null, 2),
                'utf8'
            );
        } catch (error) {
            fs.rmSync(lockDirectory, { recursive: true, force: true });
            throw error;
        }

        const lock = {
            directory: lockDirectory,
            token,
        };

        return {
            directory: lockDirectory,
            token,
            heartbeatTimer: startLockHeartbeat(lock),
        };
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
            throw error;
        }

        const snapshot = readLockSnapshot(lockDirectory);

        if (!snapshot) {
            return null;
        }

        if (isLockStale(snapshot) && removeStaleLockIfUnchanged(lockDirectory, snapshot)) {
            return null;
        }

        return null;
    }
}

async function acquireEditorDataRootLock(root: string): Promise<EditorDataRootLock> {
    const resolvedRoot = path.resolve(root);
    const lockDirectory = getLockDirectory(resolvedRoot);
    const deadline = Date.now() + DATA_LOCK_WAIT_TIMEOUT_MS;
    const token = `${process.pid}-${Date.now()}-${process.hrtime.bigint().toString(36)}`;

    fs.mkdirSync(resolvedRoot, { recursive: true });

    while (true) {
        const lock = tryAcquireLockCore(lockDirectory, token);

        if (lock) {
            return lock;
        }

        if (Date.now() >= deadline) {
            throw new EditorDataLockTimeoutError(lockDirectory);
        }

        await sleep(DATA_LOCK_RETRY_MS);
    }
}

function acquireEditorDataRootLockSync(root: string): EditorDataRootLock {
    const resolvedRoot = path.resolve(root);
    const lockDirectory = getLockDirectory(resolvedRoot);
    const deadline = Date.now() + DATA_LOCK_SYNC_WAIT_TIMEOUT_MS;
    const token = `${process.pid}-${Date.now()}-${process.hrtime.bigint().toString(36)}`;

    fs.mkdirSync(resolvedRoot, { recursive: true });

    while (true) {
        const lock = tryAcquireLockCore(lockDirectory, token);

        if (lock) {
            return lock;
        }

        if (Date.now() >= deadline) {
            throw new EditorDataLockTimeoutError(lockDirectory);
        }

        sleepSync(DATA_LOCK_RETRY_MS);
    }
}

function releaseEditorDataRootLock(lock: EditorDataRootLock): void {
    if (lock.heartbeatTimer) {
        clearInterval(lock.heartbeatTimer);
    }

    if (getLockOwnerToken(lock.directory) !== lock.token) {
        return;
    }

    fs.rmSync(lock.directory, { recursive: true, force: true });
}

export async function withEditorDataRootLock<T>(operation: () => T | Promise<T>): Promise<T> {
    const root = getEditorDataRootOrThrow();
    const resolvedRoot = path.resolve(root);
    const heldCount = heldEditorDataLocks.get(resolvedRoot) ?? 0;

    if (heldCount > 0) {
        heldEditorDataLocks.set(resolvedRoot, heldCount + 1);

        try {
            return await operation();
        } finally {
            const nextHeldCount = (heldEditorDataLocks.get(resolvedRoot) ?? 1) - 1;

            if (nextHeldCount <= 0) {
                heldEditorDataLocks.delete(resolvedRoot);
            } else {
                heldEditorDataLocks.set(resolvedRoot, nextHeldCount);
            }
        }
    }

    const lock = await acquireEditorDataRootLock(resolvedRoot);
    heldEditorDataLocks.set(resolvedRoot, 1);

    try {
        recoverIncompleteRestore(resolvedRoot);
        return await operation();
    } finally {
        heldEditorDataLocks.delete(resolvedRoot);
        releaseEditorDataRootLock(lock);
    }
}

function getCachedJsonFile(filePath: string | null, stats: fs.Stats): unknown | undefined {
    if (!filePath) {
        return undefined;
    }

    const cached = editorDataCache.get(filePath);

    if (!cached) {
        return undefined;
    }

    if (
        cached.expiresAt <= Date.now() ||
        cached.mtimeMs !== stats.mtimeMs ||
        cached.size !== stats.size
    ) {
        editorDataCache.delete(filePath);
        return undefined;
    }

    return cached.value;
}

function setCachedJsonFile(filePath: string | null, value: unknown): void {
    if (!filePath) {
        return;
    }

    const stats = fs.statSync(filePath);
    setCachedJsonFileWithStats(filePath, value, stats);
}

function setCachedJsonFileWithStats(filePath: string | null, value: unknown, stats: fs.Stats): void {
    if (!filePath) {
        return;
    }

    editorDataCache.set(filePath, {
        expiresAt: Date.now() + DATA_CACHE_TTL_MS,
        mtimeMs: stats.mtimeMs,
        size: stats.size,
        value,
    });
}

function invalidateJsonFileCache(filePath: string | null): void {
    if (filePath) {
        editorDataCache.delete(filePath);
    }
}

function clearEditorDataCache(): void {
    editorDataCache.clear();
    resetEditorRuntimeCaches();
}

function getRestoreStateFilePath(root: string): string {
    return path.join(root, RESTORE_STATE_FILE_NAME);
}

function getEditorDataRootForReadRecovery(filePath: string | null): string | null {
    if (!filePath) {
        return null;
    }

    const root = getEditorDataRoot();

    if (!root) {
        return null;
    }

    const resolvedRoot = path.resolve(root);
    const resolvedFilePath = path.resolve(filePath);

    if (
        resolvedFilePath !== resolvedRoot &&
        !resolvedFilePath.startsWith(resolvedRoot + path.sep)
    ) {
        return null;
    }

    return resolvedRoot;
}

async function recoverIncompleteRestoreForRead(root: string): Promise<void> {
    const heldCount = heldEditorDataLocks.get(root) ?? 0;

    if (heldCount > 0) {
        recoverIncompleteRestore(root);
        return;
    }

    const lock = await acquireEditorDataRootLock(root);
    heldEditorDataLocks.set(root, 1);

    try {
        recoverIncompleteRestore(root);
    } finally {
        heldEditorDataLocks.delete(root);
        releaseEditorDataRootLock(lock);
    }
}

function recoverIncompleteRestoreForReadSync(filePath: string | null): void {
    const root = getEditorDataRootForReadRecovery(filePath);

    if (!root) {
        return;
    }

    const restoreStatePath = getRestoreStateFilePath(root);

    if (fs.existsSync(restoreStatePath)) {
        const heldCount = heldEditorDataLocks.get(root) ?? 0;

        if (heldCount > 0) {
            try {
                recoverIncompleteRestore(root);
            } catch (error) {
                console.error('[editor-data-storage] Failed to recover incomplete restore before read:', error);
                throw new EditorDataRestoreIncompleteError(restoreStatePath);
            }
            return;
        }

        const lock = acquireEditorDataRootLockSync(root);
        heldEditorDataLocks.set(root, 1);

        try {
            recoverIncompleteRestore(root);
        } catch (error) {
            console.error('[editor-data-storage] Failed to recover incomplete restore before read:', error);
            throw new EditorDataRestoreIncompleteError(restoreStatePath);
        } finally {
            heldEditorDataLocks.delete(root);
            releaseEditorDataRootLock(lock);
        }
    }
}

async function recoverIncompleteRestoreForReadAsync(filePath: string | null): Promise<void> {
    const root = getEditorDataRootForReadRecovery(filePath);
    if (!root) {
        return;
    }

    try {
        const restoreStatePath = getRestoreStateFilePath(root);
        await fsPromises.access(restoreStatePath);

        try {
            await recoverIncompleteRestoreForRead(root);
        } catch (error) {
            console.error('[editor-data-storage] Failed to recover incomplete restore before read:', error);
            throw new EditorDataRestoreIncompleteError(restoreStatePath);
        }
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return;
        }

        throw error;
    }
}

function readJsonFile(filePath: string | null, resource: EditorDataFileResourceName): unknown | null {
    recoverIncompleteRestoreForReadSync(filePath);

    if (!filePath || !fs.existsSync(filePath)) {
        return null;
    }

    const stats = fs.statSync(filePath);
    const cached = getCachedJsonFile(filePath, stats);

    if (cached !== undefined) {
        return cached;
    }

    try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        setCachedJsonFile(filePath, parsed);
        return parsed;
    } catch (error) {
        console.error(`[editor-data-storage] Failed to read JSON: ${filePath}`, error);
        throw new EditorDataFileInvalidError(resource, filePath, 'invalid JSON');
    }
}

async function readJsonFileAsync(filePath: string | null, resource: EditorDataFileResourceName): Promise<unknown | null> {
    await recoverIncompleteRestoreForReadAsync(filePath);

    if (!filePath) {
        return null;
    }

    let stats: fs.Stats;

    try {
        stats = await fsPromises.stat(filePath);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return null;
        }

        throw error;
    }

    const cached = getCachedJsonFile(filePath, stats);

    if (cached !== undefined) {
        return cached;
    }

    try {
        const parsed = JSON.parse(await fsPromises.readFile(filePath, 'utf8'));
        setCachedJsonFileWithStats(filePath, parsed, stats);
        return parsed;
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

function fsyncFile(filePath: string): void {
    const fileDescriptor = fs.openSync(filePath, 'r+');

    try {
        fs.fsyncSync(fileDescriptor);
    } finally {
        fs.closeSync(fileDescriptor);
    }
}

function fsyncDirectory(directoryPath: string): void {
    try {
        const fileDescriptor = fs.openSync(directoryPath, 'r');

        try {
            fs.fsyncSync(fileDescriptor);
        } finally {
            fs.closeSync(fileDescriptor);
        }
    } catch (error) {
        if (process.platform !== 'win32') {
            throw error;
        }
    }
}

function writeJsonFile(filePath: string | null, value: unknown): void {
    if (!filePath) {
        throw new EditorDataRootNotConfiguredError();
    }

    ensureParentDirectory(filePath);
    const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

    try {
        fs.writeFileSync(tempFilePath, JSON.stringify(value, null, 2), 'utf8');
        fsyncFile(tempFilePath);
        fs.renameSync(tempFilePath, filePath);
        fsyncDirectory(path.dirname(filePath));
        setCachedJsonFile(filePath, value);
        resetEditorRuntimeCaches();
    } catch (error) {
        fs.rmSync(tempFilePath, { force: true });
        invalidateJsonFileCache(filePath);
        throw error;
    }
}

function createRestoreDirectory(root: string, name: string): string {
    const directory = path.join(root, `${name}-${process.pid}-${Date.now()}`);
    fs.mkdirSync(directory, { recursive: true });
    return directory;
}

function parseRestoreState(value: unknown): EditorDataRestoreState | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const candidate = value as Partial<EditorDataRestoreState>;

    if (
        candidate.version !== RESTORE_STATE_VERSION ||
        (candidate.phase !== 'replacing' && candidate.phase !== 'committed') ||
        typeof candidate.stagingDirectory !== 'string' ||
        typeof candidate.backupDirectory !== 'string' ||
        !Array.isArray(candidate.files) ||
        candidate.files.some((filePath) => typeof filePath !== 'string') ||
        typeof candidate.updatedAt !== 'string'
    ) {
        return null;
    }

    return {
        version: RESTORE_STATE_VERSION,
        phase: candidate.phase,
        stagingDirectory: candidate.stagingDirectory,
        backupDirectory: candidate.backupDirectory,
        files: candidate.files as string[],
        updatedAt: candidate.updatedAt,
    };
}

function readRestoreState(root: string): EditorDataRestoreState | null {
    const statePath = getRestoreStateFilePath(root);

    if (!fs.existsSync(statePath)) {
        return null;
    }

    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return parseRestoreState(parsed);
}

function writeRestoreState(root: string, state: EditorDataRestoreState): void {
    const statePath = getRestoreStateFilePath(root);
    ensureParentDirectory(statePath);

    const tempFilePath = `${statePath}.${process.pid}.${Date.now()}.tmp`;

    try {
        fs.writeFileSync(tempFilePath, JSON.stringify(state, null, 2), 'utf8');
        fsyncFile(tempFilePath);
        fs.renameSync(tempFilePath, statePath);
        fsyncDirectory(root);
    } catch (error) {
        fs.rmSync(tempFilePath, { force: true });
        throw error;
    }
}

function removeRestoreState(root: string): void {
    const statePath = getRestoreStateFilePath(root);
    fs.rmSync(statePath, { force: true });
    fsyncDirectory(root);
}

function recoverIncompleteRestore(root: string): void {
    const state = readRestoreState(root);

    if (!state) {
        if (fs.existsSync(getRestoreStateFilePath(root))) {
            throw new EditorDataRestoreIncompleteError(getRestoreStateFilePath(root));
        }

        return;
    }

    if (state.phase === 'replacing') {
        restoreFilesFromBackup(state.files, root, state.backupDirectory);
    }

    fs.rmSync(state.stagingDirectory, { recursive: true, force: true });
    fs.rmSync(state.backupDirectory, { recursive: true, force: true });
    removeRestoreState(root);
    clearEditorDataCache();
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

function stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
    }

    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);

    return `{${entries.join(',')}}`;
}

function hashJson(value: unknown): string {
    return createHash('sha256')
        .update(stableStringify(value))
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

export async function readArticlesFromDiskAsync(): Promise<Article[]> {
    const articlesPath = getArticlesDataFilePath();
    const raw = await readJsonFileAsync(articlesPath, 'articles');

    if (raw === null) {
        return [];
    }

    const articles = parseArticlesData(raw);

    if (!articles && articlesPath) {
        throw createInvalidDataFileError('articles', articlesPath, 'invalid articles structure');
    }

    return articles ?? [];
}

export async function writeArticlesToDisk(articles: Article[]): Promise<EditorDataResourceManifest> {
    return withEditorDataRootLock(() => {
        writeJsonFile(getArticlesDataFilePath(), articles);
        return touchEditorDataResourceManifest('articles', articles);
    });
}

export async function writeArticlesToDiskIfRevisionMatches(
    articles: Article[],
    expectedRevision: string | null
): Promise<EditorDataResourceWriteResult<Article[]>> {
    return withEditorDataRootLock(() => {
        const currentValue = readArticlesFromDisk();
        const currentManifest = getEditorDataResourceManifest('articles', currentValue);

        if (!expectedRevision || currentManifest?.revision !== expectedRevision) {
            return {
                success: false,
                currentValue,
                currentManifest,
            };
        }

        writeJsonFile(getArticlesDataFilePath(), articles);

        return {
            success: true,
            resourceManifest: touchEditorDataResourceManifest('articles', articles),
        };
    });
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

export async function readNavigationFromDiskAsync(): Promise<Category[]> {
    const navigationPath = getNavigationDataFilePath();
    const raw = await readJsonFileAsync(navigationPath, 'navigation');
    const parsed = parseNavigationData(raw);

    if (parsed) {
        return parsed;
    }

    if (raw !== null && navigationPath) {
        throw createInvalidDataFileError('navigation', navigationPath, 'invalid navigation structure');
    }

    const seedPath = getDefaultNavigationSeedFilePath();
    const seedRaw = await readJsonFileAsync(seedPath, 'navigation-seed');
    const seedParsed = parseNavigationData(seedRaw);

    if (!seedParsed) {
        if (seedRaw !== null) {
            throw createInvalidDataFileError('navigation-seed', seedPath, 'invalid navigation seed structure');
        }

        return [];
    }

    return seedParsed;
}

export async function writeNavigationToDisk(categories: Category[]): Promise<EditorDataResourceManifest> {
    return withEditorDataRootLock(() => {
        writeJsonFile(getNavigationDataFilePath(), categories);
        return touchEditorDataResourceManifest('navigation', categories);
    });
}

export async function writeNavigationToDiskIfRevisionMatches(
    categories: Category[],
    expectedRevision: string | null
): Promise<EditorDataResourceWriteResult<Category[]>> {
    return withEditorDataRootLock(() => {
        const currentValue = readNavigationFromDisk();
        const currentManifest = getEditorDataResourceManifest('navigation', currentValue);

        if (!expectedRevision || currentManifest?.revision !== expectedRevision) {
            return {
                success: false,
                currentValue,
                currentManifest,
            };
        }

        writeJsonFile(getNavigationDataFilePath(), categories);

        return {
            success: true,
            resourceManifest: touchEditorDataResourceManifest('navigation', categories),
        };
    });
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

export async function readSiteSettingsFromDiskAsync(): Promise<SiteSettings> {
    const settingsPath = getSiteSettingsDataFilePath();
    const raw = await readJsonFileAsync(settingsPath, 'settings');

    if (raw === null) {
        return createDefaultSiteSettings();
    }

    const parsed = parseSiteSettings(raw);

    if (!parsed && settingsPath) {
        throw createInvalidDataFileError('settings', settingsPath, 'invalid site settings structure');
    }

    return parsed ?? createDefaultSiteSettings();
}

export async function writeSiteSettingsToDisk(settings: SiteSettings): Promise<EditorDataResourceManifest> {
    return withEditorDataRootLock(() => {
        writeJsonFile(getSiteSettingsDataFilePath(), settings);
        return touchEditorDataResourceManifest('settings', settings);
    });
}

export async function writeSiteSettingsToDiskIfRevisionMatches(
    settings: SiteSettings,
    expectedRevision: string | null
): Promise<EditorDataResourceWriteResult<SiteSettings>> {
    return withEditorDataRootLock(() => {
        const currentValue = readSiteSettingsFromDisk();
        const currentManifest = getEditorDataResourceManifest('settings', currentValue);

        if (!expectedRevision || currentManifest?.revision !== expectedRevision) {
            return {
                success: false,
                currentValue,
                currentManifest,
            };
        }

        writeJsonFile(getSiteSettingsDataFilePath(), settings);

        return {
            success: true,
            resourceManifest: touchEditorDataResourceManifest('settings', settings),
        };
    });
}

export async function restoreEditorDataRootAtomically(data: {
    articles: Article[];
    navigation: Category[];
    settings: SiteSettings;
}): Promise<EditorDataManifest> {
    return withEditorDataRootLock(() => {
        const root = getEditorDataRootOrThrow();
        const stagingRoot = createRestoreDirectory(root, '.restore-staging');
        const backupRoot = createRestoreDirectory(root, '.restore-backup');
        const files = getEditorDataFiles(root);
        const manifest = createManifestForData(data);
        let backupCaptured = false;
        let restoreStateCreated = false;
        let restoreStateResolved = false;
        let restoreCommitted = false;

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
            writeRestoreState(root, {
                version: RESTORE_STATE_VERSION,
                phase: 'replacing',
                stagingDirectory: stagingRoot,
                backupDirectory: backupRoot,
                files,
                updatedAt: new Date().toISOString(),
            });
            restoreStateCreated = true;
            replaceFilesFromStaging(files, root, stagingRoot);
            writeRestoreState(root, {
                version: RESTORE_STATE_VERSION,
                phase: 'committed',
                stagingDirectory: stagingRoot,
                backupDirectory: backupRoot,
                files,
                updatedAt: new Date().toISOString(),
            });
            restoreCommitted = true;
            restoreStateResolved = true;
            clearEditorDataCache();

            return manifest;
        } catch (error) {
            if (backupCaptured && !restoreCommitted) {
                restoreFilesFromBackup(files, root, backupRoot);
                restoreStateResolved = true;
            }

            throw error;
        } finally {
            if (!restoreStateCreated || restoreStateResolved) {
                fs.rmSync(stagingRoot, { recursive: true, force: true });
                fs.rmSync(backupRoot, { recursive: true, force: true });
                removeRestoreState(root);
            }
        }
    });
}

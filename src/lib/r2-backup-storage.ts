import {
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
    S3ServiceException,
} from '@aws-sdk/client-s3';
import fs from 'node:fs';
import path from 'node:path';
import type { EditorBackupPayload } from '@/lib/editor-data-backup';

const DEFAULT_R2_PREFIX = 'blog-navigation';
const LATEST_BACKUP_FILE_NAME = 'backup.json';
const R2_SETTINGS_FILE_NAME = 'cloudflare-r2.json';

export interface R2BackupConfig {
    bucket: string;
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
    prefix: string;
    snapshotOnWrite: boolean;
}

export interface R2BackupStatus {
    enabled: boolean;
    configured: boolean;
    bucket: string | null;
    prefix: string;
    endpoint: string | null;
    snapshotOnWrite: boolean;
    hasAccessKeyId: boolean;
    hasSecretAccessKey: boolean;
    source: 'file' | 'env' | 'default';
    message: string | null;
}

export interface EditableR2BackupSettings {
    enabled: boolean;
    accountId: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    prefix: string;
    endpoint: string;
    snapshotOnWrite: boolean;
}

export interface SafeR2BackupSettings extends Omit<EditableR2BackupSettings, 'secretAccessKey'> {
    hasSecretAccessKey: boolean;
}

export interface R2UploadResult {
    latestKey: string;
    snapshotKey: string | null;
}

export class R2BackupNotConfiguredError extends Error {
    constructor(message = 'Cloudflare R2 backup is not configured.') {
        super(message);
        this.name = 'R2BackupNotConfiguredError';
    }
}

export class R2BackupSettingsInvalidError extends Error {
    constructor(public readonly filePath: string) {
        super('Stored Cloudflare R2 settings are invalid.');
        this.name = 'R2BackupSettingsInvalidError';
    }
}

function getEnv(name: string): string {
    return process.env[name]?.trim() ?? '';
}

function getR2SettingsFilePath(): string | null {
    const root = process.env.BLOG_DATA_ROOT?.trim();

    return root ? path.join(root, 'settings', R2_SETTINGS_FILE_NAME) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseStoredR2BackupSettings(value: unknown, filePath: string): EditableR2BackupSettings {
    if (!isRecord(value)) {
        throw new R2BackupSettingsInvalidError(filePath);
    }

    if (
        typeof value.enabled !== 'boolean' ||
        typeof value.accountId !== 'string' ||
        typeof value.bucket !== 'string' ||
        typeof value.accessKeyId !== 'string' ||
        typeof value.secretAccessKey !== 'string' ||
        typeof value.prefix !== 'string' ||
        typeof value.endpoint !== 'string' ||
        typeof value.snapshotOnWrite !== 'boolean'
    ) {
        throw new R2BackupSettingsInvalidError(filePath);
    }

    return {
        enabled: value.enabled,
        accountId: value.accountId.trim(),
        bucket: value.bucket.trim(),
        accessKeyId: value.accessKeyId.trim(),
        secretAccessKey: value.secretAccessKey.trim(),
        prefix: value.prefix.trim() || DEFAULT_R2_PREFIX,
        endpoint: value.endpoint.trim(),
        snapshotOnWrite: value.snapshotOnWrite,
    };
}

function readStoredR2BackupSettings(): EditableR2BackupSettings | null {
    const filePath = getR2SettingsFilePath();

    if (!filePath || !fs.existsSync(filePath)) {
        return null;
    }

    try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;

        return parseStoredR2BackupSettings(parsed, filePath);
    } catch (error) {
        if (error instanceof R2BackupSettingsInvalidError) {
            throw error;
        }

        console.error('[r2-backup-storage] Failed to read stored R2 settings:', error);
        throw new R2BackupSettingsInvalidError(filePath);
    }
}

function writeJsonAtomically(filePath: string, value: unknown): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

    try {
        fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
        protectSecretFile(tempPath);
        fs.renameSync(tempPath, filePath);
        protectSecretFile(filePath);
    } catch (error) {
        fs.rmSync(tempPath, { force: true });
        throw error;
    }
}

function protectSecretFile(filePath: string): void {
    try {
        fs.chmodSync(filePath, 0o600);
    } catch (error) {
        console.warn('[r2-backup-storage] Failed to tighten R2 settings file permissions:', error);
    }
}

function normalizePrefix(value: string): string {
    return value
        .trim()
        .replace(/^\/+|\/+$/g, '')
        .replace(/\/+/g, '/') || DEFAULT_R2_PREFIX;
}

function joinR2Key(...parts: string[]): string {
    return parts
        .map((part) => part.trim().replace(/^\/+|\/+$/g, ''))
        .filter(Boolean)
        .join('/');
}

function createR2Endpoint(accountId: string): string {
    return `https://${accountId}.r2.cloudflarestorage.com`;
}

export function getEditableR2BackupSettings(): SafeR2BackupSettings {
    const stored = readStoredR2BackupSettings();

    if (stored) {
        return {
            enabled: stored.enabled,
            accountId: stored.accountId,
            bucket: stored.bucket,
            accessKeyId: stored.accessKeyId,
            hasSecretAccessKey: Boolean(stored.secretAccessKey),
            prefix: normalizePrefix(stored.prefix || DEFAULT_R2_PREFIX),
            endpoint: stored.endpoint,
            snapshotOnWrite: stored.snapshotOnWrite,
        };
    }

    const enabled = getEnv('R2_BACKUP_ENABLED') === 'true';
    const accountId = getEnv('R2_ACCOUNT_ID');
    const endpoint = getEnv('R2_ENDPOINT');
    const secretAccessKey = getEnv('R2_SECRET_ACCESS_KEY');

    return {
        enabled,
        accountId,
        bucket: getEnv('R2_BUCKET'),
        accessKeyId: getEnv('R2_ACCESS_KEY_ID'),
        hasSecretAccessKey: Boolean(secretAccessKey),
        prefix: normalizePrefix(getEnv('R2_PREFIX') || DEFAULT_R2_PREFIX),
        endpoint,
        snapshotOnWrite: getEnv('R2_SNAPSHOT_ON_WRITE') === 'true',
    };
}

export function saveEditableR2BackupSettings(input: EditableR2BackupSettings): SafeR2BackupSettings {
    const filePath = getR2SettingsFilePath();

    if (!filePath) {
        throw new Error('BLOG_DATA_ROOT is not configured.');
    }

    let existing: EditableR2BackupSettings | null = null;

    try {
        existing = readStoredR2BackupSettings();
    } catch (error) {
        const canReplaceInvalidSettings = (
            error instanceof R2BackupSettingsInvalidError &&
            (!input.enabled || input.secretAccessKey.trim().length > 0)
        );

        if (!canReplaceInvalidSettings) {
            throw error;
        }
    }

    const trimmedSecretAccessKey = input.secretAccessKey.trim();
    const nextSettings: EditableR2BackupSettings = {
        enabled: input.enabled,
        accountId: input.accountId.trim(),
        bucket: input.bucket.trim(),
        accessKeyId: input.accessKeyId.trim(),
        secretAccessKey: trimmedSecretAccessKey || existing?.secretAccessKey || (input.enabled ? getEnv('R2_SECRET_ACCESS_KEY') : ''),
        prefix: normalizePrefix(input.prefix || DEFAULT_R2_PREFIX),
        endpoint: input.endpoint.trim(),
        snapshotOnWrite: input.snapshotOnWrite,
    };

    if (
        nextSettings.enabled &&
        (!nextSettings.accountId || !nextSettings.bucket || !nextSettings.accessKeyId || !nextSettings.secretAccessKey)
    ) {
        throw new Error('启用 R2 备份时必须填写 Account ID、Bucket、Access Key ID 和 Secret Access Key。');
    }

    writeJsonAtomically(filePath, nextSettings);

    return getEditableR2BackupSettings();
}

export function getR2BackupConfig(): R2BackupConfig | null {
    const stored = readStoredR2BackupSettings();
    const enabled = stored ? stored.enabled : getEnv('R2_BACKUP_ENABLED') === 'true';

    if (!enabled) {
        return null;
    }

    const accountId = stored ? stored.accountId : getEnv('R2_ACCOUNT_ID');
    const bucket = stored ? stored.bucket : getEnv('R2_BUCKET');
    const accessKeyId = stored ? stored.accessKeyId : getEnv('R2_ACCESS_KEY_ID');
    const secretAccessKey = stored ? stored.secretAccessKey : getEnv('R2_SECRET_ACCESS_KEY');
    const endpoint = (stored ? stored.endpoint : getEnv('R2_ENDPOINT')) || (accountId ? createR2Endpoint(accountId) : '');

    if (!accountId || !bucket || !accessKeyId || !secretAccessKey || !endpoint) {
        return null;
    }

    return {
        bucket,
        endpoint,
        accessKeyId,
        secretAccessKey,
        prefix: normalizePrefix(stored ? stored.prefix : getEnv('R2_PREFIX') || DEFAULT_R2_PREFIX),
        snapshotOnWrite: stored
            ? Boolean(stored.snapshotOnWrite)
            : getEnv('R2_SNAPSHOT_ON_WRITE') === 'true',
    };
}

export function getR2BackupStatus(): R2BackupStatus {
    const stored = readStoredR2BackupSettings();
    const enabled = stored ? stored.enabled : getEnv('R2_BACKUP_ENABLED') === 'true';
    const config = getR2BackupConfig();
    const settings = getEditableR2BackupSettings();

    return {
        enabled,
        configured: Boolean(config),
        bucket: config?.bucket ?? (settings.bucket || null),
        prefix: config?.prefix ?? settings.prefix,
        endpoint: config?.endpoint ?? (settings.endpoint || null),
        snapshotOnWrite: settings.snapshotOnWrite,
        hasAccessKeyId: Boolean(settings.accessKeyId),
        hasSecretAccessKey: settings.hasSecretAccessKey,
        source: stored ? 'file' : (enabled || settings.bucket || settings.accountId ? 'env' : 'default'),
        message: enabled && !config ? 'R2 backup is enabled but required variables are missing.' : null,
    };
}

function createR2Client(config: R2BackupConfig): S3Client {
    return new S3Client({
        region: 'auto',
        endpoint: config.endpoint,
        forcePathStyle: true,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
    });
}

function createLatestBackupKey(config: R2BackupConfig): string {
    return joinR2Key(config.prefix, 'latest', LATEST_BACKUP_FILE_NAME);
}

function sanitizeReason(reason: string): string {
    return reason
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'backup';
}

function createSnapshotBackupKey(config: R2BackupConfig, payload: EditorBackupPayload, reason: string): string {
    const exportedAt = new Date(payload.exportedAt);
    const safeDate = Number.isNaN(exportedAt.getTime()) ? new Date() : exportedAt;
    const year = String(safeDate.getUTCFullYear());
    const month = String(safeDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(safeDate.getUTCDate()).padStart(2, '0');
    const timestamp = safeDate.toISOString().replace(/[:.]/g, '-');

    return joinR2Key(
        config.prefix,
        'snapshots',
        year,
        month,
        day,
        `${timestamp}-${sanitizeReason(reason)}.json`
    );
}

async function bodyToString(body: unknown): Promise<string> {
    if (!body) {
        return '';
    }

    if (typeof body === 'string') {
        return body;
    }

    if (body instanceof Uint8Array) {
        return Buffer.from(body).toString('utf8');
    }

    if (typeof body === 'object' && 'transformToString' in body) {
        return (body as { transformToString: () => Promise<string> }).transformToString();
    }

    if (Symbol.asyncIterator in Object(body)) {
        const chunks: Buffer[] = [];

        for await (const chunk of body as AsyncIterable<Buffer | Uint8Array | string>) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }

        return Buffer.concat(chunks).toString('utf8');
    }

    return String(body);
}

export async function uploadBackupPayloadToR2(
    payload: EditorBackupPayload,
    options: {
        reason: string;
        writeSnapshot: boolean;
    }
): Promise<R2UploadResult> {
    const config = getR2BackupConfig();

    if (!config) {
        throw new R2BackupNotConfiguredError();
    }

    const client = createR2Client(config);
    const body = JSON.stringify(payload, null, 2);
    const latestKey = createLatestBackupKey(config);
    const snapshotKey = options.writeSnapshot
        ? createSnapshotBackupKey(config, payload, options.reason)
        : null;

    await client.send(
        new PutObjectCommand({
            Bucket: config.bucket,
            Key: latestKey,
            Body: body,
            ContentType: 'application/json; charset=utf-8',
        })
    );

    if (snapshotKey) {
        await client.send(
            new PutObjectCommand({
                Bucket: config.bucket,
                Key: snapshotKey,
                Body: body,
                ContentType: 'application/json; charset=utf-8',
            })
        );
    }

    return {
        latestKey,
        snapshotKey,
    };
}

export async function downloadLatestBackupPayloadFromR2(): Promise<unknown> {
    const config = getR2BackupConfig();

    if (!config) {
        throw new R2BackupNotConfiguredError();
    }

    const client = createR2Client(config);
    const latestKey = createLatestBackupKey(config);

    try {
        const response = await client.send(
            new GetObjectCommand({
                Bucket: config.bucket,
                Key: latestKey,
            })
        );
        const content = await bodyToString(response.Body);

        return JSON.parse(content);
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error('Latest R2 backup is not valid JSON.');
        }

        if (error instanceof S3ServiceException && error.name === 'NoSuchKey') {
            throw new Error(`Latest R2 backup was not found at ${latestKey}.`);
        }

        throw error;
    }
}

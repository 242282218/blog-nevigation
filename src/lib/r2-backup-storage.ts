import {
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
    S3ServiceException,
} from '@aws-sdk/client-s3';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isRecord } from '@/lib/article-data';
import type { EditorBackupPayload } from '@/lib/editor-data-backup';
import { getRuntimeSettingsFilePath } from '@/lib/runtime-config';

const DEFAULT_R2_PREFIX = 'blog-navigation';
const LATEST_BACKUP_FILE_NAME = 'backup.json';
const R2_SETTINGS_FILE_NAME = 'cloudflare-r2.json';
const R2_BACKUP_ENCRYPTION_VERSION = 1;
const R2_BACKUP_ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const R2_BACKUP_BODY_LIMIT_BYTES = 5 * 1024 * 1024;

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
    hasEncryptionKey: boolean;
    allowsPlaintextBackup: boolean;
    source: 'file' | 'env' | 'default';
    message: string | null;
    securityWarning: string | null;
}

export interface EditableR2BackupSettings {
    enabled: boolean;
    accountId: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    backupEncryptionKey?: string;
    prefix: string;
    endpoint: string;
    snapshotOnWrite: boolean;
    allowPlaintextBackup?: boolean;
}

export interface SafeR2BackupSettings extends Omit<EditableR2BackupSettings, 'secretAccessKey' | 'accessKeyId' | 'backupEncryptionKey' | 'allowPlaintextBackup'> {
    hasSecretAccessKey: boolean;
    hasAccessKeyId: boolean;
    hasBackupEncryptionKey: boolean;
    allowPlaintextBackup: boolean;
}

interface EncryptedR2BackupPayload {
    version: typeof R2_BACKUP_ENCRYPTION_VERSION;
    encrypted: true;
    algorithm: typeof R2_BACKUP_ENCRYPTION_ALGORITHM;
    iv: string;
    authTag: string;
    ciphertext: string;
}

export interface R2UploadResult {
    latestKey: string | null;
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

export class R2BackupPayloadTooLargeError extends Error {
    constructor(public readonly limitBytes = R2_BACKUP_BODY_LIMIT_BYTES) {
        super(`R2 backup payload exceeds ${limitBytes} bytes.`);
        this.name = 'R2BackupPayloadTooLargeError';
    }
}

function getEnv(name: string): string {
    return process.env[name]?.trim() ?? '';
}

function getR2SettingsFilePath(): string | null {
    return getRuntimeSettingsFilePath(R2_SETTINGS_FILE_NAME);
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
        backupEncryptionKey: typeof value.backupEncryptionKey === 'string'
            ? value.backupEncryptionKey.trim()
            : '',
        prefix: value.prefix.trim() || DEFAULT_R2_PREFIX,
        endpoint: value.endpoint.trim(),
        snapshotOnWrite: value.snapshotOnWrite,
        allowPlaintextBackup: typeof value.allowPlaintextBackup === 'boolean'
            ? value.allowPlaintextBackup
            : false,
    };
}

function isPlaintextBackupAllowed(): boolean {
    const stored = readStoredR2BackupSettings();

    return stored ? Boolean(stored.allowPlaintextBackup) : getEnv('R2_ALLOW_PLAINTEXT_BACKUP') === 'true';
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

function isValidR2AccountId(accountId: string): boolean {
    return /^[a-f0-9]{32}$/i.test(accountId.trim());
}

function createR2Endpoint(accountId: string): string {
    return `https://${accountId}.r2.cloudflarestorage.com`;
}

function resolveR2Endpoint(endpoint: string, accountId: string): string | null {
    const normalizedAccountId = accountId.trim().toLowerCase();

    if (!isValidR2AccountId(normalizedAccountId)) {
        return null;
    }

    const expectedHostname = `${normalizedAccountId}.r2.cloudflarestorage.com`;
    const expectedEndpoint = createR2Endpoint(normalizedAccountId);
    const trimmedEndpoint = endpoint.trim();

    if (!trimmedEndpoint) {
        return expectedEndpoint;
    }

    try {
        const url = new URL(trimmedEndpoint);

        if (
            url.protocol !== 'https:' ||
            url.username ||
            url.password ||
            url.pathname !== '/' ||
            url.search ||
            url.hash ||
            url.hostname !== expectedHostname
        ) {
            return null;
        }

        return url.toString().replace(/\/$/, '');
    } catch {
        return null;
    }
}

export function getEditableR2BackupSettings(): SafeR2BackupSettings {
    const stored = readStoredR2BackupSettings();

    if (stored) {
        return {
            enabled: stored.enabled,
            accountId: stored.accountId,
            bucket: stored.bucket,
            hasAccessKeyId: Boolean(stored.accessKeyId),
            hasSecretAccessKey: Boolean(stored.secretAccessKey),
            hasBackupEncryptionKey: Boolean(stored.backupEncryptionKey || getEnv('R2_BACKUP_ENCRYPTION_KEY')),
            prefix: normalizePrefix(stored.prefix || DEFAULT_R2_PREFIX),
            endpoint: stored.endpoint,
            snapshotOnWrite: stored.snapshotOnWrite,
            allowPlaintextBackup: Boolean(stored.allowPlaintextBackup),
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
        hasAccessKeyId: Boolean(getEnv('R2_ACCESS_KEY_ID')),
        hasSecretAccessKey: Boolean(secretAccessKey),
        hasBackupEncryptionKey: Boolean(getEnv('R2_BACKUP_ENCRYPTION_KEY')),
        prefix: normalizePrefix(getEnv('R2_PREFIX') || DEFAULT_R2_PREFIX),
        endpoint,
        snapshotOnWrite: getEnv('R2_SNAPSHOT_ON_WRITE') === 'true',
        allowPlaintextBackup: getEnv('R2_ALLOW_PLAINTEXT_BACKUP') === 'true',
    };
}

export function saveEditableR2BackupSettings(input: EditableR2BackupSettings): SafeR2BackupSettings {
    const filePath = getR2SettingsFilePath();

    if (!filePath) {
        throw new Error('Runtime data root is not configured.');
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
    const trimmedBackupEncryptionKey = input.backupEncryptionKey?.trim() ?? '';
    validateOptionalR2BackupEncryptionKey(trimmedBackupEncryptionKey);

    const nextSettings: EditableR2BackupSettings = {
        enabled: input.enabled,
        accountId: input.accountId.trim(),
        bucket: input.bucket.trim(),
        accessKeyId: input.accessKeyId.trim(),
        secretAccessKey: trimmedSecretAccessKey || existing?.secretAccessKey || (input.enabled ? getEnv('R2_SECRET_ACCESS_KEY') : ''),
        backupEncryptionKey: trimmedBackupEncryptionKey || existing?.backupEncryptionKey || '',
        prefix: normalizePrefix(input.prefix || DEFAULT_R2_PREFIX),
        endpoint: input.endpoint.trim(),
        snapshotOnWrite: input.snapshotOnWrite,
        allowPlaintextBackup: Boolean(input.allowPlaintextBackup),
    };

    if (
        nextSettings.enabled &&
        (!nextSettings.accountId || !nextSettings.bucket || !nextSettings.accessKeyId || !nextSettings.secretAccessKey)
    ) {
        throw new Error('启用 R2 备份时必须填写 Account ID、Bucket、Access Key ID 和 Secret Access Key。');
    }

    if (nextSettings.enabled && !resolveR2Endpoint(nextSettings.endpoint, nextSettings.accountId)) {
        throw new Error('Cloudflare R2 Endpoint 必须是当前 Account ID 对应的 HTTPS R2 地址。');
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
    const endpoint = resolveR2Endpoint(stored ? stored.endpoint : getEnv('R2_ENDPOINT'), accountId);

    if (!accountId || !bucket || !accessKeyId || !secretAccessKey || !endpoint) {
        return null;
    }

    if (!getR2BackupEncryptionKey() && !isPlaintextBackupAllowed()) {
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
    const hasEncryptionKey = Boolean(getR2BackupEncryptionKey());
    const allowsPlaintextBackup = isPlaintextBackupAllowed();
    const hasRequiredConnectionSettings = Boolean(
        settings.accountId &&
        settings.bucket &&
        settings.hasAccessKeyId &&
        settings.hasSecretAccessKey &&
        resolveR2Endpoint(settings.endpoint, settings.accountId)
    );

    let securityWarning: string | null = null;
    if (enabled && config && !hasEncryptionKey && allowsPlaintextBackup) {
        securityWarning = 'R2 backup plaintext mode is explicitly enabled. Backup data will be stored without application-level encryption.';
    }

    return {
        enabled,
        configured: Boolean(config),
        bucket: config?.bucket ?? (settings.bucket || null),
        prefix: config?.prefix ?? settings.prefix,
        endpoint: config?.endpoint ?? (settings.endpoint || null),
        snapshotOnWrite: settings.snapshotOnWrite,
        hasAccessKeyId: settings.hasAccessKeyId,
        hasSecretAccessKey: settings.hasSecretAccessKey,
        hasEncryptionKey,
        allowsPlaintextBackup,
        source: stored ? 'file' : (enabled || settings.bucket || settings.accountId ? 'env' : 'default'),
        message: enabled && !config
            ? (hasRequiredConnectionSettings && !hasEncryptionKey && !allowsPlaintextBackup
                ? 'R2 backup encryption key is required unless R2_ALLOW_PLAINTEXT_BACKUP=true is explicitly set.'
                : 'R2 backup is enabled but required variables are missing.')
            : null,
        securityWarning,
    };
}

let cachedR2Client: S3Client | null = null;
let cachedR2ClientKey: string | null = null;

function createR2Client(config: R2BackupConfig): S3Client {
    const secretHash = createHash('sha256').update(config.secretAccessKey).digest('hex').slice(0, 16);
    const cacheKey = `${config.endpoint}|${config.accessKeyId}|${secretHash}`;

    if (cachedR2Client && cachedR2ClientKey === cacheKey) {
        return cachedR2Client;
    }

    cachedR2Client = new S3Client({
        region: 'auto',
        endpoint: config.endpoint,
        forcePathStyle: true,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
    });
    cachedR2ClientKey = cacheKey;

    return cachedR2Client;
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

function assertR2BackupBodySize(byteLength: number): void {
    if (byteLength > R2_BACKUP_BODY_LIMIT_BYTES) {
        throw new R2BackupPayloadTooLargeError();
    }
}

function assertR2BackupBodyTextSize(value: string): void {
    assertR2BackupBodySize(Buffer.byteLength(value, 'utf8'));
}

async function bodyToString(body: unknown): Promise<string> {
    if (!body) {
        return '';
    }

    if (typeof body === 'string') {
        assertR2BackupBodyTextSize(body);
        return body;
    }

    if (body instanceof Uint8Array) {
        assertR2BackupBodySize(body.byteLength);
        return Buffer.from(body).toString('utf8');
    }

    if (typeof body === 'object' && 'transformToString' in body) {
        const value = await (body as { transformToString: () => Promise<string> }).transformToString();
        assertR2BackupBodyTextSize(value);
        return value;
    }

    if (Symbol.asyncIterator in Object(body)) {
        const chunks: Buffer[] = [];
        let receivedBytes = 0;

        for await (const chunk of body as AsyncIterable<Buffer | Uint8Array | string>) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            receivedBytes += buffer.byteLength;
            assertR2BackupBodySize(receivedBytes);
            chunks.push(buffer);
        }

        return Buffer.concat(chunks).toString('utf8');
    }

    const value = String(body);
    assertR2BackupBodyTextSize(value);
    return value;
}

function getR2BackupEncryptionKey(): Buffer | null {
    const stored = readStoredR2BackupSettings();
    const rawKey = stored?.backupEncryptionKey?.trim() || getEnv('R2_BACKUP_ENCRYPTION_KEY');

    if (!rawKey) {
        return null;
    }

    return parseR2BackupEncryptionKey(rawKey, 'R2_BACKUP_ENCRYPTION_KEY');
}

function parseR2BackupEncryptionKey(rawKey: string, label: string): Buffer {
    const trimmedKey = rawKey.trim();
    const base64Key = Buffer.from(trimmedKey, 'base64');

    if (base64Key.length === 32 && base64Key.toString('base64') === trimmedKey) {
        return base64Key;
    }

    const hexKey = Buffer.from(trimmedKey, 'hex');

    if (hexKey.length === 32 && hexKey.toString('hex').toLowerCase() === trimmedKey.toLowerCase()) {
        return hexKey;
    }

    throw new Error(`${label} must be a 32-byte base64 or hex value.`);
}

function validateOptionalR2BackupEncryptionKey(rawKey: string): void {
    if (!rawKey.trim()) {
        return;
    }

    try {
        parseR2BackupEncryptionKey(rawKey, 'R2 backup encryption key');
    } catch {
        throw new Error('R2 备份加密密钥必须是 32 字节 base64 或 hex 值。');
    }
}

function encryptBackupBody(body: string, key: Buffer): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(R2_BACKUP_ENCRYPTION_ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([
        cipher.update(body, 'utf8'),
        cipher.final(),
    ]);
    const envelope: EncryptedR2BackupPayload = {
        version: R2_BACKUP_ENCRYPTION_VERSION,
        encrypted: true,
        algorithm: R2_BACKUP_ENCRYPTION_ALGORITHM,
        iv: iv.toString('base64'),
        authTag: cipher.getAuthTag().toString('base64'),
        ciphertext: ciphertext.toString('base64'),
    };

    return JSON.stringify(envelope, null, 2);
}

function isEncryptedR2BackupPayload(value: unknown): value is EncryptedR2BackupPayload {
    return (
        isRecord(value) &&
        value.version === R2_BACKUP_ENCRYPTION_VERSION &&
        value.encrypted === true &&
        value.algorithm === R2_BACKUP_ENCRYPTION_ALGORITHM &&
        typeof value.iv === 'string' &&
        typeof value.authTag === 'string' &&
        typeof value.ciphertext === 'string'
    );
}

function decryptBackupBody(envelope: EncryptedR2BackupPayload, key: Buffer): string {
    const decipher = createDecipheriv(
        R2_BACKUP_ENCRYPTION_ALGORITHM,
        key,
        Buffer.from(envelope.iv, 'base64')
    );

    decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));

    return Buffer.concat([
        decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
        decipher.final(),
    ]).toString('utf8');
}

function createR2BackupBody(payload: EditorBackupPayload): string {
    const body = JSON.stringify(payload, null, 2);
    const key = getR2BackupEncryptionKey();
    assertR2BackupBodyTextSize(body);

    if (key) {
        const encryptedBody = encryptBackupBody(body, key);
        assertR2BackupBodyTextSize(encryptedBody);
        return encryptedBody;
    }

    if (isPlaintextBackupAllowed()) {
        return body;
    }

    throw new Error('R2_BACKUP_ENCRYPTION_KEY is required unless R2_ALLOW_PLAINTEXT_BACKUP=true is explicitly set.');
}

function parseR2BackupBody(content: string): unknown {
    const parsed = JSON.parse(content) as unknown;

    if (!isEncryptedR2BackupPayload(parsed)) {
        return parsed;
    }

    const key = getR2BackupEncryptionKey();

    if (!key) {
        throw new Error('Latest R2 backup is encrypted but R2_BACKUP_ENCRYPTION_KEY is not configured.');
    }

    return JSON.parse(decryptBackupBody(parsed, key));
}

export async function uploadBackupPayloadToR2(
    payload: EditorBackupPayload,
    options: {
        reason: string;
        writeSnapshot: boolean;
        writeLatest?: boolean;
    }
): Promise<R2UploadResult> {
    const config = getR2BackupConfig();

    if (!config) {
        throw new R2BackupNotConfiguredError();
    }

    const client = createR2Client(config);
    const body = createR2BackupBody(payload);
    const latestKey = createLatestBackupKey(config);
    const snapshotKey = options.writeSnapshot
        ? createSnapshotBackupKey(config, payload, options.reason)
        : null;
    const writeLatest = options.writeLatest ?? true;

    if (!writeLatest && !snapshotKey) {
        throw new Error('R2 backup upload must write latest or a snapshot.');
    }

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

    if (writeLatest) {
        await client.send(
            new PutObjectCommand({
                Bucket: config.bucket,
                Key: latestKey,
                Body: body,
                ContentType: 'application/json; charset=utf-8',
            })
        );
    }

    return {
        latestKey: writeLatest ? latestKey : null,
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

        if (typeof response.ContentLength === 'number') {
            assertR2BackupBodySize(response.ContentLength);
        }

        const content = await bodyToString(response.Body);

        return parseR2BackupBody(content);
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

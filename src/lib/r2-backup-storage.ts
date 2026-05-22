import {
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
    S3ServiceException,
} from '@aws-sdk/client-s3';
import type { EditorBackupPayload } from '@/lib/editor-data-backup';

const DEFAULT_R2_PREFIX = 'blog-navigation';
const LATEST_BACKUP_FILE_NAME = 'backup.json';

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
    message: string | null;
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

function getEnv(name: string): string {
    return process.env[name]?.trim() ?? '';
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
    const configuredEndpoint = getEnv('R2_ENDPOINT');

    if (configuredEndpoint) {
        return configuredEndpoint;
    }

    return `https://${accountId}.r2.cloudflarestorage.com`;
}

export function getR2BackupConfig(): R2BackupConfig | null {
    if (getEnv('R2_BACKUP_ENABLED') !== 'true') {
        return null;
    }

    const accountId = getEnv('R2_ACCOUNT_ID');
    const bucket = getEnv('R2_BUCKET');
    const accessKeyId = getEnv('R2_ACCESS_KEY_ID');
    const secretAccessKey = getEnv('R2_SECRET_ACCESS_KEY');

    if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
        return null;
    }

    return {
        bucket,
        endpoint: createR2Endpoint(accountId),
        accessKeyId,
        secretAccessKey,
        prefix: normalizePrefix(getEnv('R2_PREFIX') || DEFAULT_R2_PREFIX),
        snapshotOnWrite: getEnv('R2_SNAPSHOT_ON_WRITE') === 'true',
    };
}

export function getR2BackupStatus(): R2BackupStatus {
    const enabled = getEnv('R2_BACKUP_ENABLED') === 'true';
    const config = getR2BackupConfig();

    return {
        enabled,
        configured: Boolean(config),
        bucket: config?.bucket ?? (getEnv('R2_BUCKET') || null),
        prefix: config?.prefix ?? normalizePrefix(getEnv('R2_PREFIX') || DEFAULT_R2_PREFIX),
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

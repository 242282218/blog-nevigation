import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import {
    SESSION_NAMESPACE,
    getEditorAccessToken,
} from '@/lib/editor-auth';
import { getEditorDataRoot } from '@/lib/editor-data-storage';

const AUTH_CONFIG_VERSION = 1;
const AUTH_PASSWORD_NAMESPACE = 'blog-navigation-editor-password:v1';
const AUTH_ENV_TOKEN_NAMESPACE = 'blog-navigation-editor-env-token:v1';
const AUTH_CONFIG_FILE_NAME = 'editor-auth.json';
const AUTH_CONFIG_DIRECTORY_NAME = 'settings';
const MIN_EDITOR_SECRET_LENGTH = 8;
const RUNTIME_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const scryptAsync = promisify(scrypt);

interface RuntimeEditorAuthConfig {
    version: typeof AUTH_CONFIG_VERSION;
    passwordSalt: string;
    passwordHash: string;
    activeSessionSalt?: string;
    activeSessionHash?: string;
    activeSessionExpiresAt?: string;
    createdAt: string;
    updatedAt: string;
}

interface EnvironmentEditorSessionState {
    tokenHash: string;
    activeSessionSalt: string;
    activeSessionHash: string;
    activeSessionExpiresAt: string;
}

let environmentEditorSessionState: EnvironmentEditorSessionState | null = null;

export class RuntimeEditorAuthAlreadyConfiguredError extends Error {
    constructor() {
        super('Editor auth is already configured.');
        this.name = 'RuntimeEditorAuthAlreadyConfiguredError';
    }
}

export class RuntimeEditorAuthInvalidSecretError extends Error {
    constructor() {
        super(`Editor secret must be at least ${MIN_EDITOR_SECRET_LENGTH} characters.`);
        this.name = 'RuntimeEditorAuthInvalidSecretError';
    }
}

export class RuntimeEditorAuthConfigInvalidError extends Error {
    constructor(public readonly filePath: string) {
        super('Stored editor auth config is invalid.');
        this.name = 'RuntimeEditorAuthConfigInvalidError';
    }
}

function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

function safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeSecret(secret: string): string {
    return secret.trim();
}

async function createPasswordHash(secret: string, salt: string): Promise<string> {
    const hash = await scryptAsync(
        `${AUTH_PASSWORD_NAMESPACE}:${normalizeSecret(secret)}`,
        salt,
        64
    ) as Buffer;

    return hash.toString('hex');
}

function createLegacySessionValue(secret: string): string {
    return sha256(`${SESSION_NAMESPACE}:${normalizeSecret(secret)}`);
}

function createEnvironmentTokenHash(secret: string): string {
    return sha256(`${AUTH_ENV_TOKEN_NAMESPACE}:${normalizeSecret(secret)}`);
}

function createSessionHash(sessionValue: string, salt: string): string {
    return sha256(`${SESSION_NAMESPACE}:${salt}:${sessionValue}`);
}

function createRuntimeEditorSessionFields(sessionValue: string) {
    const activeSessionSalt = randomBytes(16).toString('hex');

    return {
        activeSessionSalt,
        activeSessionHash: createSessionHash(sessionValue, activeSessionSalt),
        activeSessionExpiresAt: new Date(
            Date.now() + RUNTIME_SESSION_MAX_AGE_SECONDS * 1000
        ).toISOString(),
    };
}

function isSessionExpired(expiresAt: string | undefined): boolean {
    if (!expiresAt) {
        return true;
    }

    const expiresAtMs = Date.parse(expiresAt);
    return !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now();
}

function parseRuntimeEditorAuthConfig(value: unknown, filePath: string): RuntimeEditorAuthConfig {
    if (!value || typeof value !== 'object') {
        throw new RuntimeEditorAuthConfigInvalidError(filePath);
    }

    const candidate = value as Partial<RuntimeEditorAuthConfig>;

    if (
        candidate.version !== AUTH_CONFIG_VERSION ||
        typeof candidate.passwordSalt !== 'string' ||
        typeof candidate.passwordHash !== 'string' ||
        typeof candidate.createdAt !== 'string'
    ) {
        throw new RuntimeEditorAuthConfigInvalidError(filePath);
    }

    return {
        version: AUTH_CONFIG_VERSION,
        passwordSalt: candidate.passwordSalt,
        passwordHash: candidate.passwordHash,
        createdAt: candidate.createdAt,
        updatedAt: typeof candidate.updatedAt === 'string'
            ? candidate.updatedAt
            : candidate.createdAt,
        activeSessionSalt: typeof candidate.activeSessionSalt === 'string'
            ? candidate.activeSessionSalt
            : undefined,
        activeSessionHash: typeof candidate.activeSessionHash === 'string'
            ? candidate.activeSessionHash
            : undefined,
        activeSessionExpiresAt: typeof candidate.activeSessionExpiresAt === 'string'
            ? candidate.activeSessionExpiresAt
            : undefined,
    };
}

export function getRuntimeEditorAuthConfigFilePath(): string {
    const configuredPath = process.env.EDITOR_AUTH_CONFIG_FILE?.trim();

    if (configuredPath) {
        return path.resolve(configuredPath);
    }

    const dataRoot = getEditorDataRoot() ?? path.join(process.cwd(), 'data');
    return path.join(dataRoot, AUTH_CONFIG_DIRECTORY_NAME, AUTH_CONFIG_FILE_NAME);
}

export function readRuntimeEditorAuthConfig(): RuntimeEditorAuthConfig | null {
    const filePath = getRuntimeEditorAuthConfigFilePath();

    if (!fs.existsSync(filePath)) {
        return null;
    }

    try {
        return parseRuntimeEditorAuthConfig(JSON.parse(fs.readFileSync(filePath, 'utf8')), filePath);
    } catch (error) {
        if (error instanceof RuntimeEditorAuthConfigInvalidError) {
            throw error;
        }

        console.error(`[editor-auth-runtime] Failed to read auth config: ${filePath}`, error);
        throw new RuntimeEditorAuthConfigInvalidError(filePath);
    }
}

function writeRuntimeEditorAuthConfig(config: RuntimeEditorAuthConfig, mode: 'create' | 'replace'): void {
    const filePath = getRuntimeEditorAuthConfigFilePath();

    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    if (mode === 'replace') {
        const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

        try {
            fs.writeFileSync(tempFilePath, JSON.stringify(config, null, 2), {
                encoding: 'utf8',
                mode: 0o600,
            });
            fs.renameSync(tempFilePath, filePath);
            fs.chmodSync(filePath, 0o600);
        } catch (error) {
            fs.rmSync(tempFilePath, { force: true });
            throw error;
        }

        return;
    }

    let fileDescriptor: number | null = null;

    try {
        fileDescriptor = fs.openSync(filePath, 'wx', 0o600);
        fs.writeFileSync(fileDescriptor, JSON.stringify(config, null, 2), 'utf8');
    } finally {
        if (fileDescriptor !== null) {
            fs.closeSync(fileDescriptor);
        }
    }
}

export function isRuntimeEditorAuthConfigured(): boolean {
    return Boolean(getEditorAccessToken() || readRuntimeEditorAuthConfig());
}

export async function initializeRuntimeEditorAuth(secret: string): Promise<string> {
    const normalizedSecret = normalizeSecret(secret);

    if (getEditorAccessToken() || readRuntimeEditorAuthConfig()) {
        throw new RuntimeEditorAuthAlreadyConfiguredError();
    }

    if (normalizedSecret.length < MIN_EDITOR_SECRET_LENGTH) {
        throw new RuntimeEditorAuthInvalidSecretError();
    }

    const passwordSalt = randomBytes(16).toString('hex');
    const sessionValue = randomBytes(32).toString('hex');
    const now = new Date().toISOString();
    const config: RuntimeEditorAuthConfig = {
        version: AUTH_CONFIG_VERSION,
        passwordSalt,
        passwordHash: await createPasswordHash(normalizedSecret, passwordSalt),
        ...createRuntimeEditorSessionFields(sessionValue),
        createdAt: now,
        updatedAt: now,
    };

    try {
        writeRuntimeEditorAuthConfig(config, 'create');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
            throw new RuntimeEditorAuthAlreadyConfiguredError();
        }

        throw error;
    }

    return sessionValue;
}

export async function createRuntimeEditorSession(): Promise<string | null> {
    const envSecret = getEditorAccessToken();
    const sessionValue = randomBytes(32).toString('hex');

    if (envSecret) {
        environmentEditorSessionState = {
            tokenHash: createEnvironmentTokenHash(envSecret),
            ...createRuntimeEditorSessionFields(sessionValue),
        };

        return sessionValue;
    }

    const config = readRuntimeEditorAuthConfig();

    if (!config) {
        return null;
    }

    const nextConfig: RuntimeEditorAuthConfig = {
        ...config,
        ...createRuntimeEditorSessionFields(sessionValue),
        updatedAt: new Date().toISOString(),
    };

    writeRuntimeEditorAuthConfig(nextConfig, 'replace');
    return sessionValue;
}

export function revokeRuntimeEditorSession(): void {
    if (getEditorAccessToken()) {
        environmentEditorSessionState = null;
        return;
    }

    const config = readRuntimeEditorAuthConfig();

    if (!config) {
        return;
    }

    const {
        activeSessionSalt: _activeSessionSalt,
        activeSessionHash: _activeSessionHash,
        activeSessionExpiresAt: _activeSessionExpiresAt,
        ...rest
    } = config;

    writeRuntimeEditorAuthConfig({
        ...rest,
        updatedAt: new Date().toISOString(),
    }, 'replace');
}

export async function isValidRuntimeEditorSecret(candidate: string): Promise<boolean> {
    const normalizedCandidate = normalizeSecret(candidate);
    const envSecret = getEditorAccessToken();

    if (!normalizedCandidate) {
        return false;
    }

    if (envSecret) {
        return safeEqual(createLegacySessionValue(normalizedCandidate), createLegacySessionValue(envSecret));
    }

    const config = readRuntimeEditorAuthConfig();

    if (!config) {
        return false;
    }

    return safeEqual(
        await createPasswordHash(normalizedCandidate, config.passwordSalt),
        config.passwordHash
    );
}

export async function isValidRuntimeEditorSession(
    sessionValue: string | null | undefined
): Promise<boolean> {
    if (!sessionValue) {
        return false;
    }

    const envSecret = getEditorAccessToken();

    if (envSecret) {
        if (
            !environmentEditorSessionState ||
            isSessionExpired(environmentEditorSessionState.activeSessionExpiresAt) ||
            !safeEqual(environmentEditorSessionState.tokenHash, createEnvironmentTokenHash(envSecret))
        ) {
            return false;
        }

        return safeEqual(
            createSessionHash(sessionValue, environmentEditorSessionState.activeSessionSalt),
            environmentEditorSessionState.activeSessionHash
        );
    }

    const config = readRuntimeEditorAuthConfig();

    if (
        !config?.activeSessionSalt ||
        !config.activeSessionHash ||
        isSessionExpired(config.activeSessionExpiresAt)
    ) {
        return false;
    }

    return safeEqual(
        createSessionHash(sessionValue, config.activeSessionSalt),
        config.activeSessionHash
    );
}

export function resetEnvironmentEditorSessionForTests(): void {
    environmentEditorSessionState = null;
}

export function getRuntimeEditorAuthSetupToken(): string | null {
    const token = process.env.EDITOR_RUNTIME_AUTH_SETUP_TOKEN?.trim();
    return token ? token : null;
}

export function isRuntimeEditorAuthSetupEnabled(): boolean {
    return Boolean(
        process.env.EDITOR_ALLOW_RUNTIME_AUTH_SETUP === 'true' ||
        getRuntimeEditorAuthSetupToken()
    );
}

export function isRuntimeEditorAuthSetupTokenRequired(): boolean {
    return Boolean(getRuntimeEditorAuthSetupToken());
}

export function isValidRuntimeEditorAuthSetupToken(candidate: string): boolean {
    const setupToken = getRuntimeEditorAuthSetupToken();

    if (!setupToken) {
        return process.env.EDITOR_ALLOW_RUNTIME_AUTH_SETUP === 'true';
    }

    return safeEqual(candidate.trim(), setupToken);
}

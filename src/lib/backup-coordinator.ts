import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getRuntimeDataRootPath } from '@/lib/runtime-config';

const PENDING_BACKUP_FILE_NAME = '.backup-pending.json';
const PENDING_BACKUP_STATE_VERSION = 1;
const MAX_BACKUP_TASK_ATTEMPTS = 3;

export interface BackupTask {
    id: string;
    reason: string;
    timestamp: string;
    retries: number;
    writeSnapshot: boolean;
    writeLatest?: boolean;
    nextAttemptAt?: string;
    lastError?: string;
}

export interface PendingBackupState {
    version: typeof PENDING_BACKUP_STATE_VERSION;
    tasks: BackupTask[];
}

export interface BackupTaskInput {
    reason: string;
    writeSnapshot: boolean;
    writeLatest?: boolean;
}

type DrainOptions = {
    retryDelayMs?: (retries: number) => number;
    sleep?: (milliseconds: number) => Promise<void>;
    now?: () => Date;
};

export class BackupCoordinatorStateInvalidError extends Error {
    constructor(public readonly filePath: string) {
        super('Pending backup queue state is invalid.');
        this.name = 'BackupCoordinatorStateInvalidError';
    }
}

let activeDrain: Promise<void> | null = null;

function getPendingBackupFilePath(): string {
    return path.join(getRuntimeDataRootPath(), PENDING_BACKUP_FILE_NAME);
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

function createEmptyState(): PendingBackupState {
    return {
        version: PENDING_BACKUP_STATE_VERSION,
        tasks: [],
    };
}

function isTask(value: unknown): value is BackupTask {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const candidate = value as Partial<BackupTask>;

    return (
        typeof candidate.id === 'string' &&
        typeof candidate.reason === 'string' &&
        typeof candidate.timestamp === 'string' &&
        typeof candidate.retries === 'number' &&
        Number.isInteger(candidate.retries) &&
        candidate.retries >= 0 &&
        typeof candidate.writeSnapshot === 'boolean' &&
        (candidate.writeLatest === undefined || typeof candidate.writeLatest === 'boolean') &&
        (candidate.nextAttemptAt === undefined || typeof candidate.nextAttemptAt === 'string') &&
        (candidate.lastError === undefined || typeof candidate.lastError === 'string')
    );
}

function parseState(value: unknown, filePath: string): PendingBackupState {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new BackupCoordinatorStateInvalidError(filePath);
    }

    const candidate = value as Partial<PendingBackupState>;

    if (
        candidate.version !== PENDING_BACKUP_STATE_VERSION ||
        !Array.isArray(candidate.tasks) ||
        candidate.tasks.some((task) => !isTask(task))
    ) {
        throw new BackupCoordinatorStateInvalidError(filePath);
    }

    return {
        version: PENDING_BACKUP_STATE_VERSION,
        tasks: candidate.tasks,
    };
}

function readState(): PendingBackupState {
    const filePath = getPendingBackupFilePath();

    if (!fs.existsSync(filePath)) {
        return createEmptyState();
    }

    try {
        return parseState(JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown, filePath);
    } catch (error) {
        if (error instanceof BackupCoordinatorStateInvalidError) {
            throw error;
        }

        throw new BackupCoordinatorStateInvalidError(filePath);
    }
}

function writeState(state: PendingBackupState): void {
    const filePath = getPendingBackupFilePath();
    const directoryPath = path.dirname(filePath);
    fs.mkdirSync(directoryPath, { recursive: true });

    if (state.tasks.length === 0) {
        fs.rmSync(filePath, { force: true });
        fsyncDirectory(directoryPath);
        return;
    }

    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

    try {
        fs.writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
        fsyncFile(tempPath);
        fs.renameSync(tempPath, filePath);
        fsyncDirectory(directoryPath);
    } catch (error) {
        fs.rmSync(tempPath, { force: true });
        throw error;
    }
}

function createTask(input: BackupTaskInput, now: Date): BackupTask {
    return {
        id: randomUUID(),
        reason: input.reason,
        timestamp: now.toISOString(),
        retries: 0,
        writeSnapshot: input.writeSnapshot,
        writeLatest: input.writeLatest,
    };
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error && error.message ? error.message : String(error);
}

function getRetryDelayMs(retries: number, options: DrainOptions): number {
    return options.retryDelayMs?.(retries) ?? 250 * (2 ** Math.max(0, retries - 1));
}

function sleep(milliseconds: number, options: DrainOptions): Promise<void> {
    if (milliseconds <= 0) {
        return Promise.resolve();
    }

    if (options.sleep) {
        return options.sleep(milliseconds);
    }

    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}

function findNextTask(tasks: BackupTask[], now: Date): BackupTask | null {
    const nowTime = now.getTime();

    return tasks.find((task) => {
        if (task.retries >= MAX_BACKUP_TASK_ATTEMPTS) {
            return false;
        }

        if (!task.nextAttemptAt) {
            return true;
        }

        return Date.parse(task.nextAttemptAt) <= nowTime;
    }) ?? null;
}

function findNextAttemptDelay(tasks: BackupTask[], now: Date): number | null {
    const futureTimes = tasks
        .filter((task) => task.retries < MAX_BACKUP_TASK_ATTEMPTS && task.nextAttemptAt)
        .map((task) => Date.parse(task.nextAttemptAt as string))
        .filter((time) => Number.isFinite(time) && time > now.getTime())
        .sort((left, right) => left - right);

    return futureTimes.length > 0 ? futureTimes[0] - now.getTime() : null;
}

function removeTask(taskId: string): void {
    const state = readState();
    writeState({
        ...state,
        tasks: state.tasks.filter((task) => task.id !== taskId),
    });
}

function updateTaskAfterFailure(task: BackupTask, error: unknown, now: Date, options: DrainOptions): boolean {
    const retries = task.retries + 1;

    if (retries >= MAX_BACKUP_TASK_ATTEMPTS) {
        removeTask(task.id);
        return false;
    }

    const retryDelayMs = getRetryDelayMs(retries, options);
    const nextAttemptAt = new Date(now.getTime() + retryDelayMs).toISOString();
    const state = readState();

    writeState({
        ...state,
        tasks: state.tasks.map((currentTask) => currentTask.id === task.id
            ? {
                ...currentTask,
                retries,
                nextAttemptAt,
                lastError: getErrorMessage(error),
            }
            : currentTask),
    });

    return true;
}

async function runDrain(
    execute: (task: BackupTask) => Promise<boolean>,
    options: DrainOptions
): Promise<void> {
    while (true) {
        const now = options.now?.() ?? new Date();
        const state = readState();
        const task = findNextTask(state.tasks, now);

        if (!task) {
            const delayMs = findNextAttemptDelay(state.tasks, now);

            if (delayMs === null) {
                return;
            }

            await sleep(delayMs, options);
            continue;
        }

        try {
            const success = await execute(task);

            if (success) {
                removeTask(task.id);
            } else {
                const shouldRetry = updateTaskAfterFailure(task, new Error('Backup task failed.'), now, options);

                if (shouldRetry) {
                    await sleep(getRetryDelayMs(task.retries + 1, options), options);
                }
            }
        } catch (error) {
            const shouldRetry = updateTaskAfterFailure(task, error, now, options);

            if (shouldRetry) {
                await sleep(getRetryDelayMs(task.retries + 1, options), options);
            }
        }
    }
}

export function enqueuePendingBackupTask(input: BackupTaskInput): BackupTask {
    const state = readState();
    const task = createTask(input, new Date());

    writeState({
        ...state,
        tasks: [...state.tasks, task],
    });

    return task;
}

export function readPendingBackupTasksForTests(): BackupTask[] {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('readPendingBackupTasksForTests must not be called in production.');
    }

    return readState().tasks;
}

export async function drainPendingBackupTasks(
    execute: (task: BackupTask) => Promise<boolean>,
    options: DrainOptions = {}
): Promise<void> {
    if (activeDrain) {
        return activeDrain;
    }

    activeDrain = runDrain(execute, options)
        .finally(() => {
            activeDrain = null;
        });

    return activeDrain;
}

export function resetBackupCoordinatorForTests(): void {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('resetBackupCoordinatorForTests must not be called in production.');
    }

    activeDrain = null;
    fs.rmSync(getPendingBackupFilePath(), { force: true });
}

export async function waitForBackupCoordinatorIdleForTests(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('waitForBackupCoordinatorIdleForTests must not be called in production.');
    }

    while (activeDrain) {
        await activeDrain.catch(() => undefined);
        await Promise.resolve();
    }
}

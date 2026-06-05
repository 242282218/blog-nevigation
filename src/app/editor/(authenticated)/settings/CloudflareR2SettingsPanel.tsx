'use client';

import { useCallback, useEffect, useState } from 'react';
import { Cloud, CloudDownload, CloudUpload, KeyRound, Save } from 'lucide-react';
import { StatusMessage } from '@/app/components/ui';
import { loadCurrentBackupManifest } from '../../backup-current-manifest';
import { createRestoreActionMessage } from '../../backup-action-message';
import { createEditorCsrfHeaders } from '../../editor-csrf';
import {
    EditorButton,
    EditorPanel,
    editorInputClassName,
} from '../../components/EditorShell';

type CloudflareR2Settings = {
    enabled: boolean;
    accountId: string;
    bucket: string;
    hasAccessKeyId: boolean;
    hasSecretAccessKey: boolean;
    hasBackupEncryptionKey: boolean;
    prefix: string;
    endpoint: string;
    snapshotOnWrite: boolean;
};

type CloudflareR2Status = {
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
};

type CloudflareR2Response = {
    persistent?: boolean;
    settings?: CloudflareR2Settings;
    status?: CloudflareR2Status;
    message?: string;
};

type RemoteBackupActionResponse = {
    message?: string;
    remoteBackup?: {
        success?: boolean;
        message?: string;
    };
};

type CloudflareR2Form = Omit<CloudflareR2Settings, 'hasSecretAccessKey' | 'hasAccessKeyId' | 'hasBackupEncryptionKey'> & {
    accessKeyId: string;
    secretAccessKey: string;
    backupEncryptionKey: string;
};

type CloudflareR2BootstrapForm = {
    authEmail: string;
    globalApiKey: string;
    accountId: string;
    bucket: string;
    prefix: string;
    snapshotOnWrite: boolean;
};

type CloudflareMessage = {
    tone: 'success' | 'warning' | 'danger' | 'loading' | 'info';
    text: string;
};

type CloudflareR2ValidationField = 'accountId' | 'bucket' | 'accessKeyId' | 'secretAccessKey' | 'backupEncryptionKey';
type CloudflareR2BootstrapValidationField = 'authEmail' | 'globalApiKey' | 'accountId' | 'bucket';

type CloudflareR2ValidationError = {
    field: CloudflareR2ValidationField;
    message: string;
};

type CloudflareR2BootstrapValidationError = {
    field: CloudflareR2BootstrapValidationField;
    message: string;
};

interface TextFieldProps {
    id: string;
    label: string;
    help: string;
    value: string;
    type?: 'text' | 'password';
    placeholder?: string;
    error?: string;
    onChange: (value: string) => void;
}

function TextField({
    id,
    label,
    help,
    value,
    type = 'text',
    placeholder,
    error,
    onChange,
}: TextFieldProps) {
    const descriptionId = `${id}-description`;

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-fg">
                {label}
            </label>
            <input
                id={id}
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={descriptionId}
                className={`${editorInputClassName} mt-2`}
            />
            <p
                id={descriptionId}
                className={`mt-1.5 text-xs leading-5 ${error ? 'text-error-600' : 'text-subtle'}`}
                role={error ? 'alert' : undefined}
            >
                {error || help}
            </p>
        </div>
    );
}

function createEmptyCloudflareR2Form(): CloudflareR2Form {
    return {
        enabled: false,
        accountId: '',
        bucket: '',
        accessKeyId: '',
        secretAccessKey: '',
        backupEncryptionKey: '',
        prefix: 'blog-navigation',
        endpoint: '',
        snapshotOnWrite: false,
    };
}

function createEmptyCloudflareR2BootstrapForm(): CloudflareR2BootstrapForm {
    return {
        authEmail: '',
        globalApiKey: '',
        accountId: '',
        bucket: '',
        prefix: 'blog-navigation',
        snapshotOnWrite: false,
    };
}

function toCloudflareR2Form(settings?: CloudflareR2Settings): CloudflareR2Form {
    return {
        enabled: Boolean(settings?.enabled),
        accountId: settings?.accountId ?? '',
        bucket: settings?.bucket ?? '',
        accessKeyId: '',
        secretAccessKey: '',
        backupEncryptionKey: '',
        prefix: settings?.prefix ?? 'blog-navigation',
        endpoint: settings?.endpoint ?? '',
        snapshotOnWrite: Boolean(settings?.snapshotOnWrite),
    };
}

function toCloudflareR2BootstrapForm(settings?: CloudflareR2Settings): CloudflareR2BootstrapForm {
    return {
        ...createEmptyCloudflareR2BootstrapForm(),
        accountId: settings?.accountId ?? '',
        bucket: settings?.bucket ?? '',
        prefix: settings?.prefix ?? 'blog-navigation',
        snapshotOnWrite: Boolean(settings?.snapshotOnWrite),
    };
}

function validateCloudflareR2Form(
    form: CloudflareR2Form,
    hasSecretAccessKey: boolean,
    hasBackupEncryptionKey: boolean,
    allowsPlaintextBackup: boolean
): CloudflareR2ValidationError | null {
    if (!form.enabled) {
        return null;
    }

    if (!form.accountId.trim()) {
        return { field: 'accountId', message: '请填写 Cloudflare Account ID。' };
    }

    if (!form.bucket.trim()) {
        return { field: 'bucket', message: '请填写 R2 Bucket。' };
    }

    if (!form.accessKeyId.trim()) {
        return { field: 'accessKeyId', message: '请填写 R2 Access Key ID。' };
    }

    if (!form.secretAccessKey.trim() && !hasSecretAccessKey) {
        return { field: 'secretAccessKey', message: '请填写 R2 Secret Access Key。' };
    }

    if (!form.backupEncryptionKey.trim() && !hasBackupEncryptionKey && !allowsPlaintextBackup) {
        return { field: 'backupEncryptionKey', message: '请填写或生成 R2 备份加密密钥。' };
    }

    return null;
}

function validateCloudflareR2BootstrapForm(form: CloudflareR2BootstrapForm): CloudflareR2BootstrapValidationError | null {
    if (!form.authEmail.trim()) {
        return { field: 'authEmail', message: '请填写 Cloudflare 登录邮箱。' };
    }

    if (!form.globalApiKey.trim()) {
        return { field: 'globalApiKey', message: '请填写 Cloudflare Global API Key。' };
    }

    if (!form.accountId.trim()) {
        return { field: 'accountId', message: '请填写 Cloudflare Account ID。' };
    }

    if (!form.bucket.trim()) {
        return { field: 'bucket', message: '请填写 R2 Bucket。' };
    }

    return null;
}

const CLOUDFLARE_R2_FIELD_IDS: Record<CloudflareR2ValidationField, string> = {
    accountId: 'r2-account-id',
    bucket: 'r2-bucket',
    accessKeyId: 'r2-access-key-id',
    secretAccessKey: 'r2-secret-access-key',
    backupEncryptionKey: 'r2-backup-encryption-key',
};
const CLOUDFLARE_R2_BOOTSTRAP_FIELD_IDS: Record<CloudflareR2BootstrapValidationField, string> = {
    authEmail: 'r2-bootstrap-auth-email',
    globalApiKey: 'r2-bootstrap-global-api-key',
    accountId: 'r2-bootstrap-account-id',
    bucket: 'r2-bootstrap-bucket',
};

function isCloudflareR2ValidationField(id: keyof CloudflareR2Form): id is CloudflareR2ValidationField {
    return id === 'accountId' || id === 'bucket' || id === 'accessKeyId' || id === 'secretAccessKey' || id === 'backupEncryptionKey';
}

function createBackupEncryptionKey(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');

    return window.btoa(binary);
}

export function CloudflareR2SettingsPanel() {
    const [form, setForm] = useState<CloudflareR2Form>(createEmptyCloudflareR2Form);
    const [bootstrapForm, setBootstrapForm] = useState<CloudflareR2BootstrapForm>(createEmptyCloudflareR2BootstrapForm);
    const [status, setStatus] = useState<CloudflareR2Status | null>(null);
    const [hasSecretAccessKey, setHasSecretAccessKey] = useState(false);
    const [hasBackupEncryptionKey, setHasBackupEncryptionKey] = useState(false);
    const [persistent, setPersistent] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isBootstrapping, setIsBootstrapping] = useState(false);
    const [isRemoteBusy, setIsRemoteBusy] = useState(false);
    const [message, setMessage] = useState<CloudflareMessage | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<CloudflareR2ValidationField, string>>>({});
    const [bootstrapFieldErrors, setBootstrapFieldErrors] = useState<Partial<Record<CloudflareR2BootstrapValidationField, string>>>({});
    const canRunRemoteAction = Boolean(status?.configured) && !isLoading && !isRemoteBusy && !isSaving && !isBootstrapping;

    useEffect(() => {
        let isMounted = true;

        async function loadCloudflareR2Settings() {
            try {
                const response = await fetch('/api/data/cloudflare-r2', {
                    credentials: 'include',
                    cache: 'no-store',
                });
                const payload = (await response.json().catch(() => null)) as CloudflareR2Response | null;

                if (!response.ok) {
                    throw new Error(payload?.message || 'Cloudflare R2 配置加载失败。');
                }

                if (isMounted) {
                    setPersistent(Boolean(payload?.persistent));
                    setForm(toCloudflareR2Form(payload?.settings));
                    setBootstrapForm(toCloudflareR2BootstrapForm(payload?.settings));
                    setHasSecretAccessKey(Boolean(payload?.settings?.hasSecretAccessKey));
                    setHasBackupEncryptionKey(Boolean(payload?.settings?.hasBackupEncryptionKey));
                    setStatus(payload?.status ?? null);
                }
            } catch (error) {
                console.error('Failed to load Cloudflare R2 settings:', error);
                if (isMounted) {
                    setMessage({
                        tone: 'danger',
                        text: error instanceof Error ? error.message : 'Cloudflare R2 配置加载失败。',
                    });
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadCloudflareR2Settings();

        return () => {
            isMounted = false;
        };
    }, []);

    const updateField = useCallback(
        <Key extends keyof CloudflareR2Form>(id: Key, value: CloudflareR2Form[Key]) => {
            setForm((current) => ({
                ...current,
                [id]: value,
            }));
            setFieldErrors((current) => {
                if (id === 'enabled' && value === false) {
                    return {};
                }

                if (!isCloudflareR2ValidationField(id) || !current[id]) {
                    return current;
                }

                const nextErrors = { ...current };
                delete nextErrors[id];
                return nextErrors;
            });
        },
        []
    );

    const updateBootstrapField = useCallback(
        <Key extends keyof CloudflareR2BootstrapForm>(id: Key, value: CloudflareR2BootstrapForm[Key]) => {
            setBootstrapForm((current) => ({
                ...current,
                [id]: value,
            }));
            setBootstrapFieldErrors((current) => {
                if (!(id in current)) {
                    return current;
                }

                const nextErrors = { ...current };
                delete nextErrors[id as CloudflareR2BootstrapValidationField];
                return nextErrors;
            });
        },
        []
    );

    const handleGenerateBackupEncryptionKey = useCallback(() => {
        updateField('backupEncryptionKey', createBackupEncryptionKey());
    }, [updateField]);

    const handleBootstrap = useCallback(async () => {
        const validationError = validateCloudflareR2BootstrapForm(bootstrapForm);

        if (validationError) {
            const field = validationError.field as CloudflareR2BootstrapValidationField;
            setBootstrapFieldErrors({ [field]: validationError.message });
            setMessage({ tone: 'danger', text: validationError.message });
            window.requestAnimationFrame(() => {
                document.getElementById(CLOUDFLARE_R2_BOOTSTRAP_FIELD_IDS[field])?.focus();
            });
            return;
        }

        setBootstrapFieldErrors({});
        setIsBootstrapping(true);
        setMessage({ tone: 'loading', text: '正在自动配置 Cloudflare R2...' });

        try {
            const response = await fetch('/api/data/cloudflare-r2/bootstrap', {
                method: 'POST',
                credentials: 'include',
                headers: createEditorCsrfHeaders({
                    'Content-Type': 'application/json',
                }),
                body: JSON.stringify({ bootstrap: bootstrapForm }),
            });
            const payload = (await response.json().catch(() => null)) as CloudflareR2Response | null;

            if (!response.ok) {
                throw new Error(payload?.message || 'Cloudflare R2 自动配置失败。');
            }

            setForm(toCloudflareR2Form(payload?.settings));
            setBootstrapForm({
                ...toCloudflareR2BootstrapForm(payload?.settings),
                authEmail: bootstrapForm.authEmail,
                globalApiKey: '',
            });
            setHasSecretAccessKey(Boolean(payload?.settings?.hasSecretAccessKey));
            setHasBackupEncryptionKey(Boolean(payload?.settings?.hasBackupEncryptionKey));
            setStatus(payload?.status ?? null);
            setMessage({ tone: 'success', text: 'Cloudflare R2 已自动配置完成。' });
        } catch (error) {
            console.error('Failed to bootstrap Cloudflare R2 settings:', error);
            setMessage({
                tone: 'danger',
                text: error instanceof Error ? error.message : 'Cloudflare R2 自动配置失败。',
            });
        } finally {
            setIsBootstrapping(false);
        }
    }, [bootstrapForm]);

    const handleSubmit = useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            const validationError = validateCloudflareR2Form(
                form,
                hasSecretAccessKey,
                hasBackupEncryptionKey,
                Boolean(status?.allowsPlaintextBackup)
            );

            if (validationError) {
                setFieldErrors({ [validationError.field]: validationError.message });
                setMessage({ tone: 'danger', text: validationError.message });
                window.requestAnimationFrame(() => {
                    document.getElementById(CLOUDFLARE_R2_FIELD_IDS[validationError.field])?.focus();
                });
                return;
            }

            setFieldErrors({});
            setIsSaving(true);
            setMessage({ tone: 'loading', text: '正在保存 Cloudflare R2 配置...' });

            try {
                const response = await fetch('/api/data/cloudflare-r2', {
                    method: 'PUT',
                    credentials: 'include',
                    headers: createEditorCsrfHeaders({
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify({ settings: form }),
                });
                const payload = (await response.json().catch(() => null)) as CloudflareR2Response | null;

                if (!response.ok) {
                    throw new Error(payload?.message || 'Cloudflare R2 配置保存失败。');
                }

                setForm(toCloudflareR2Form(payload?.settings));
                setHasSecretAccessKey(Boolean(payload?.settings?.hasSecretAccessKey));
                setHasBackupEncryptionKey(Boolean(payload?.settings?.hasBackupEncryptionKey));
                setStatus(payload?.status ?? null);
                setMessage({ tone: 'success', text: 'Cloudflare R2 配置已保存。' });
            } catch (error) {
                console.error('Failed to save Cloudflare R2 settings:', error);
                setMessage({
                    tone: 'danger',
                    text: error instanceof Error ? error.message : 'Cloudflare R2 配置保存失败。',
                });
            } finally {
                setIsSaving(false);
            }
        },
        [form, hasBackupEncryptionKey, hasSecretAccessKey, status?.allowsPlaintextBackup]
    );

    const handleRemoteAction = useCallback(async (action: 'sync' | 'restore') => {
        if (action === 'restore' && !window.confirm('将从 R2 最新备份覆盖当前服务器数据，确定继续吗？')) {
            return;
        }

        setIsRemoteBusy(true);
        setMessage({
            tone: 'loading',
            text: action === 'sync' ? '正在同步云端备份...' : '正在从云端恢复数据...',
        });

        try {
            const currentManifest = action === 'restore'
                ? await loadCurrentBackupManifest()
                : undefined;
            const response = await fetch(`/api/data/backup/remote/${action}`, {
                method: 'POST',
                credentials: 'include',
                headers: createEditorCsrfHeaders({
                    'Content-Type': 'application/json',
                }),
                body: JSON.stringify({ currentManifest }),
            });
            const payload = (await response.json().catch(() => null)) as RemoteBackupActionResponse | null;

            if (!response.ok) {
                throw new Error(payload?.message || (action === 'sync' ? '云端备份失败。' : '云端恢复失败。'));
            }

            setMessage(action === 'sync'
                ? {
                    tone: 'success',
                    text: '云端备份已同步。',
                }
                : createRestoreActionMessage(payload, '云端恢复成功，刷新页面后可见最新数据。'));
        } catch (error) {
            console.error('Failed to run Cloudflare R2 action:', error);
            setMessage({
                tone: 'danger',
                text: error instanceof Error ? error.message : 'Cloudflare R2 操作失败。',
            });
        } finally {
            setIsRemoteBusy(false);
        }
    }, []);

    return (
        <EditorPanel className="p-4 lg:col-span-2">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="rounded-token-card border border-accent-200 bg-accent-50 p-2 text-accent">
                            <Cloud className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-fg">Cloudflare R2</h2>
                            <p className="mt-1 text-sm leading-6 text-muted">
                                配置远端灾备镜像。密钥只保存在服务器运行数据目录，不会回显到页面。
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                        <EditorButton
                            type="button"
                            onClick={() => handleRemoteAction('sync')}
                            disabled={!canRunRemoteAction}
                            className="w-full sm:w-auto"
                        >
                            <CloudUpload className="h-4 w-4" />
                            同步云端
                        </EditorButton>
                        <EditorButton
                            type="button"
                            variant="danger"
                            onClick={() => handleRemoteAction('restore')}
                            disabled={!canRunRemoteAction}
                            className="w-full sm:w-auto"
                        >
                            <CloudDownload className="h-4 w-4" />
                            云端恢复
                        </EditorButton>
                    </div>
                </div>

                {message ? (
                    <div className="mb-4">
                        <StatusMessage tone={message.tone}>{message.text}</StatusMessage>
                    </div>
                ) : null}

                <div className="mb-4 grid grid-cols-2 gap-3 rounded-token-card border border-border-soft bg-background p-3 text-sm md:grid-cols-5">
                    <div>
                        <p className="font-mono text-xs text-subtle">status</p>
                        <p className="mt-1 text-muted">
                            {status?.configured ? '配置完整' : form.enabled ? '配置不完整' : '未启用'}
                        </p>
                    </div>
                    <div>
                        <p className="font-mono text-xs text-subtle">source</p>
                        <p className="mt-1 text-muted">
                            {status?.source === 'file' ? '设置页' : status?.source === 'env' ? '.env' : '默认值'}
                        </p>
                    </div>
                    <div>
                        <p className="font-mono text-xs text-subtle">bucket</p>
                        <p className="mt-1 break-all text-muted">{status?.bucket ?? '-'}</p>
                    </div>
                    <div>
                        <p className="font-mono text-xs text-subtle">secret</p>
                        <p className="mt-1 text-muted">{hasSecretAccessKey ? '已保存' : '未保存'}</p>
                    </div>
                    <div>
                        <p className="font-mono text-xs text-subtle">encryption</p>
                        <p className="mt-1 text-muted">{hasBackupEncryptionKey ? '已保存' : status?.allowsPlaintextBackup ? '明文模式' : '未保存'}</p>
                    </div>
                </div>

                <div className="mb-4 rounded-token-card border border-border-soft bg-background p-3 text-sm leading-6 text-muted">
                    <p className="font-medium text-fg">字段来源说明</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                        <li>去 Cloudflare 找：Account ID、Bucket、Access Key ID、Secret Access Key。</li>
                        <li>一键配置只会临时使用 Global API Key，最终只保存 bucket 专用 R2 凭证。</li>
                        <li>本站自定义：对象前缀、是否每次写入创建 snapshot；对象前缀可保留默认值。</li>
                        <li>通常留空：自定义 Endpoint。留空时系统会按 Account ID 自动生成 R2 endpoint。</li>
                        <li>运行时数据目录用于保存本页配置；手动配置可在本页生成 R2 备份加密密钥。</li>
                    </ul>
                </div>

                {status?.message ? (
                    <div className="mb-4">
                        <StatusMessage tone="info">{status.message}</StatusMessage>
                    </div>
                ) : null}

                <div className="grid gap-4">
                    <div className="grid gap-4 rounded-token-card border border-border-soft bg-background p-3">
                        <div>
                            <h3 className="text-sm font-semibold text-fg">一键配置</h3>
                            <p className="mt-1 text-xs leading-5 text-subtle">
                                Global API Key 不会写入服务器配置；配置完成后会自动生成备份加密密钥。
                            </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <TextField
                                id="r2-bootstrap-auth-email"
                                label="Cloudflare 邮箱"
                                help="用于本次 Cloudflare API 鉴权。"
                                value={bootstrapForm.authEmail}
                                error={bootstrapFieldErrors.authEmail}
                                onChange={(value) => updateBootstrapField('authEmail', value)}
                            />
                            <TextField
                                id="r2-bootstrap-global-api-key"
                                label="Global API Key"
                                help="只用于本次创建 bucket 和 R2 专用凭证，不会保存。"
                                value={bootstrapForm.globalApiKey}
                                type="password"
                                error={bootstrapFieldErrors.globalApiKey}
                                onChange={(value) => updateBootstrapField('globalApiKey', value)}
                            />
                            <TextField
                                id="r2-bootstrap-account-id"
                                label="Account ID"
                                help="Cloudflare 账号概览页中的 32 位 Account ID。"
                                value={bootstrapForm.accountId}
                                error={bootstrapFieldErrors.accountId}
                                onChange={(value) => updateBootstrapField('accountId', value)}
                            />
                            <TextField
                                id="r2-bootstrap-bucket"
                                label="Bucket"
                                help="不存在时会自动创建；存在时会复用。"
                                value={bootstrapForm.bucket}
                                error={bootstrapFieldErrors.bucket}
                                onChange={(value) => updateBootstrapField('bucket', value)}
                            />
                            <TextField
                                id="r2-bootstrap-prefix"
                                label="对象前缀"
                                help="可保留 blog-navigation。"
                                value={bootstrapForm.prefix}
                                onChange={(value) => updateBootstrapField('prefix', value)}
                            />
                            <label className="flex items-start gap-3 rounded-token-card border border-border-soft px-3 py-3 text-sm text-muted transition focus-within:border-link focus-within:ring-2 focus-within:ring-link/20">
                                <input
                                    type="checkbox"
                                    checked={bootstrapForm.snapshotOnWrite}
                                    onChange={(event) => updateBootstrapField('snapshotOnWrite', event.target.checked)}
                                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-border text-accent focus:ring-link"
                                />
                                <span>
                                    <span className="block font-medium text-fg">每次写入都创建 snapshot</span>
                                    关闭时仅手动同步和恢复会写入时间快照。
                                </span>
                            </label>
                        </div>
                        <div className="flex justify-end">
                            <EditorButton
                                type="button"
                                variant="primary"
                                disabled={!persistent || isLoading || isSaving || isRemoteBusy || isBootstrapping}
                                className="w-full sm:w-auto"
                                onClick={handleBootstrap}
                            >
                                <KeyRound className="h-4 w-4" />
                                {isBootstrapping ? '配置中...' : '一键配置 R2'}
                            </EditorButton>
                        </div>
                    </div>

                    <form
                        id="cloudflare-r2-form"
                        onSubmit={handleSubmit}
                        className="grid gap-4"
                    >
                        <label className="flex items-start gap-3 rounded-token-card border border-border-soft bg-background px-3 py-3 text-sm text-muted transition focus-within:border-link focus-within:ring-2 focus-within:ring-link/20">
                            <input
                                type="checkbox"
                                checked={form.enabled}
                                onChange={(event) => updateField('enabled', event.target.checked)}
                                className="mt-0.5 h-5 w-5 shrink-0 rounded border-border text-accent focus:ring-link"
                            />
                            <span>
                                <span className="block font-medium text-fg">启用 R2 远端备份</span>
                                保存文章、导航或站点设置后，会按当前配置同步 latest 备份。
                            </span>
                        </label>

                        <div className="grid gap-4 md:grid-cols-2">
                            <TextField
                                id="r2-account-id"
                                label="Account ID"
                                help="去 Cloudflare 账号概览页复制 Account ID；留空无法生成 R2 endpoint。"
                                value={form.accountId}
                                error={fieldErrors.accountId}
                                onChange={(value) => updateField('accountId', value)}
                            />
                            <TextField
                                id="r2-bucket"
                                label="Bucket"
                                help="去 Cloudflare R2 创建或选择 bucket，填写 bucket 名称。"
                                value={form.bucket}
                                error={fieldErrors.bucket}
                                onChange={(value) => updateField('bucket', value)}
                            />
                            <TextField
                                id="r2-access-key-id"
                                label="Access Key ID"
                                help="去 Cloudflare 创建 R2 API Token 后复制 Access Key ID。"
                                value={form.accessKeyId}
                                error={fieldErrors.accessKeyId}
                                onChange={(value) => updateField('accessKeyId', value)}
                            />
                            <TextField
                                id="r2-secret-access-key"
                                label="Secret Access Key"
                                help={hasSecretAccessKey ? '已保存 Secret；留空会继续使用已保存值。' : '去 Cloudflare 创建 R2 API Token 后复制 Secret Access Key，首次启用必填。'}
                                value={form.secretAccessKey}
                                type="password"
                                placeholder={hasSecretAccessKey ? '已保存，留空不变' : ''}
                                error={fieldErrors.secretAccessKey}
                                onChange={(value) => updateField('secretAccessKey', value)}
                            />
                            <div>
                                <label htmlFor="r2-backup-encryption-key" className="block text-sm font-medium text-fg">
                                    备份加密密钥
                                </label>
                                <div className="mt-2 flex gap-2">
                                    <input
                                        id="r2-backup-encryption-key"
                                        type="password"
                                        value={form.backupEncryptionKey}
                                        placeholder={hasBackupEncryptionKey ? '已保存，留空不变' : ''}
                                        onChange={(event) => updateField('backupEncryptionKey', event.target.value)}
                                        aria-invalid={Boolean(fieldErrors.backupEncryptionKey)}
                                        aria-describedby="r2-backup-encryption-key-description"
                                        className={editorInputClassName}
                                    />
                                    <EditorButton
                                        type="button"
                                        onClick={handleGenerateBackupEncryptionKey}
                                        disabled={isLoading || isSaving || isRemoteBusy || isBootstrapping}
                                        className="shrink-0"
                                    >
                                        生成
                                    </EditorButton>
                                </div>
                                <p
                                    id="r2-backup-encryption-key-description"
                                    className={`mt-1.5 text-xs leading-5 ${fieldErrors.backupEncryptionKey ? 'text-error-600' : 'text-subtle'}`}
                                    role={fieldErrors.backupEncryptionKey ? 'alert' : undefined}
                                >
                                    {fieldErrors.backupEncryptionKey || (hasBackupEncryptionKey
                                        ? '已保存加密密钥；留空会继续使用已保存值。'
                                        : '点击生成 32 字节 base64 密钥，或粘贴 32 字节 base64/hex 密钥。')}
                                </p>
                            </div>
                            <TextField
                                id="r2-prefix"
                                label="对象前缀"
                                help="本站自定义的 R2 目录前缀；可保留 blog-navigation，会写入 blog-navigation/latest/backup.json。"
                                value={form.prefix}
                                onChange={(value) => updateField('prefix', value)}
                            />
                            <TextField
                                id="r2-endpoint"
                                label="自定义 Endpoint"
                                help="通常留空；系统会按 Account ID 自动生成 Cloudflare R2 endpoint。"
                                value={form.endpoint}
                                onChange={(value) => updateField('endpoint', value)}
                            />
                        </div>

                        <label className="flex items-start gap-3 rounded-token-card border border-border-soft bg-background px-3 py-3 text-sm text-muted transition focus-within:border-link focus-within:ring-2 focus-within:ring-link/20">
                            <input
                                type="checkbox"
                                checked={form.snapshotOnWrite}
                                onChange={(event) => updateField('snapshotOnWrite', event.target.checked)}
                                className="mt-0.5 h-5 w-5 shrink-0 rounded border-border text-accent focus:ring-link"
                            />
                            <span>
                                <span className="block font-medium text-fg">每次写入都创建 snapshot</span>
                                关闭时仅手动同步和恢复会写入时间快照，日常保存只更新 latest。
                            </span>
                        </label>

                        {!persistent ? (
                            <StatusMessage tone="info" className="px-3 py-2">
                                运行时数据目录不可用，R2 配置无法保存到服务器。
                            </StatusMessage>
                        ) : null}

                        <div className="flex justify-end">
                            <EditorButton
                                type="submit"
                                variant="primary"
                                disabled={!persistent || isLoading || isSaving || isRemoteBusy || isBootstrapping}
                                className="w-full sm:w-auto"
                            >
                                <Save className="h-4 w-4" />
                                {isSaving ? '保存中...' : '保存 R2 配置'}
                            </EditorButton>
                        </div>
                    </form>
                </div>
            </EditorPanel>
    );
}

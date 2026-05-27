'use client';

import { useCallback, useEffect, useState } from 'react';
import { Cloud, CloudDownload, CloudUpload, Save } from 'lucide-react';
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
    source: 'file' | 'env' | 'default';
    message: string | null;
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

type CloudflareR2Form = Omit<CloudflareR2Settings, 'hasSecretAccessKey' | 'hasAccessKeyId'> & {
    accessKeyId: string;
    secretAccessKey: string;
};

type CloudflareMessage = {
    tone: 'success' | 'warning' | 'danger' | 'loading' | 'info';
    text: string;
};

type CloudflareR2ValidationField = 'accountId' | 'bucket' | 'accessKeyId' | 'secretAccessKey';

type CloudflareR2ValidationError = {
    field: CloudflareR2ValidationField;
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
        prefix: 'blog-navigation',
        endpoint: '',
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
        prefix: settings?.prefix ?? 'blog-navigation',
        endpoint: settings?.endpoint ?? '',
        snapshotOnWrite: Boolean(settings?.snapshotOnWrite),
    };
}

function validateCloudflareR2Form(
    form: CloudflareR2Form,
    hasSecretAccessKey: boolean
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

    return null;
}

const CLOUDFLARE_R2_FIELD_IDS: Record<CloudflareR2ValidationField, string> = {
    accountId: 'r2-account-id',
    bucket: 'r2-bucket',
    accessKeyId: 'r2-access-key-id',
    secretAccessKey: 'r2-secret-access-key',
};

function isCloudflareR2ValidationField(id: keyof CloudflareR2Form): id is CloudflareR2ValidationField {
    return id === 'accountId' || id === 'bucket' || id === 'accessKeyId' || id === 'secretAccessKey';
}

export function CloudflareR2SettingsPanel() {
    const [form, setForm] = useState<CloudflareR2Form>(createEmptyCloudflareR2Form);
    const [status, setStatus] = useState<CloudflareR2Status | null>(null);
    const [hasSecretAccessKey, setHasSecretAccessKey] = useState(false);
    const [persistent, setPersistent] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isRemoteBusy, setIsRemoteBusy] = useState(false);
    const [message, setMessage] = useState<CloudflareMessage | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<CloudflareR2ValidationField, string>>>({});
    const canRunRemoteAction = Boolean(status?.configured) && !isLoading && !isRemoteBusy && !isSaving;

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
                    setHasSecretAccessKey(Boolean(payload?.settings?.hasSecretAccessKey));
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

    const handleSubmit = useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            const validationError = validateCloudflareR2Form(form, hasSecretAccessKey);

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
        [form, hasSecretAccessKey]
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
        <form
            id="cloudflare-r2-form"
            onSubmit={handleSubmit}
            className="lg:col-span-2"
        >
            <EditorPanel className="p-4">
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

                <div className="mb-4 grid grid-cols-2 gap-3 rounded-token-card border border-border-soft bg-background p-3 text-sm md:grid-cols-4">
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
                </div>

                {status?.message ? (
                    <div className="mb-4">
                        <StatusMessage tone="info">{status.message}</StatusMessage>
                    </div>
                ) : null}

                <div className="grid gap-4">
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
                            help="Cloudflare 账户 ID，用于生成默认 R2 endpoint。"
                            value={form.accountId}
                            error={fieldErrors.accountId}
                            onChange={(value) => updateField('accountId', value)}
                        />
                        <TextField
                            id="r2-bucket"
                            label="Bucket"
                            help="保存 backup.json 和 snapshots 的 R2 bucket。"
                            value={form.bucket}
                            error={fieldErrors.bucket}
                            onChange={(value) => updateField('bucket', value)}
                        />
                        <TextField
                            id="r2-access-key-id"
                            label="Access Key ID"
                            help="R2 S3 API Token 的 Access Key ID。"
                            value={form.accessKeyId}
                            error={fieldErrors.accessKeyId}
                            onChange={(value) => updateField('accessKeyId', value)}
                        />
                        <TextField
                            id="r2-secret-access-key"
                            label="Secret Access Key"
                            help={hasSecretAccessKey ? '留空会保留已保存的 Secret。' : '首次启用时必须填写。'}
                            value={form.secretAccessKey}
                            type="password"
                            placeholder={hasSecretAccessKey ? '已保存，留空不变' : ''}
                            error={fieldErrors.secretAccessKey}
                            onChange={(value) => updateField('secretAccessKey', value)}
                        />
                        <TextField
                            id="r2-prefix"
                            label="对象前缀"
                            help="例如 blog-navigation，会写入 prefix/latest/backup.json。"
                            value={form.prefix}
                            onChange={(value) => updateField('prefix', value)}
                        />
                        <TextField
                            id="r2-endpoint"
                            label="自定义 Endpoint"
                            help="一般留空；需要 S3 兼容服务或自定义 R2 endpoint 时再填写。"
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
                            未配置 BLOG_DATA_ROOT，R2 配置无法保存到服务器。
                        </StatusMessage>
                    ) : null}

                    <div className="flex justify-end">
                        <EditorButton
                            type="submit"
                            variant="primary"
                            disabled={!persistent || isLoading || isSaving || isRemoteBusy}
                            className="w-full sm:w-auto"
                        >
                            <Save className="h-4 w-4" />
                            {isSaving ? '保存中...' : '保存 R2 配置'}
                        </EditorButton>
                    </div>
                </div>
            </EditorPanel>
        </form>
    );
}

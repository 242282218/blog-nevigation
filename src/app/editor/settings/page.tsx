'use client';

import { useCallback, useEffect, useState } from 'react';
import { Info, Save, Settings } from 'lucide-react';
import { StatusMessage } from '@/app/components/ui';
import {
    createDefaultSiteSettings,
    type SiteSettings,
} from '@/lib/site-settings';
import { CloudflareR2SettingsPanel } from './CloudflareR2SettingsPanel';
import { LogoutButton } from '../components/LogoutButton';
import {
    EditorButton,
    EditorMain,
    EditorPage,
    EditorPanel,
    EditorTopBar,
    editorInputClassName,
} from '../components/EditorShell';

type SettingsMessage = {
    tone: 'success' | 'danger' | 'loading' | 'info';
    text: string;
};

type SettingsResponse = {
    persistent?: boolean;
    settings?: SiteSettings;
    revision?: string | null;
    message?: string;
};

interface FieldProps {
    id: keyof SiteSettings;
    label: string;
    help: string;
    value: string;
    onChange: (id: keyof SiteSettings, value: string) => void;
    multiline?: boolean;
}

function SettingsField({
    id,
    label,
    help,
    value,
    onChange,
    multiline = false,
}: FieldProps) {
    const inputId = `settings-${id}`;

    return (
        <div>
            <label htmlFor={inputId} className="block text-sm font-medium text-fg">
                {label}
            </label>
            {multiline ? (
                <textarea
                    id={inputId}
                    value={value}
                    onChange={(event) => onChange(id, event.target.value)}
                    rows={4}
                    className={`${editorInputClassName} mt-2 resize-y leading-6`}
                />
            ) : (
                <input
                    id={inputId}
                    type="text"
                    value={value}
                    onChange={(event) => onChange(id, event.target.value)}
                    className={`${editorInputClassName} mt-2`}
                />
            )}
            <p className="mt-1.5 text-xs leading-5 text-subtle">{help}</p>
        </div>
    );
}

function validateSettings(settings: SiteSettings): string | null {
    const entries: Array<[keyof SiteSettings, string]> = [
        ['siteName', '站点名称'],
        ['siteDescription', '站点描述'],
        ['workspaceLabel', '工作台标签'],
        ['heroTitleLineOne', '首页标题第一行'],
        ['heroTitleLineTwo', '首页标题第二行'],
        ['heroDescription', '首页描述'],
    ];

    for (const [key, label] of entries) {
        if (!settings[key].trim()) {
            return `请填写${label}。`;
        }
    }

    return null;
}

function trimSettings(settings: SiteSettings): SiteSettings {
    return {
        siteName: settings.siteName.trim(),
        siteDescription: settings.siteDescription.trim(),
        workspaceLabel: settings.workspaceLabel.trim(),
        heroTitleLineOne: settings.heroTitleLineOne.trim(),
        heroTitleLineTwo: settings.heroTitleLineTwo.trim(),
        heroDescription: settings.heroDescription.trim(),
    };
}

export default function EditorSettingsPage() {
    const [settings, setSettings] = useState<SiteSettings>(createDefaultSiteSettings);
    const [persistent, setPersistent] = useState(false);
    const [revision, setRevision] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<SettingsMessage | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function loadSettings() {
            try {
                const response = await fetch('/api/data/settings', {
                    credentials: 'include',
                    cache: 'no-store',
                });
                const payload = (await response.json().catch(() => null)) as SettingsResponse | null;

                if (!response.ok) {
                    throw new Error(payload?.message || '站点设置加载失败。');
                }

                if (isMounted) {
                    setSettings(payload?.settings ?? createDefaultSiteSettings());
                    setPersistent(Boolean(payload?.persistent));
                    setRevision(typeof payload?.revision === 'string' ? payload.revision : null);
                }
            } catch (error) {
                console.error('Failed to load site settings:', error);
                if (isMounted) {
                    setMessage({
                        tone: 'danger',
                        text: error instanceof Error ? error.message : '站点设置加载失败。',
                    });
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadSettings();

        return () => {
            isMounted = false;
        };
    }, []);

    const updateField = useCallback((id: keyof SiteSettings, value: string) => {
        setSettings((current) => ({
            ...current,
            [id]: value,
        }));
    }, []);

    const handleSubmit = useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            const validationError = validateSettings(settings);

            if (validationError) {
                setMessage({ tone: 'danger', text: validationError });
                return;
            }

            if (!persistent) {
                setMessage({ tone: 'danger', text: '未配置 BLOG_DATA_ROOT，站点设置无法保存到服务器。' });
                return;
            }

            setIsSaving(true);
            setMessage({ tone: 'loading', text: '正在保存站点设置...' });

            try {
                const nextSettings = trimSettings(settings);
                const response = await fetch('/api/data/settings', {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ settings: nextSettings, revision }),
                });
                const payload = (await response.json().catch(() => null)) as SettingsResponse | null;

                if (response.status === 409 && payload?.settings) {
                    setSettings(payload.settings);
                    setRevision(typeof payload.revision === 'string' ? payload.revision : null);
                    throw new Error(payload.message || '站点设置已被其他会话更新，请确认后再保存。');
                }

                if (!response.ok) {
                    throw new Error(payload?.message || '站点设置保存失败。');
                }

                setSettings(payload?.settings ?? nextSettings);
                setRevision(typeof payload?.revision === 'string' ? payload.revision : revision);
                setMessage({ tone: 'success', text: '站点设置已保存，刷新公开页面后生效。' });
            } catch (error) {
                console.error('Failed to save site settings:', error);
                setMessage({
                    tone: 'danger',
                    text: error instanceof Error ? error.message : '站点设置保存失败。',
                });
            } finally {
                setIsSaving(false);
            }
        },
        [persistent, revision, settings]
    );

    return (
        <EditorPage className="pb-20">
            <EditorTopBar
                title="站点设置"
                description="管理公开站点名称、描述和首页首屏文案"
                eyebrow="editor.settings"
                backHref="/editor"
                actions={(
                    <>
                        <LogoutButton />
                        <EditorButton
                            type="submit"
                            form="site-settings-form"
                            variant="primary"
                            disabled={!persistent || isLoading || isSaving}
                        >
                            <Save className="h-4 w-4" />
                            {isSaving ? '保存中...' : '保存设置'}
                        </EditorButton>
                    </>
                )}
            />

            <EditorMain width="lg" className="space-y-6">
                {message ? (
                    <StatusMessage tone={message.tone}>
                        {message.text}
                    </StatusMessage>
                ) : null}

                {isLoading ? (
                    <EditorPanel className="p-6">
                        <div className="animate-pulse text-sm text-subtle">加载站点设置...</div>
                    </EditorPanel>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <form id="site-settings-form" onSubmit={handleSubmit} className="space-y-6">
                            <EditorPanel className="p-6">
                                <div className="mb-6 flex items-start gap-3">
                                    <div className="rounded-token-card border border-accent-200 bg-accent-50 p-2 text-accent">
                                        <Settings className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-fg">公开站点信息</h2>
                                        <p className="mt-1 text-sm leading-6 text-muted">
                                            这些内容会影响浏览器标题、站点描述和首页首屏文案。
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-5">
                                    <SettingsField
                                        id="siteName"
                                        label="站点名称"
                                        help="用于浏览器标题和后台识别。"
                                        value={settings.siteName}
                                        onChange={updateField}
                                    />
                                    <SettingsField
                                        id="siteDescription"
                                        label="站点描述"
                                        help="用于浏览器元信息和站点摘要。"
                                        value={settings.siteDescription}
                                        onChange={updateField}
                                        multiline
                                    />
                                    <SettingsField
                                        id="workspaceLabel"
                                        label="工作台标签"
                                        help="显示在首页首屏的小型标识文字。"
                                        value={settings.workspaceLabel}
                                        onChange={updateField}
                                    />
                                    <div className="grid gap-5 md:grid-cols-2">
                                        <SettingsField
                                            id="heroTitleLineOne"
                                            label="首页标题第一行"
                                            help="建议短句，避免换行拥挤。"
                                            value={settings.heroTitleLineOne}
                                            onChange={updateField}
                                        />
                                        <SettingsField
                                            id="heroTitleLineTwo"
                                            label="首页标题第二行"
                                            help="和第一行组成首页主标题。"
                                            value={settings.heroTitleLineTwo}
                                            onChange={updateField}
                                        />
                                    </div>
                                    <SettingsField
                                        id="heroDescription"
                                        label="首页描述"
                                        help="显示在首页标题下方，说明站点用途。"
                                        value={settings.heroDescription}
                                        onChange={updateField}
                                        multiline
                                    />
                                </div>
                            </EditorPanel>
                        </form>

                        <aside className="space-y-6">
                            <EditorPanel className="p-5">
                                <div className="flex items-center gap-2 text-sm font-medium text-fg">
                                    <Info className="h-4 w-4 text-accent" />
                                    运行时存储
                                </div>
                                <dl className="mt-4 space-y-3 text-sm">
                                    <div>
                                        <dt className="font-mono text-xs text-subtle">status</dt>
                                        <dd className="mt-1 text-muted">
                                            {persistent ? '已启用 BLOG_DATA_ROOT' : '未配置持久化目录'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="font-mono text-xs text-subtle">path</dt>
                                        <dd className="mt-1 break-all rounded-token-card border border-border-soft bg-surface px-2 py-1.5 font-mono text-xs text-muted">
                                            data/settings/site.json
                                        </dd>
                                    </div>
                                </dl>
                            </EditorPanel>

                            <EditorPanel className="p-5">
                                <p className="font-mono text-xs text-accent">backup scope</p>
                                <h2 className="mt-1 text-base font-semibold text-fg">备份会包含设置</h2>
                                <p className="mt-2 text-sm leading-6 text-muted">
                                    编辑中心导出的 JSON 备份会包含文章、导航和站点设置。旧备份没有设置字段时，会恢复为默认设置。
                                </p>
                            </EditorPanel>
                        </aside>

                        <CloudflareR2SettingsPanel />
                    </div>
                )}
            </EditorMain>
        </EditorPage>
    );
}

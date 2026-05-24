'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, LogIn } from 'lucide-react';
import { StatusMessage } from '@/app/components/ui';
import {
    EditorButton,
    EditorPage,
    EditorPanel,
    editorInputClassName,
} from '../components/EditorShell';

interface EditorLoginFormProps {
    authConfigured: boolean;
    nextPath: string;
}

export function EditorLoginForm({
    authConfigured,
    nextPath,
}: EditorLoginFormProps) {
    const router = useRouter();
    const [secret, setSecret] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!authConfigured || !secret.trim()) {
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const response = await fetch('/api/editor-auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ secret }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.message ?? '登录失败，请稍后重试。');
            }

            router.replace(nextPath);
            router.refresh();
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : '登录失败，请稍后重试。'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <EditorPage className="flex items-center justify-center px-4 py-8">
            <EditorPanel className="w-full max-w-md p-6 sm:p-8">
                <div className="flex items-center gap-3 text-fg">
                    <div className="flex h-11 w-11 items-center justify-center rounded-token-card border border-accent-200 bg-accent-50 text-accent">
                        <Lock className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold">编辑区登录</h1>
                        <p className="mt-1 text-sm text-muted">
                            通过服务端校验后才可进入 `/editor/*`
                        </p>
                    </div>
                </div>

                <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="editor-login-secret" className="mb-2 block text-sm font-medium text-fg">
                            编辑口令
                        </label>
                        <input
                            id="editor-login-secret"
                            type="password"
                            value={secret}
                            onChange={(event) => setSecret(event.target.value)}
                            disabled={!authConfigured || isSubmitting}
                            autoComplete="current-password"
                            aria-describedby={errorMessage ? 'editor-login-error' : undefined}
                            aria-invalid={Boolean(errorMessage)}
                            className={`${editorInputClassName} px-4 py-3`}
                            placeholder="输入 EDITOR_ACCESS_TOKEN"
                        />
                    </div>

                    {!authConfigured && (
                        <StatusMessage tone="warning">
                            当前环境未配置 `EDITOR_ACCESS_TOKEN`，因此编辑区登录已禁用。
                        </StatusMessage>
                    )}

                    {errorMessage && (
                        <StatusMessage id="editor-login-error" tone="danger">
                            {errorMessage}
                        </StatusMessage>
                    )}

                    <EditorButton
                        type="submit"
                        disabled={!authConfigured || isSubmitting || !secret.trim()}
                        className="w-full py-3"
                        variant="primary"
                    >
                        <LogIn className="h-4 w-4" />
                        <span>{isSubmitting ? '登录中...' : '进入编辑区'}</span>
                    </EditorButton>
                </form>

                <div className="mt-6 text-sm text-muted">
                    <Link href="/" className="text-fg underline underline-offset-4">
                        返回首页
                    </Link>
                </div>
            </EditorPanel>
        </EditorPage>
    );
}

'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, LogIn } from 'lucide-react';

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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-3 text-gray-900">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                        <Lock className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold">编辑区登录</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            通过服务端校验后才可进入 `/editor/*`
                        </p>
                    </div>
                </div>

                <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-gray-700">
                            编辑口令
                        </span>
                        <input
                            type="password"
                            value={secret}
                            onChange={(event) => setSecret(event.target.value)}
                            disabled={!authConfigured || isSubmitting}
                            autoComplete="current-password"
                            className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-gray-400"
                            placeholder="输入 EDITOR_ACCESS_TOKEN"
                        />
                    </label>

                    {!authConfigured && (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                            当前环境未配置 `EDITOR_ACCESS_TOKEN`，因此编辑区登录已禁用。
                        </p>
                    )}

                    {errorMessage && (
                        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {errorMessage}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={!authConfigured || isSubmitting || !secret.trim()}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                        <LogIn className="h-4 w-4" />
                        <span>{isSubmitting ? '登录中...' : '进入编辑区'}</span>
                    </button>
                </form>

                <div className="mt-6 text-sm text-gray-500">
                    <Link href="/" className="text-gray-700 underline underline-offset-4">
                        返回首页
                    </Link>
                </div>
            </div>
        </div>
    );
}

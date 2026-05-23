'use client';

import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type EditorWidth = 'md' | 'lg' | 'xl';
type EditorButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger';

const widthClass: Record<EditorWidth, string> = {
    md: 'max-w-5xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
};

const buttonVariantClass: Record<EditorButtonVariant, string> = {
    primary: 'border-fg bg-fg text-surface hover:bg-fg',
    secondary: 'border-border bg-surface text-fg hover:border-border hover:bg-surface',
    ghost: 'border-transparent bg-transparent text-muted hover:bg-surface hover:text-fg',
    accent: 'border-accent-200 bg-accent-50 text-accent-700 hover:bg-accent-100',
    danger: 'border-error-light bg-error-50 text-error-600 hover:bg-error-light',
};

interface EditorPageProps {
    children: ReactNode;
    className?: string;
}

interface EditorTopBarProps {
    title: string;
    description?: string;
    eyebrow?: string;
    backHref?: string;
    actions?: ReactNode;
    width?: EditorWidth;
}

interface EditorMainProps {
    children: ReactNode;
    width?: EditorWidth;
    className?: string;
}

interface EditorPanelProps {
    children: ReactNode;
    className?: string;
}

interface EditorActionCardProps {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    action: string;
}

interface EditorLinkButtonProps {
    href: string;
    children: ReactNode;
    variant?: EditorButtonVariant;
    className?: string;
    ariaLabel?: string;
}

interface EditorButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: EditorButtonVariant;
}

export const editorInputClassName =
    'w-full rounded-token-card border border-border bg-surface px-3 py-2 text-sm text-fg outline-none transition focus:border-link focus:ring-2 focus:ring-link/20';

export function EditorPage({ children, className }: EditorPageProps) {
    return (
        <div className={cn('min-h-screen bg-background text-fg', className)}>
            {children}
        </div>
    );
}

export function EditorTopBar({
    title,
    description,
    eyebrow = 'editor',
    backHref,
    actions,
    width = 'md',
}: EditorTopBarProps) {
    return (
        <header className="sticky top-0 z-50 border-b border-border bg-background/90 shadow-header backdrop-blur-xl">
            <div className={cn('mx-auto flex min-h-16 flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between', widthClass[width])}>
                <div className="flex min-w-0 items-center gap-3 md:flex-1">
                    {backHref ? (
                        <Link
                            href={backHref}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-token-card border border-border bg-surface text-muted transition hover:border-border hover:bg-surface hover:text-fg focus:ring-2 focus:ring-link focus:ring-offset-2"
                            aria-label="返回"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    ) : null}
                    <div className="min-w-0">
                        <p className="font-mono text-xs text-accent">{eyebrow}</p>
                        <h1 className="truncate text-xl font-semibold text-fg">{title}</h1>
                        {description ? (
                            <p className="mt-0.5 truncate text-sm text-muted">{description}</p>
                        ) : null}
                    </div>
                </div>
                {actions ? (
                    <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:shrink-0 md:justify-end">
                        {actions}
                    </div>
                ) : null}
            </div>
        </header>
    );
}

export function EditorMain({ children, width = 'md', className }: EditorMainProps) {
    return (
        <div className={cn('mx-auto px-4 py-8 sm:px-6', widthClass[width], className)}>
            {children}
        </div>
    );
}

export function EditorPanel({ children, className }: EditorPanelProps) {
    return (
        <section className={cn('rounded-token-card border border-border bg-surface shadow-token-card', className)}>
            {children}
        </section>
    );
}

export function EditorButton({
    children,
    variant = 'secondary',
    className,
    type = 'button',
    ...props
}: EditorButtonProps) {
    return (
        <button
            type={type}
            className={cn(
                'inline-flex min-h-10 items-center justify-center gap-2 rounded-token-card border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 focus:ring-2 focus:ring-link focus:ring-offset-2',
                buttonVariantClass[variant],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}

export function EditorLinkButton({
    href,
    children,
    variant = 'secondary',
    className,
    ariaLabel,
}: EditorLinkButtonProps) {
    return (
        <Link
            href={href}
            aria-label={ariaLabel}
            className={cn(
                'inline-flex min-h-10 items-center justify-center gap-2 rounded-token-card border px-3 py-2 text-sm font-medium transition focus:ring-2 focus:ring-link focus:ring-offset-2',
                buttonVariantClass[variant],
                className
            )}
        >
            {children}
        </Link>
    );
}

export function EditorActionCard({
    title,
    description,
    href,
    icon: Icon,
    action,
}: EditorActionCardProps) {
    return (
        <Link
            href={href}
            className="group block rounded-token-card border border-border bg-surface p-6 shadow-token-card transition hover:border-accent-300 hover:shadow-token-card-hover focus:ring-2 focus:ring-link focus:ring-offset-2"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="rounded-lg border border-accent-200 bg-accent-50 p-3 text-accent">
                    <Icon className="h-6 w-6" />
                </div>
                <span className="font-mono text-xs text-subtle transition group-hover:text-accent">
                    open
                </span>
            </div>
            <h2 className="mt-6 text-xl font-semibold text-fg transition-colors group-hover:text-accent">
                {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
            <div className="mt-5 text-sm font-medium text-accent">{action}</div>
        </Link>
    );
}

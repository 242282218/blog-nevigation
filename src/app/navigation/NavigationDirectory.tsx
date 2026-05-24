'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Layers, Search, X } from 'lucide-react';
import { CategoryCard } from '@/app/components/navigation';
import { EmptyState } from '@/app/components/ui';
import type { Category } from '@/app/types/navigation';

interface NavigationDirectoryProps {
    categories: Category[];
}

function includesQuery(parts: string[], query: string): boolean {
    return parts.join('\n').toLowerCase().includes(query);
}

export function NavigationDirectory({ categories }: NavigationDirectoryProps) {
    const [activeSlug, setActiveSlug] = useState('all');
    const [query, setQuery] = useState('');
    const normalizedQuery = query.trim().toLowerCase();
    const activeCategory = categories.find((category) => category.slug === activeSlug);
    const filteredCategories = useMemo(() => {
        return categories
            .filter((category) => activeSlug === 'all' || category.slug === activeSlug)
            .map((category) => ({
                ...category,
                tools: normalizedQuery
                    ? category.tools.filter((tool) =>
                        includesQuery(
                            [category.name, tool.title, tool.description, tool.url, ...tool.tags],
                            normalizedQuery
                        )
                    )
                    : category.tools,
            }))
            .filter((category) => category.tools.length > 0 || !normalizedQuery);
    }, [activeSlug, categories, normalizedQuery]);
    const visibleToolCount = filteredCategories.reduce((total, category) => total + category.tools.length, 0);
    const totalToolCount = categories.reduce((total, category) => total + category.tools.length, 0);

    return (
        <div className="space-y-10">
            <section className="rounded-token-card border border-border bg-surface-elevated p-4 md:p-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px] lg:items-stretch">
                    <div className="rounded-token-card border border-border-soft bg-bg p-3">
                        <div className="mb-3 flex items-center justify-between gap-3 px-1">
                            <div>
                                <p className="font-mono text-xs uppercase tracking-token-caps text-accent">Find a resource</p>
                                <p className="mt-1 text-sm text-muted">
                                    搜索会同时匹配标题、简介、标签和域名。
                                </p>
                            </div>
                            <span className="hidden rounded-token-full bg-accent-50 px-2.5 py-1 font-mono text-xs text-accent sm:inline-flex">
                                live filter
                            </span>
                        </div>
                        <label className="flex min-h-[52px] items-center gap-3 rounded-token-input border border-border bg-surface-elevated px-4 py-3 transition-colors duration-token-fast focus-within:border-link focus-within:bg-white">
                            <Search className="h-5 w-5 text-accent" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="搜索工具、标签或域名"
                                className="min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-subtle"
                            />
                            {query ? (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    className="rounded-token-full p-2 text-subtle transition-colors duration-token-fast hover:bg-warm-100 hover:text-fg"
                                    aria-label="清空搜索"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            ) : null}
                        </label>
                    </div>

                    <div className="flex flex-col justify-between rounded-token-card border border-warm-700 bg-warm-900 p-5 text-white">
                        <div className="flex items-center justify-between gap-3">
                            <Layers className="h-5 w-5 text-accent-200" />
                            <span className="font-mono text-xs text-white/55" aria-live="polite">
                                {visibleToolCount}/{totalToolCount}
                            </span>
                        </div>
                        <div className="mt-6">
                            <p className="font-serif text-3xl leading-none">{visibleToolCount}</p>
                            <p className="mt-2 text-sm leading-relaxed text-white/68">
                                {activeCategory ? activeCategory.name : '全部分类'}中可见链接
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="导航分类">
                    <button
                        type="button"
                        onClick={() => setActiveSlug('all')}
                        aria-pressed={activeSlug === 'all'}
                        className={activeSlug === 'all'
                            ? 'min-h-10 shrink-0 rounded-token-full bg-fg px-4 py-2 text-sm font-medium text-surface shadow-token-md'
                            : 'min-h-10 shrink-0 rounded-token-full border border-border bg-surface px-4 py-2 text-sm font-medium text-muted transition-colors duration-token-fast hover:border-accent-200 hover:text-fg'}
                    >
                        全部
                    </button>
                    {categories.map((category) => (
                        <button
                            key={category.slug}
                            type="button"
                            onClick={() => setActiveSlug(category.slug)}
                            aria-pressed={activeSlug === category.slug}
                            className={activeSlug === category.slug
                                ? 'min-h-10 shrink-0 rounded-token-full bg-fg px-4 py-2 text-sm font-medium text-surface shadow-token-md'
                                : 'min-h-10 shrink-0 rounded-token-full border border-border bg-surface px-4 py-2 text-sm font-medium text-muted transition-colors duration-token-fast hover:border-accent-200 hover:text-fg'}
                        >
                            {category.name}
                            <span className="ml-2 font-mono text-xs opacity-60">{category.tools.length}</span>
                        </button>
                    ))}
                </div>
            </section>

            {filteredCategories.length === 0 || visibleToolCount === 0 ? (
                <EmptyState
                    title="没有匹配的链接"
                    description="换一个关键词，或切换到全部分类再试。"
                />
            ) : (
                <div className="space-y-12">
                    {filteredCategories.map((category, categoryIndex) => (
                        <section
                            key={category.slug}
                            className="scroll-mt-24"
                        >
                            <div className="mb-5 grid gap-4 border-b border-border/70 pb-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                                <div>
                                    <p className="font-mono text-xs tracking-token-caps text-accent uppercase">
                                        0{categoryIndex + 1} / {category.slug}
                                    </p>
                                    <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-token-normal text-fg md:text-3xl">
                                        {category.name}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2 rounded-token-full border border-border-soft bg-surface/70 px-3 py-2 font-mono text-xs text-subtle">
                                    {category.tools.length} links
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {category.tools.map((tool) => (
                                    <a
                                        key={`${category.slug}-${tool.title}-${tool.url}`}
                                        href={tool.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block h-full rounded-token-card focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2"
                                        aria-label={`打开 ${tool.title}`}
                                    >
                                        <CategoryCard
                                            title={tool.title}
                                            description={tool.description}
                                            url={tool.url}
                                            tags={tool.tags}
                                        />
                                    </a>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}

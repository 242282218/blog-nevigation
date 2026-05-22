'use client';

import { useMemo, useState } from 'react';
import { Layers, Search, X } from 'lucide-react';
import { CategoryCard } from '@/app/components/navigation';
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

    return (
        <div className="space-y-8">
            <section className="rounded-lg border border-gray-200 bg-white/90 p-4 shadow-token-card md:p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <label className="flex min-h-[44px] items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-link focus-within:bg-white">
                        <Search className="h-4 w-4 text-accent" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="搜索工具、标签或域名"
                            className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                        />
                        {query ? (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                                aria-label="清空搜索"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        ) : null}
                    </label>

                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-500">
                        <Layers className="h-4 w-4 text-accent" />
                        {visibleToolCount} links
                    </div>
                </div>

                <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="导航分类">
                    <button
                        type="button"
                        onClick={() => setActiveSlug('all')}
                        aria-pressed={activeSlug === 'all'}
                        className={activeSlug === 'all'
                            ? 'min-h-9 shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white'
                            : 'min-h-9 shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900'}
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
                                ? 'min-h-9 shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white'
                                : 'min-h-9 shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900'}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
            </section>

            {filteredCategories.length === 0 || visibleToolCount === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-white/80 px-6 py-16 text-center text-sm text-gray-500">
                    没有匹配的链接。
                </div>
            ) : (
                <div className="space-y-8">
                    {filteredCategories.map((category) => (
                        <section
                            key={category.slug}
                            className="rounded-lg border border-gray-200 bg-white/90 p-5 shadow-token-card md:p-6"
                        >
                            <div className="mb-5 flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
                                <div>
                                    <p className="font-mono text-xs text-accent">{category.slug}</p>
                                    <h2 className="mt-1 text-2xl font-semibold text-gray-900">{category.name}</h2>
                                </div>
                                <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-xs text-gray-500">
                                    {category.tools.length}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {category.tools.map((tool) => (
                                    <a
                                        key={`${category.slug}-${tool.title}-${tool.url}`}
                                        href={tool.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block h-full rounded-lg focus:outline-none focus:ring-2 focus:ring-link focus:ring-offset-2"
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

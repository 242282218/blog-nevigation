'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Compass, FileText, Lock, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const ADMIN_SHORTCUT = ':admin';

interface SearchResult {
    type: 'post' | 'tool';
    title: string;
    slug: string;
    href: string;
    description?: string;
    meta?: string;
    external?: boolean;
    tags?: string[];
}

interface CommandInputProps {
    compact?: boolean;
    className?: string;
}

const placeholders = [
    '搜索 React 优化...',
    '搜索 Next.js...',
    '搜索 TypeScript...',
    '搜索 MDN...',
    '搜索 GitHub...',
    '输入 :admin...',
];

function SearchResultItem({
    result,
    onSelect,
}: {
    result: SearchResult;
    onSelect: () => void;
}) {
    const label = result.type === 'post' ? '文章' : '链接';
    const content = (
        <>
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-sm font-medium text-gray-800 transition-colors group-hover:text-accent">
                    {result.title}
                </div>
                <span className="shrink-0 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-mono text-gray-400">
                    {label}
                </span>
            </div>
            {result.description && (
                <div className="mt-1 line-clamp-1 text-xs text-gray-500">
                    {result.description}
                </div>
            )}
            {result.meta && (
                <div className="mt-1 text-[11px] font-mono text-gray-400">
                    {result.meta}
                </div>
            )}
        </>
    );

    const className = 'group block border-b border-gray-100 px-4 py-3 transition-colors last:border-0 hover:bg-accent-50/70';

    if (result.external) {
        return (
            <a
                href={result.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onSelect}
                className={className}
            >
                {content}
            </a>
        );
    }

    return (
        <Link href={result.href} onClick={onSelect} className={className}>
            {content}
        </Link>
    );
}

export function CommandInput({ compact = false, className }: CommandInputProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [placeholder, setPlaceholder] = useState('');
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showAdminMenu, setShowAdminMenu] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const closeSearch = useCallback(() => {
        setIsOpen(false);
        setQuery('');
        setShowAdminMenu(false);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 0);
            }
            if (e.key === 'Escape') {
                closeSearch();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [closeSearch]);

    useEffect(() => {
        if (isOpen || compact) return;

        const currentText = placeholders[placeholderIndex];
        const timeout = setTimeout(() => {
            if (!isDeleting) {
                if (charIndex < currentText.length) {
                    setPlaceholder(currentText.slice(0, charIndex + 1));
                    setCharIndex(charIndex + 1);
                } else {
                    setTimeout(() => setIsDeleting(true), 2000);
                }
            } else if (charIndex > 0) {
                setPlaceholder(currentText.slice(0, charIndex - 1));
                setCharIndex(charIndex - 1);
            } else {
                setIsDeleting(false);
                setPlaceholderIndex((placeholderIndex + 1) % placeholders.length);
            }
        }, isDeleting ? 50 : 100);

        return () => clearTimeout(timeout);
    }, [charIndex, compact, isDeleting, placeholderIndex, isOpen]);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setErrorMessage(null);
            setShowAdminMenu(false);
            return;
        }

        if (query === ADMIN_SHORTCUT) {
            setShowAdminMenu(true);
            setResults([]);
            setErrorMessage(null);
            setIsLoading(false);
            return;
        }

        setShowAdminMenu(false);

        const controller = new AbortController();

        const fetchResults = async () => {
            setIsLoading(true);
            setErrorMessage(null);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
                    signal: controller.signal,
                });

                if (!res.ok) {
                    const payload = await res.json().catch(() => null);
                    throw new Error(payload?.message || '搜索服务暂时不可用');
                }

                const data = (await res.json()) as SearchResult[];
                setResults(data);
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }

                console.error('Search failed:', error);
                setErrorMessage(
                    error instanceof Error ? error.message : '搜索服务暂时不可用'
                );
                setResults([]);
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        const debounce = setTimeout(fetchResults, 300);
        return () => {
            controller.abort();
            clearTimeout(debounce);
        };
    }, [query]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                closeSearch();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [closeSearch]);

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <button
                type="button"
                onClick={() => {
                    setIsOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 0);
                }}
                aria-label={compact ? '搜索文章和链接' : undefined}
                className={cn(
                    'flex min-h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white/85 text-xs font-mono text-gray-400 shadow-button transition-all hover:border-gray-300 hover:bg-white',
                    compact ? 'h-9 w-9 justify-center p-0' : 'min-w-[260px] px-3 py-1.5'
                )}
            >
                {compact ? (
                    <Search className="h-4 w-4 text-gray-500" />
                ) : (
                    <>
                        <Search className="h-3.5 w-3.5 text-accent" />
                        <span className="flex-1 text-left text-gray-500">
                            {isOpen && query ? query : placeholder || placeholders[0]}
                        </span>
                        <kbd className="hidden items-center gap-0.5 rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] sm:inline-flex">
                            Ctrl+K
                        </kbd>
                    </>
                )}
            </button>

            {isOpen && (
                <div
                    className={cn(
                        'z-50 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg',
                        compact
                            ? 'fixed left-4 right-4 top-[4.25rem]'
                            : 'absolute top-full left-0 right-0 mt-2 min-w-[360px]'
                    )}
                >
                    <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/70 px-4 py-3">
                        <Search className="h-4 w-4 text-accent" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={`搜索文章或链接，输入 ${ADMIN_SHORTCUT} 进编辑区`}
                            aria-label="搜索文章或链接"
                            className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                            autoFocus
                        />
                        <kbd className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">ESC</kbd>
                    </div>

                    {isLoading && (
                        <div className="px-4 py-6 text-center text-sm text-gray-400 font-mono">
                            <span className="animate-pulse">搜索中...</span>
                        </div>
                    )}

                    {!isLoading && results.length > 0 && (
                        <div className="max-h-72 overflow-y-auto">
                            {results.map((result) => (
                                <SearchResultItem
                                    key={`${result.type}-${result.href}-${result.title}`}
                                    result={result}
                                    onSelect={closeSearch}
                                />
                            ))}
                        </div>
                    )}

                    {!isLoading && errorMessage && (
                        <div className="px-4 py-6 text-center text-sm text-red-500 font-mono">
                            <span className="text-red-400">!</span> {errorMessage}
                        </div>
                    )}

                    {!isLoading && !errorMessage && query && !showAdminMenu && results.length === 0 && (
                        <div className="px-4 py-6 text-center text-sm text-gray-400 font-mono">
                            <span className="text-accent">!</span> 未找到匹配的文章或链接
                        </div>
                    )}

                    {!isLoading && !query && (
                        <div className="px-4 py-3 text-xs text-gray-400 font-mono border-t border-gray-100">
                            输入关键词搜索文章和链接
                        </div>
                    )}

                    {showAdminMenu && (
                        <div className="border-t border-gray-100">
                            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                                <div className="flex items-center gap-2 text-sm font-mono text-gray-600">
                                    <Lock className="w-4 h-4 text-amber-500" />
                                    <span>受保护编辑区</span>
                                </div>
                            </div>
                            <div className="p-2 space-y-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        closeSearch();
                                        router.push('/editor/blog');
                                    }}
                                    className="flex min-h-[44px] w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors duration-200 hover:bg-gray-50"
                                >
                                    <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div className="text-left">
                                        <div className="text-sm font-medium text-gray-700">写文章</div>
                                        <div className="text-xs text-gray-400">创建新的博客文章</div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        closeSearch();
                                        router.push('/editor/navigation');
                                    }}
                                    className="flex min-h-[44px] w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors duration-200 hover:bg-gray-50"
                                >
                                    <Compass className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div className="text-left">
                                        <div className="text-sm font-medium text-gray-700">编辑导航</div>
                                        <div className="text-xs text-gray-400">管理导航链接和分类</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

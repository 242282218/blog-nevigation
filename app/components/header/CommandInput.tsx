'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, FileText, Compass } from 'lucide-react';

const SECRET_CODE = '20030610@ghl';

interface SearchResult {
    title: string;
    slug: string;
    description?: string;
}

const placeholders = [
    'grep "React优化"...',
    'grep "Next.js"...',
    'grep "TypeScript"...',
    'grep "CSS技巧"...',
    'grep "Git工作流"...',
    'grep "性能优化"...',
];

export function CommandInput() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [placeholder, setPlaceholder] = useState('');
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showSecretMenu, setShowSecretMenu] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 0);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
                setQuery('');
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isOpen) return;

        const currentText = placeholders[placeholderIndex];
        const timeout = setTimeout(() => {
            if (!isDeleting) {
                if (charIndex < currentText.length) {
                    setPlaceholder(currentText.slice(0, charIndex + 1));
                    setCharIndex(charIndex + 1);
                } else {
                    setTimeout(() => setIsDeleting(true), 2000);
                }
            } else {
                if (charIndex > 0) {
                    setPlaceholder(currentText.slice(0, charIndex - 1));
                    setCharIndex(charIndex - 1);
                } else {
                    setIsDeleting(false);
                    setPlaceholderIndex((placeholderIndex + 1) % placeholders.length);
                }
            }
        }, isDeleting ? 50 : 100);

        return () => clearTimeout(timeout);
    }, [charIndex, isDeleting, placeholderIndex, isOpen]);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setShowSecretMenu(false);
            return;
        }

        if (query === SECRET_CODE) {
            setShowSecretMenu(true);
            setResults([]);
            setIsLoading(false);
            return;
        }

        setShowSecretMenu(false);

        const fetchResults = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                setResults(data);
            } catch (error) {
                console.error('Search failed:', error);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        };

        const debounce = setTimeout(fetchResults, 300);
        return () => clearTimeout(debounce);
    }, [query]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setQuery('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className="relative hidden lg:block">
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-gray-400 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50/50 transition-all min-w-[240px]"
            >
                <span className="text-terminal-prompt">$</span>
                <span className="flex-1 text-left text-gray-500">
                    {isOpen && query ? query : placeholder || placeholders[0]}
                    {!isOpen && <span className="inline-block w-1.5 h-3 bg-accent animate-pulse rounded-sm ml-0.5 align-middle opacity-70" />}
                </span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 rounded border border-gray-200">
                    <span>⌘</span>K
                </kbd>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50 min-w-[320px]">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                        <span className="text-terminal-prompt font-mono font-bold">$</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="搜索文章..."
                            className="flex-1 bg-transparent outline-none font-mono text-sm text-gray-700 placeholder:text-gray-400"
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
                        <div className="max-h-64 overflow-y-auto">
                            {results.map((post) => (
                                <Link
                                    key={post.slug}
                                    href={`/posts/${post.slug}`}
                                    onClick={() => {
                                        setIsOpen(false);
                                        setQuery('');
                                    }}
                                    className="block px-4 py-3 hover:bg-accent-50/50 transition-colors border-b border-gray-50 last:border-0"
                                >
                                    <div className="font-mono text-sm text-gray-800 hover:text-accent transition-colors">
                                        {post.title}
                                    </div>
                                    {post.description && (
                                        <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                                            {post.description}
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}

                    {!isLoading && query && results.length === 0 && (
                        <div className="px-4 py-6 text-center text-sm text-gray-400 font-mono">
                            <span className="text-accent">!</span> 未找到匹配的文章
                        </div>
                    )}

                    {!isLoading && !query && (
                        <div className="px-4 py-3 text-xs text-gray-400 font-mono border-t border-gray-100">
                            输入关键词搜索文章
                        </div>
                    )}

                    {showSecretMenu && (
                        <div className="border-t border-gray-100">
                            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                                <div className="flex items-center gap-2 text-sm font-mono text-gray-600">
                                    <Lock className="w-4 h-4 text-amber-500" />
                                    <span>管理员入口</span>
                                </div>
                            </div>
                            <div className="p-2 space-y-1">
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setQuery('');
                                        setShowSecretMenu(false);
                                        router.push('/editor/blog');
                                    }}
                                    className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer min-h-[44px]"
                                >
                                    <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div className="text-left">
                                        <div className="text-sm font-medium text-gray-700">写文章</div>
                                        <div className="text-xs text-gray-400">创建新的博客文章</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setQuery('');
                                        setShowSecretMenu(false);
                                        router.push('/editor/navigation');
                                    }}
                                    className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer min-h-[44px]"
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

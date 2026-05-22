import { getPosts } from '@/lib/markdown';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ArrowRight, CalendarDays, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function BlogPage() {
    const articlePosts = getPosts().filter((post) => !post.slugArray.includes('navigation'));
    const postsByYear = articlePosts.reduce((acc, post) => {
        const year = post.date ? post.date.split('-')[0] : '未分类';

        if (!acc[year]) {
            acc[year] = [];
        }

        acc[year].push(post);
        return acc;
    }, {} as Record<string, typeof articlePosts>);
    const sortedYears = Object.keys(postsByYear).sort((a, b) => b.localeCompare(a));

    return (
        <div className="space-y-10 pb-16">
            <header className="rounded-lg border border-gray-200 bg-white/90 p-6 shadow-token-card md:p-10">
                <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 font-mono text-xs text-gray-500">
                    <FileText className="h-3.5 w-3.5 text-accent" />
                    {articlePosts.length} posts
                </div>
                <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-gray-900 md:text-5xl">
                    技术文章归档
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
                    按时间整理的工程实践、工具链记录和项目复盘。
                </p>
            </header>

            {articlePosts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-white/80 px-6 py-16 text-center text-gray-500">
                    暂无文章。
                </div>
            ) : (
                <div className="grid gap-8 lg:grid-cols-[160px_1fr]">
                    <aside className="hidden lg:block">
                        <div className="sticky top-24 space-y-2">
                            {sortedYears.map((year) => (
                                <a
                                    key={year}
                                    href={`#year-${year}`}
                                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white/85 px-3 py-2 text-sm text-gray-600 transition hover:border-accent-200 hover:text-accent"
                                >
                                    <span>{year}</span>
                                    <span className="font-mono text-xs text-gray-400">{postsByYear[year].length}</span>
                                </a>
                            ))}
                        </div>
                    </aside>

                    <div className="space-y-8">
                        {sortedYears.map((year) => (
                            <section
                                key={year}
                                id={`year-${year}`}
                                className="scroll-mt-24 rounded-lg border border-gray-200 bg-white/90 p-5 shadow-token-card md:p-6"
                            >
                                <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
                                    <h2 className="text-2xl font-semibold text-gray-900">{year}</h2>
                                    <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-xs text-gray-500">
                                        {postsByYear[year].length} entries
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {postsByYear[year].map((post) => {
                                        const hasDate = Boolean(post.date);

                                        return (
                                            <Link
                                                key={post.slug}
                                                href={`/posts/${post.slug}`}
                                                className="group grid gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-accent-300 hover:shadow-token-card-hover md:grid-cols-[132px_1fr_auto] md:items-center"
                                            >
                                                <div className="flex items-center gap-2 font-mono text-xs text-gray-500">
                                                    <CalendarDays className="h-4 w-4 text-accent" />
                                                    {hasDate
                                                        ? format(parseISO(post.date), 'MM月dd日', { locale: zhCN })
                                                        : 'UNTRACKED'}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-lg font-semibold text-gray-900 transition-colors group-hover:text-accent">
                                                        {post.title}
                                                    </h3>
                                                    {post.description ? (
                                                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">
                                                            {post.description}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <ArrowRight className="hidden h-4 w-4 text-gray-300 transition group-hover:translate-x-1 group-hover:text-accent md:block" />
                                            </Link>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

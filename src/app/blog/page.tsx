import { getPosts } from '@/lib/markdown';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ArrowRight, CalendarDays, FileText } from 'lucide-react';
import { EmptyState, PageHero } from '@/app/components/ui';

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
        <div className="space-y-token-section pb-16">
            <PageHero
                eyebrow={`${articlePosts.length} posts`}
                title="技术文章归档"
                description="按时间整理的工程实践、工具链记录和项目复盘。"
                aside={(
                    <div className="rounded-token-card border border-border bg-surface p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-token-card border border-accent-200 bg-accent-50 text-accent">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-mono text-xs text-subtle">archive.index</p>
                                <p className="text-sm font-medium text-fg">{sortedYears.length} 年归档</p>
                            </div>
                        </div>
                        <p className="mt-4 text-sm leading-relaxed text-muted">
                            文章按年份聚合，适合快速回看某个阶段的技术选择和项目记录。
                        </p>
                    </div>
                )}
            />

            {articlePosts.length === 0 ? (
                <EmptyState title="暂无文章" description="创建文章后，归档会按年份自动聚合。" />
            ) : (
                <div className="grid gap-8 lg:grid-cols-[140px_1fr]">
                    <aside className="hidden lg:block">
                        <div className="sticky top-24 space-y-2">
                            {sortedYears.map((year) => (
                                <a
                                    key={year}
                                    href={`#year-${year}`}
                                    className="flex items-center justify-between rounded-token-button border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors duration-token-fast hover:border-accent-200 hover:text-accent"
                                >
                                    <span>{year}</span>
                                    <span className="font-mono text-xs text-subtle">{postsByYear[year].length}</span>
                                </a>
                            ))}
                        </div>
                    </aside>

                    <div className="space-y-10">
                        {sortedYears.map((year) => (
                            <section
                                key={year}
                                id={`year-${year}`}
                                className="scroll-mt-24"
                            >
                                <div className="mb-5 flex items-center justify-between border-b border-border pb-3">
                                    <h2 className="text-2xl font-semibold text-fg">{year}</h2>
                                    <span className="rounded-token-badge bg-surface px-2 py-1 font-mono text-xs text-subtle border border-border-soft">
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
                                                className="group grid gap-4 rounded-token-card border border-border bg-surface-elevated p-4 transition-shadow duration-token-normal ease-token-out hover:border-accent-200 hover:shadow-token-card-hover md:grid-cols-[120px_1fr_auto] md:items-center"
                                            >
                                                <div className="flex items-center gap-2 font-mono text-xs text-subtle">
                                                    <CalendarDays className="h-4 w-4 text-subtle" />
                                                    {hasDate
                                                        ? format(parseISO(post.date), 'MM月dd日', { locale: zhCN })
                                                        : 'UNTRACKED'}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-base font-semibold text-fg transition-colors duration-token-fast group-hover:text-accent">
                                                        {post.title}
                                                    </h3>
                                                    {post.description ? (
                                                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">
                                                            {post.description}
                                                        </p>
                                                    ) : null}
                                                </div>
                                                <ArrowRight className="hidden h-4 w-4 text-subtle transition-all duration-token-fast group-hover:translate-x-1 group-hover:text-accent md:block" />
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

import { getPosts } from '@/lib/markdown';
import { readNavigationFromDisk, readSiteSettingsFromDisk } from '@/lib/editor-data-storage';
import Image from 'next/image';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowRight,
    ArrowUpRight,
    BookOpen,
    Code2,
    Compass,
    ExternalLink,
    Lightbulb,
    PenLine,
    UserRound,
} from 'lucide-react';
import { EmptyState, PostCard } from './components/ui';

export const dynamic = 'force-dynamic';

const writingTopics: Array<{
    icon: LucideIcon;
    title: string;
    description: string;
}> = [
    {
        icon: Code2,
        title: '真实问题',
        description: '从一次报错、性能波动或交互卡点开始，写清楚上下文和定位过程。',
    },
    {
        icon: PenLine,
        title: '工程复盘',
        description: '记录做页面、工具和架构调整时的选择、取舍与后续修正。',
    },
    {
        icon: Lightbulb,
        title: '常用资料',
        description: '把反复会打开的文档、文章和灵感线索放在一起，降低下次启动成本。',
    },
];

export default function Home() {
    const posts = getPosts().filter((post) => !post.slugArray.includes('navigation'));
    const navigation = readNavigationFromDisk();
    const settings = readSiteSettingsFromDisk();
    const latestPosts = posts.slice(0, 4);
    const latestPost = latestPosts[0];
    const highlightedTools = navigation
        .flatMap((category) => category.tools.map((tool) => ({ ...tool, category: category.name })))
        .slice(0, 5);
    const introCardMeta = [
        [settings.introCardMetaOneLabel, settings.introCardMetaOneValue],
        [settings.introCardMetaTwoLabel, settings.introCardMetaTwoValue],
        [settings.introCardMetaThreeLabel, settings.introCardMetaThreeValue],
    ] as const;

    const heroHref = latestPost ? `/posts/${latestPost.slug}` : '/blog';

    return (
        <div className="space-y-10 pb-12 md:space-y-14">
            <section className="border-b border-border pb-10 md:pb-12">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
                    <div className="min-w-0">
                        <div className="mb-5 inline-flex items-center gap-2 rounded-token-badge border border-border-soft bg-surface px-3 py-1.5 font-mono text-xs uppercase tracking-token-caps text-accent">
                            <Image src="/logo.svg" alt="" width={20} height={20} className="h-5 w-5 rounded-sm" priority />
                            {settings.workspaceLabel}
                        </div>

                        <h1 className="max-w-4xl font-serif text-4xl font-medium leading-tight tracking-token-normal text-fg md:text-5xl">
                            <span className="block">{settings.heroTitleLineOne}</span>
                            <span className="block">{settings.heroTitleLineTwo}</span>
                        </h1>

                        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
                            {settings.heroDescription}
                        </p>

                        <div className="mt-7 flex flex-wrap gap-3">
                            <Link
                                href={heroHref}
                                className="inline-flex min-h-[44px] items-center gap-2 rounded-token-button bg-fg px-4 py-2 text-sm font-medium text-surface transition-colors duration-token-fast hover:bg-warm-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                            >
                                <BookOpen className="h-4 w-4" />
                                阅读最近文章
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/navigation"
                                className="inline-flex min-h-[44px] items-center gap-2 rounded-token-button border border-border bg-surface px-4 py-2 text-sm font-medium text-muted transition-colors duration-token-fast hover:border-border-focus hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                            >
                                <Compass className="h-4 w-4 text-subtle" />
                                打开常用入口
                            </Link>
                        </div>
                    </div>

                    <aside className="rounded-token-card border border-border bg-surface-elevated p-5 shadow-token-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="font-mono text-xs uppercase tracking-token-caps text-accent">{settings.introCardEyebrow}</p>
                                <h2 className="mt-2 text-xl font-semibold text-fg">{settings.introCardTitle}</h2>
                            </div>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-token-card border border-border-soft bg-bg">
                                <UserRound className="h-5 w-5 text-accent" />
                            </div>
                        </div>

                        <p className="mt-4 text-sm leading-relaxed text-muted">
                            {settings.introCardDescription}
                        </p>

                        <div className="mt-6 space-y-3 border-y border-border-soft py-4">
                            {introCardMeta.map((item) => (
                                <div key={item[0]} className="grid gap-2 text-sm sm:grid-cols-[72px_1fr]">
                                    <span className="text-subtle">{item[0]}</span>
                                    <span className="leading-relaxed text-fg">{item[1]}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5">
                            <p className="font-mono text-xs uppercase tracking-token-caps text-subtle">{settings.introCardStartLabel}</p>
                            {latestPost ? (
                                <Link
                                    href={`/posts/${latestPost.slug}`}
                                    className="group mt-2 flex items-center justify-between gap-4 rounded-token-button border border-transparent py-1 text-sm font-medium text-fg transition-colors duration-token-fast hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                                >
                                    <span className="line-clamp-1">{latestPost.title}</span>
                                    <ArrowRight className="h-4 w-4 shrink-0 text-subtle transition-transform duration-token-fast group-hover:translate-x-0.5 group-hover:text-accent" />
                                </Link>
                            ) : (
                                <p className="mt-2 text-sm text-muted">还没有公开文章。</p>
                            )}
                        </div>
                    </aside>
                </div>
            </section>

            <section aria-labelledby="desk-habits-title" className="space-y-5">
                <div className="max-w-2xl">
                    <p className="font-mono text-xs uppercase tracking-token-caps text-accent">field notes</p>
                    <h2 id="desk-habits-title" className="mt-2 font-serif text-3xl font-medium leading-tight text-fg">
                        我会优先写这些
                    </h2>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    {writingTopics.map((item) => {
                        const Icon = item.icon;

                        return (
                            <article key={item.title} className="rounded-token-card border border-border bg-surface-elevated p-5">
                                <Icon className="h-5 w-5 text-accent" />
                                <h3 className="mt-4 text-base font-semibold text-fg">{item.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div>
                    <div className="mb-4 flex items-end justify-between gap-4">
                        <div>
                            <p className="font-mono text-xs uppercase tracking-token-caps text-accent">recent notes</p>
                            <h2 className="mt-1 text-2xl font-semibold text-fg">最近整理的笔记</h2>
                        </div>
                        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium text-link transition-colors duration-token-fast hover:text-link-hover">
                            全部文章
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    {latestPosts.length === 0 ? (
                        <EmptyState title="暂无文章" description="写下第一篇文章后，这里会显示最近更新。" />
                    ) : (
                        <div className="space-y-3">
                            {latestPosts.map((post) => (
                                <PostCard
                                    key={post.slug}
                                    title={post.title}
                                    description={post.description}
                                    date={post.date || 'UNTRACKED'}
                                    href={`/posts/${post.slug}`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <div className="mb-4">
                        <p className="font-mono text-xs uppercase tracking-token-caps text-accent">quick access</p>
                        <h2 className="mt-1 text-2xl font-semibold text-fg">长期会用的入口</h2>
                    </div>

                    {highlightedTools.length === 0 ? (
                        <EmptyState title="暂无链接" description="添加导航数据后，这里会展示常用入口。" />
                    ) : (
                        <div className="space-y-3">
                            {highlightedTools.map((tool) => (
                                <a
                                    key={`${tool.category}-${tool.title}`}
                                    href={tool.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group block rounded-token-card border border-border bg-surface-elevated p-4 transition-all duration-token-normal hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-50/40 hover:shadow-token-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-mono text-xs text-subtle">{tool.category}</p>
                                            <h3 className="mt-1 flex items-center gap-2 text-sm font-semibold text-fg">
                                                <span className="truncate">{tool.title}</span>
                                                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-subtle transition-colors duration-token-fast group-hover:text-accent" />
                                            </h3>
                                        </div>
                                        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-subtle transition-transform duration-token-fast group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                                    </div>
                                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{tool.description}</p>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="grid gap-4 border-t border-border pt-8 md:grid-cols-[1fr_1fr]">
                <Link
                    href={heroHref}
                    className="group rounded-token-card border border-border bg-surface-elevated p-5 transition-all duration-token-normal hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-50/40 hover:shadow-token-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                    <BookOpen className="h-5 w-5 text-accent" />
                    <h2 className="mt-4 flex items-center justify-between gap-3 text-lg font-semibold text-fg">
                        从最近一篇开始
                        <ArrowRight className="h-4 w-4 shrink-0 text-subtle transition-transform duration-token-fast group-hover:translate-x-0.5 group-hover:text-accent" />
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                        先看一篇完整记录，了解我如何描述问题、判断路径和最后留下的做法。
                    </p>
                </Link>

                <Link
                    href="/navigation"
                    className="group rounded-token-card border border-border bg-surface-elevated p-5 transition-all duration-token-normal hover:-translate-y-0.5 hover:border-accent-300 hover:bg-accent-50/40 hover:shadow-token-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                    <Compass className="h-5 w-5 text-accent" />
                    <h2 className="mt-4 flex items-center justify-between gap-3 text-lg font-semibold text-fg">
                        找工具和资料
                        <ArrowRight className="h-4 w-4 shrink-0 text-subtle transition-transform duration-token-fast group-hover:translate-x-0.5 group-hover:text-accent" />
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                        直接去导航页，那里收着我反复会用到的开发文档、工具和参考资料。
                    </p>
                </Link>
            </section>
        </div>
    );
}

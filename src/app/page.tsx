import { getPosts } from '@/lib/markdown';
import { readNavigationFromDisk, readSiteSettingsFromDisk } from '@/lib/editor-data-storage';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, Compass, Database } from 'lucide-react';
import { EmptyState, MetricCard, PageHero, PostCard, SectionHeading } from './components/ui';

export const dynamic = 'force-dynamic';

export default function Home() {
    const posts = getPosts().filter((post) => !post.slugArray.includes('navigation'));
    const navigation = readNavigationFromDisk();
    const settings = readSiteSettingsFromDisk();
    const linkCount = navigation.reduce((total, category) => total + category.tools.length, 0);
    const latestPosts = posts.slice(0, 4);

    return (
        <div className="space-y-token-section pb-16">
            <PageHero
                eyebrow={(
                    <span className="inline-flex items-center gap-2.5 rounded-token-badge border border-border-soft bg-surface px-3 py-1.5">
                        <Image src="/logo.svg" alt="" width={20} height={20} className="h-5 w-5 rounded-sm" priority />
                        {settings.workspaceLabel}
                    </span>
                )}
                title={(
                    <>
                        <span className="block">{settings.heroTitleLineOne}</span>
                        <span className="block">{settings.heroTitleLineTwo}</span>
                    </>
                )}
                description={(
                    <p>
                        {settings.heroDescription}
                    </p>
                )}
                actions={(
                    <>
                        <Link
                            href="/blog"
                            className="inline-flex min-h-[44px] items-center gap-2 rounded-token-button bg-fg px-4 py-2 text-sm font-medium text-surface transition-colors duration-token-fast hover:bg-warm-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                        >
                            <BookOpen className="h-4 w-4" />
                            浏览文章
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            href="/navigation"
                            className="inline-flex min-h-[44px] items-center gap-2 rounded-token-button border border-border bg-surface px-4 py-2 text-sm font-medium text-muted transition-colors duration-token-fast hover:border-border-focus hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                        >
                            <Compass className="h-4 w-4 text-subtle" />
                            打开导航
                        </Link>
                    </>
                )}
                aside={(
                    <aside className="rounded-token-card border border-warm-700 bg-warm-900 p-5 text-surface md:p-6">
                    <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                        <div>
                            <p className="font-mono text-xs text-warm-500">system.index</p>
                            <h2 className="mt-1 font-serif text-xl font-medium text-surface">当前内容</h2>
                        </div>
                        <Database className="h-5 w-5 text-accent-soft" />
                    </div>

                    <div className="space-y-3">
                        {[
                            { label: 'posts', value: posts.length, icon: BookOpen },
                            { label: 'links', value: linkCount, icon: Compass },
                            { label: 'categories', value: navigation.length, icon: Database },
                        ].map((item) => {
                            return (
                                <MetricCard
                                    key={item.label}
                                    label={item.label}
                                    value={item.value}
                                    icon={item.icon}
                                    tone="dark"
                                />
                            );
                        })}
                    </div>

                    <div className="mt-5 rounded-token-card border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-surface">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" />
                            local-first data
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-warm-500">
                            运行时数据集中在服务器 <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-sm text-warm-400">data/</code>，可通过 JSON 备份包或 R2 镜像迁移。
                        </p>
                    </div>
                </aside>
                )}
            />

            <section className="grid gap-8 lg:grid-cols-[1fr_280px]">
                <div>
                    <SectionHeading
                        eyebrow="recent posts"
                        title="最近文章"
                        action={(
                            <Link href="/blog" className="text-sm font-medium text-link transition-colors duration-token-fast hover:text-link-hover">
                            全部
                            </Link>
                        )}
                    />

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

                <div className="rounded-token-card border border-border bg-surface p-5 md:p-6">
                    <SectionHeading
                        eyebrow="data portability"
                        title="迁移边界"
                        className="mb-0 block"
                    />
                    <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted">
                        <p>
                            部署目录只需要保留 <code className="rounded bg-surface px-1 py-0.5 font-mono text-sm text-subtle border border-border-soft">compose.prod.yaml</code>、
                            <code className="rounded bg-surface px-1 py-0.5 font-mono text-sm text-subtle border border-border-soft">.env</code> 和
                            <code className="rounded bg-surface px-1 py-0.5 font-mono text-sm text-subtle border border-border-soft">data/</code>。
                        </p>
                        <p>离线迁移使用内置导入导出脚本；远端容灾使用 R2 最新备份。</p>
                    </div>
                </div>
            </section>
        </div>
    );
}

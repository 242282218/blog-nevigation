import { getPosts } from '@/lib/markdown';
import { readNavigationFromDisk } from '@/lib/editor-data-storage';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, Cloud, Compass, Database, Search } from 'lucide-react';
import { PostCard } from './components/ui';

export const dynamic = 'force-dynamic';

export default function Home() {
    const posts = getPosts().filter((post) => !post.slugArray.includes('navigation'));
    const navigation = readNavigationFromDisk();
    const linkCount = navigation.reduce((total, category) => total + category.tools.length, 0);
    const latestPosts = posts.slice(0, 4);

    return (
        <div className="animate-in space-y-12 pb-16 duration-700 fade-in slide-in-from-bottom-6">
            <section className="grid items-stretch gap-6 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="rounded-lg border border-gray-200 bg-white/90 p-6 shadow-token-card md:p-10">
                    <div className="mb-8 inline-flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <Image src="/logo.svg" alt="" width={32} height={32} className="h-8 w-8 rounded-md" priority />
                        <span className="font-mono text-xs text-gray-500">workspace / blog-navigation</span>
                    </div>

                    <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-gray-900 md:text-6xl">
                        技术博客与常用链接的个人工作台
                    </h1>
                    <p className="mt-5 max-w-2xl text-base leading-8 text-gray-600 md:text-lg">
                        把长期文章、开发文档、工具入口和编辑数据放在一个轻量系统里，公开阅读和服务器迁移都保持清晰。
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href="/blog"
                            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 focus:ring-2 focus:ring-link focus:ring-offset-2"
                        >
                            <BookOpen className="h-4 w-4" />
                            浏览文章
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            href="/navigation"
                            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-link focus:ring-offset-2"
                        >
                            <Compass className="h-4 w-4 text-accent" />
                            打开导航
                        </Link>
                    </div>
                </div>

                <aside className="rounded-lg border border-gray-800 bg-gray-950 p-5 text-white shadow-token-card md:p-6">
                    <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                        <div>
                            <p className="font-mono text-xs text-gray-400">system.index</p>
                            <h2 className="mt-1 text-xl font-semibold">当前内容</h2>
                        </div>
                        <Search className="h-5 w-5 text-accent-300" />
                    </div>

                    <div className="space-y-3">
                        {[
                            { label: 'posts', value: posts.length, icon: BookOpen },
                            { label: 'links', value: linkCount, icon: Compass },
                            { label: 'categories', value: navigation.length, icon: Database },
                        ].map((item) => {
                            const Icon = item.icon;

                            return (
                                <div key={item.label} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <Icon className="h-4 w-4 text-accent-300" />
                                        <span className="font-mono text-sm text-gray-300">{item.label}</span>
                                    </div>
                                    <span className="font-mono text-lg text-white">{item.value}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-100">
                            <Cloud className="h-4 w-4 text-success-light" />
                            local-first data
                        </div>
                        <p className="mt-2 text-sm leading-6 text-gray-400">
                            运行时数据集中在服务器 <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-gray-200">data/</code>，可通过 JSON 备份包或 R2 镜像迁移。
                        </p>
                    </div>
                </aside>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="rounded-lg border border-gray-200 bg-white/90 p-5 shadow-token-card md:p-6">
                    <div className="mb-5 flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
                        <div>
                            <p className="font-mono text-xs text-accent">recent posts</p>
                            <h2 className="mt-1 text-2xl font-semibold text-gray-900">最近文章</h2>
                        </div>
                        <Link href="/blog" className="text-sm font-medium text-link hover:text-link-hover">
                            全部
                        </Link>
                    </div>

                    {latestPosts.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                            暂无文章。
                        </p>
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

                <div className="rounded-lg border border-gray-200 bg-white/90 p-5 shadow-token-card md:p-6">
                    <p className="font-mono text-xs text-accent">data portability</p>
                    <h2 className="mt-1 text-2xl font-semibold text-gray-900">迁移边界</h2>
                    <div className="mt-5 space-y-4 text-sm leading-6 text-gray-600">
                        <p>
                            部署目录只需要保留 <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-gray-700">compose.prod.yaml</code>、
                            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-gray-700">.env</code> 和
                            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-gray-700">data/</code>。
                        </p>
                        <p>离线迁移使用内置导入导出脚本；远端容灾使用 R2 最新备份。</p>
                    </div>
                </div>
            </section>
        </div>
    );
}

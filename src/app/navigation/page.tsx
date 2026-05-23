import { readNavigationFromDisk } from '@/lib/editor-data-storage';
import { Compass, Layers, Search, Sparkles } from 'lucide-react';
import { NavigationDirectory } from './NavigationDirectory';

export const dynamic = 'force-dynamic';

function getNavigationData() {
    try {
        return readNavigationFromDisk();
    } catch (error) {
        console.error("Error loading navigation data", error);
        return [];
    }
}

export default function NavigationPage() {
    const navData = getNavigationData();
    const linkCount = navData.reduce((total, category) => total + category.tools.length, 0);

    return (
        <div className="relative isolate space-y-10 pb-16 md:space-y-12">
            <div className="pointer-events-none absolute inset-x-0 top-[-7rem] -z-10 h-96 rounded-full bg-[radial-gradient(circle_at_28%_30%,rgba(184,92,56,0.2),transparent_34%),radial-gradient(circle_at_72%_18%,rgba(37,99,235,0.12),transparent_30%),linear-gradient(135deg,rgba(250,249,245,0),rgba(255,255,255,0.72))] blur-2xl" />

            <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(248,232,223,0.72)_48%,rgba(239,235,227,0.92))] shadow-[0_24px_80px_rgba(63,33,25,0.08)]">
                <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_350px] lg:p-10">
                    <div className="flex min-w-0 flex-col justify-between gap-12">
                        <div>
                            <div className="mb-6 inline-flex items-center gap-2 rounded-token-full border border-accent-200/80 bg-white/55 px-3 py-1.5 font-mono text-xs uppercase tracking-token-caps text-accent backdrop-blur">
                                <Sparkles className="h-3.5 w-3.5" />
                                {navData.length} categories / {linkCount} links
                            </div>
                            <h1 className="max-w-4xl font-serif text-4xl font-medium leading-[1.05] tracking-token-tight text-fg md:text-6xl">
                                常用链接导航
                            </h1>
                            <p className="mt-5 max-w-2xl text-base leading-8 text-muted md:text-xl md:leading-9">
                                把开发文档、写作资料和高频工具入口整理成一个可搜索的个人工作台，减少在收藏夹里反复翻找的时间。
                            </p>
                        </div>

                        <div className="grid gap-3 text-sm text-muted sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur">
                                <p className="font-mono text-xs uppercase tracking-token-caps text-subtle">mode</p>
                                <p className="mt-2 font-serif text-xl text-fg">Search first</p>
                            </div>
                            <div className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur">
                                <p className="font-mono text-xs uppercase tracking-token-caps text-subtle">scope</p>
                                <p className="mt-2 font-serif text-xl text-fg">{navData.length} groups</p>
                            </div>
                            <div className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur">
                                <p className="font-mono text-xs uppercase tracking-token-caps text-subtle">index</p>
                                <p className="mt-2 font-serif text-xl text-fg">{linkCount} links</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/80 bg-white/58 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent-200 bg-accent-50 text-accent">
                                <Compass className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-mono text-xs text-subtle">directory.search</p>
                                <p className="text-sm font-medium text-fg">分类筛选与全文搜索</p>
                            </div>
                        </div>
                        <div className="mt-6 space-y-3">
                            <div className="flex items-center justify-between rounded-2xl border border-border-soft bg-surface/80 px-4 py-3">
                                <span className="flex items-center gap-2 text-sm text-muted">
                                    <Search className="h-4 w-4 text-accent" />
                                    关键词、标签、域名
                                </span>
                                <span className="font-mono text-xs text-subtle">instant</span>
                            </div>
                            <div className="flex items-center justify-between rounded-2xl border border-border-soft bg-surface/80 px-4 py-3">
                                <span className="flex items-center gap-2 text-sm text-muted">
                                    <Layers className="h-4 w-4 text-accent" />
                                    分类分组浏览
                                </span>
                                <span className="font-mono text-xs text-subtle">curated</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <NavigationDirectory categories={navData} />
        </div>
    );
}

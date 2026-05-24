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
        <div className="space-y-8 pb-16 md:space-y-10">
            <section className="rounded-token-card border border-border bg-surface-elevated">
                <div className="grid gap-8 p-5 md:p-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="flex min-w-0 flex-col justify-between gap-12">
                        <div>
                            <div className="mb-6 inline-flex items-center gap-2 rounded-token-full border border-accent-200 bg-accent-50 px-3 py-1.5 font-mono text-xs uppercase tracking-token-caps text-accent">
                                <Sparkles className="h-3.5 w-3.5" />
                                {navData.length} categories / {linkCount} links
                            </div>
                            <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-token-normal text-fg md:text-5xl">
                                常用链接导航
                            </h1>
                            <p className="mt-5 max-w-2xl text-base leading-8 text-muted md:text-lg">
                                把开发文档、写作资料和高频工具入口整理成一个可搜索的个人工作台，减少在收藏夹里反复翻找的时间。
                            </p>
                        </div>

                        <div className="grid gap-3 text-sm text-muted sm:grid-cols-3">
                            <div className="rounded-token-card border border-border-soft bg-bg p-4">
                                <p className="font-mono text-xs uppercase tracking-token-caps text-subtle">mode</p>
                                <p className="mt-2 text-lg font-semibold text-fg">Search first</p>
                            </div>
                            <div className="rounded-token-card border border-border-soft bg-bg p-4">
                                <p className="font-mono text-xs uppercase tracking-token-caps text-subtle">scope</p>
                                <p className="mt-2 text-lg font-semibold text-fg">{navData.length} groups</p>
                            </div>
                            <div className="rounded-token-card border border-border-soft bg-bg p-4">
                                <p className="font-mono text-xs uppercase tracking-token-caps text-subtle">index</p>
                                <p className="mt-2 text-lg font-semibold text-fg">{linkCount} links</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-token-card border border-border bg-bg p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-token-card border border-accent-200 bg-accent-50 text-accent">
                                <Compass className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-mono text-xs text-subtle">directory.search</p>
                                <p className="text-sm font-medium text-fg">分类筛选与全文搜索</p>
                            </div>
                        </div>
                        <div className="mt-6 space-y-3">
                            <div className="flex items-center justify-between rounded-token-card border border-border-soft bg-surface-elevated px-4 py-3">
                                <span className="flex items-center gap-2 text-sm text-muted">
                                    <Search className="h-4 w-4 text-accent" />
                                    关键词、标签、域名
                                </span>
                                <span className="font-mono text-xs text-subtle">instant</span>
                            </div>
                            <div className="flex items-center justify-between rounded-token-card border border-border-soft bg-surface-elevated px-4 py-3">
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

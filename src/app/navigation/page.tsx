import { readNavigationFromDisk } from '@/lib/editor-data-storage';
import { Compass } from 'lucide-react';
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
        <div className="animate-in space-y-8 pb-16 duration-700 fade-in slide-in-from-bottom-6">
            <header className="rounded-lg border border-gray-200 bg-white/90 p-6 shadow-token-card md:p-10">
                <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 font-mono text-xs text-gray-500">
                    <Compass className="h-3.5 w-3.5 text-accent" />
                    {navData.length} categories / {linkCount} links
                </div>
                <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-gray-900 md:text-5xl">
                    常用链接导航
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
                    开发文档、写作资料和高频工具入口集中管理。
                </p>
            </header>

            <NavigationDirectory categories={navData} />
        </div>
    );
}

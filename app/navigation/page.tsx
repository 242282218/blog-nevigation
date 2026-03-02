import fs from 'fs';
import path from 'path';
import { TerminalCard } from '@/app/components/terminal';
import { CommandPrompt } from '@/app/components/ui';
import { Section } from '@/app/components/layout';
import { CategoryCard } from '@/app/components/navigation';

function getNavigationData() {
    try {
        const filePath = path.join(process.cwd(), 'content', 'posts', 'navigation', 'data', 'tools.json');
        if (!fs.existsSync(filePath)) return [];
        const fileContents = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(fileContents);
    } catch (error) {
        console.error("Error loading navigation data", error);
        return [];
    }
}

export default function NavigationPage() {
    const navData = getNavigationData();

    return (
        <Section spacing="lg" className="animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
            {/* Header Section */}
            <Section spacing="sm">
                <CommandPrompt command="pwd" path="~ / navigation" />

                <TerminalCard>
                    <div className="p-10 md:p-16 text-center relative overflow-hidden">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-mono font-bold text-gray-800 tracking-tight leading-tight flex items-center justify-center gap-4 relative z-10">
                            <span className="text-link">{'>'}</span> 常用工具箱
                        </h1>
                        <div className="mt-6 font-mono text-sm text-gray-500 relative z-10 block">
                            <span className="text-terminal-prompt font-bold mr-2">//</span>
                            开发工具 / 学习资源 / <span className="text-link underline decoration-link-light underline-offset-4">常用链接导航</span>
                        </div>
                    </div>
                </TerminalCard>
            </Section>

            {/* Navigation Bookmarks Section */}
            <TerminalCard
                opacity={0.5}
                command="ls -la ./bookmarks/"
            >
                <div className="mb-10 pb-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-2xl font-mono font-bold flex items-center gap-3 text-gray-800">
                        <span className="text-link">##</span> 工具分类 (Categories)
                    </h2>
                    <span className="text-xs font-mono bg-link-50 text-link px-2 py-1 rounded border border-link-100 hidden sm:block">bookmarks.db</span>
                </div>

                <div className="space-y-12">
                    {navData.map((category: any, idx: number) => (
                        <div key={idx} className="animate-in slide-in-from-bottom">
                            <h3 className="text-lg font-mono font-bold text-gray-700 mb-6 flex items-center gap-2 px-1">
                                <span className="text-gray-400">[{idx}]</span> {category.name}
                            </h3>

                            {/* 4 列网格布局 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {category.tools.map((tool: any, tIdx: number) => (
                                    <a
                                        key={tIdx}
                                        href={tool.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                    >
                                        <CategoryCard
                                            name={tool.title}
                                            slug={tool.title.toLowerCase().replace(/\s+/g, '-')}
                                            count={1}
                                        />
                                    </a>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </TerminalCard>
        </Section>
    );
}

import { getPosts } from '@/lib/markdown';
import TypewriterTitle from './components/TypewriterTitle';
import { TerminalCard } from './components/terminal';
import { SectionHeader, CommandPrompt, PostCard } from './components/ui';
import { Section } from './components/layout';

export default function Home() {
    const posts = getPosts();

    return (
        <Section spacing="lg" className="animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">

            {/* -------------------- Title Section -------------------- */}
            <Section spacing="sm">
                <CommandPrompt command="pwd" path="~ / timeline" />

                <TerminalCard command="git log --oneline --graph">
                    <div className="p-10 md:p-16 text-center relative overflow-hidden">
                        <div className="absolute top-10 -right-10 opacity-[0.03] rotate-12 pointer-events-none select-none">
                            <pre className="font-mono text-xs">
                                {`function init() {
  console.log('system ready');
  mount(app);
}`}
                            </pre>
                        </div>

                        <TypewriterTitle />
                        <div className="mt-6 font-mono text-sm text-gray-500 relative z-10 block">
                            <span className="text-terminal-prompt font-bold mr-2">//</span>
                            博客系统 / 技能积累 / <span className="text-link underline decoration-link-light underline-offset-4">常用工具链导航</span>
                        </div>
                    </div>
                </TerminalCard>
            </Section>

            {/* -------------------- Posts Timeline Data Section -------------------- */}
            <TerminalCard
                opacity={0.4}
                headerClassName="border-b border-gray-100 bg-gray-50/80"
            >
                <SectionHeader
                    title={
                        <>
                            <span className="text-accent">##</span> 技术文章 (Posts Array)
                        </>
                    }
                    showMacButtons={false}
                    className="border-b border-gray-100 mb-8 pb-4"
                />

                {posts.length === 0 ? (
                    <p className="text-gray-400 font-mono text-sm border-l-2 border-accent-light pl-4 py-2 bg-accent-50/50 rounded-r-lg">
                        No content found inside `content/`.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {posts.map((post) => {
                            if (post.slugArray.includes('navigation')) {
                                return null;
                            }
                            return (
                                <PostCard
                                    key={post.slug}
                                    title={post.title}
                                    description={post.description}
                                    date={post.date || 'UNTRACKED'}
                                    href={`/posts/${post.slug}`}
                                />
                            );
                        })}
                    </div>
                )}
            </TerminalCard>

        </Section>
    );
}

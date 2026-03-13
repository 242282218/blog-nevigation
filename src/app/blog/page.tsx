import { getPosts } from '@/lib/markdown';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export default function BlogPage() {
    const articlePosts = getPosts().filter((post) => !post.slugArray.includes('navigation'));

    const postsByYear = articlePosts.reduce((acc, post) => {
        const year = post.date ? post.date.split('-')[0] : '未分类';
        if (!acc[year]) acc[year] = [];
        acc[year].push(post);
        return acc;
    }, {} as Record<string, typeof articlePosts>);

    const sortedYears = Object.keys(postsByYear).sort((a, b) => b.localeCompare(a));

    return (
        <div className="min-h-screen pb-20">
            {/* Hero Header */}
            <section className="relative overflow-hidden mb-16">
                <div className="absolute inset-0 bg-gradient-to-br from-accent-50 via-white to-link-50 opacity-60"></div>
                <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.03) 1px, transparent 0)`,
                    backgroundSize: '32px 32px'
                }}></div>
                
                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur border border-gray-200 rounded-full text-xs font-mono text-gray-500 mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                        <span>$ ls -la ./posts/*.md | wc -l</span>
                        <span className="text-accent font-bold">→ {articlePosts.length}</span>
                    </div>
                    
                    <h1 className="text-5xl md:text-6xl font-bold font-mono text-gray-900 tracking-tight mb-4">
                        <span className="text-accent">#</span> 博客文章
                    </h1>
                    <p className="text-lg text-gray-500 font-mono max-w-2xl">
                        <span className="text-terminal-prompt">//</span> 按时间顺序排列的技术文章和思考记录
                    </p>
                </div>
            </section>

            {/* Timeline */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6">
                <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-gray-200 via-gray-300 to-transparent md:-translate-x-1/2"></div>

                    {sortedYears.map((year) => (
                        <div key={year} className="relative mb-16 last:mb-0">
                            {/* Year marker */}
                            <div className="sticky top-24 z-10 mb-8 flex items-center justify-center">
                                <div className="bg-white border border-gray-200 rounded-full px-6 py-2 shadow-sm">
                                    <span className="text-2xl font-mono font-bold text-gray-800">{year}</span>
                                    <span className="ml-2 text-xs text-gray-400 font-mono">({postsByYear[year].length})</span>
                                </div>
                            </div>

                            {/* Posts for this year */}
                            <div className="space-y-6">
                                {postsByYear[year].map((post, index) => {
                                    const isEven = index % 2 === 0;
                                    const hasDate = post.date && post.date !== '';
                                    
                                    return (
                                        <div 
                                            key={post.slug} 
                                            className={`relative flex items-start gap-8 ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                                        >
                                            {/* Timeline dot */}
                                            <div className="absolute left-0 md:left-1/2 w-3 h-3 bg-white border-2 border-accent rounded-full md:-translate-x-1/2 translate-y-6 z-10"></div>
                                            
                                            {/* Date - desktop */}
                                            <div className={`hidden md:block w-1/2 ${isEven ? 'text-right pr-12' : 'text-left pl-12'}`}>
                                                {hasDate && (
                                                    <div className="inline-flex flex-col items-center bg-gray-50 rounded-lg px-4 py-2 border border-gray-100">
                                                        <span className="text-2xl font-mono font-bold text-gray-700">
                                                            {format(parseISO(post.date), 'dd', { locale: zhCN })}
                                                        </span>
                                                        <span className="text-xs text-gray-400 font-mono uppercase">
                                                            {format(parseISO(post.date), 'MMM', { locale: zhCN })}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className={`pl-8 md:pl-0 md:w-1/2 ${isEven ? 'md:pl-12' : 'md:pr-12'}`}>
                                                <Link
                                                    href={`/posts/${post.slug}`}
                                                    className="group block bg-white border border-gray-100 hover:border-accent rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
                                                >
                                                    {/* Mobile date */}
                                                    {hasDate && (
                                                        <div className="md:hidden flex items-center gap-2 text-xs text-gray-400 font-mono mb-3">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-accent-300"></span>
                                                            {post.date}
                                                        </div>
                                                    )}
                                                    
                                                    <h3 className="text-xl font-mono font-bold text-gray-800 group-hover:text-accent transition-colors mb-2">
                                                        {post.title}
                                                    </h3>
                                                    
                                                    {post.description && (
                                                        <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                                                            {post.description}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                                                        <span className="text-accent">→</span>
                                                        <span className="group-hover:text-accent transition-colors">阅读文章</span>
                                                    </div>
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {articlePosts.length === 0 && (
                    <div className="text-center py-20">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-400 font-mono text-sm">
                            <span className="text-accent">!</span> 暂无文章
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

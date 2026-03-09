import { getPostBySlugArray } from '@/lib/markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { TerminalCard } from '@/app/components/terminal';

export const dynamic = 'force-dynamic';

export default function PostPage({ params }: { params: { slug: string[] } }) {
    const post = getPostBySlugArray(params.slug);

    if (!post) {
        notFound();
    }

    return (
        <article className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">

            <div className="mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm font-mono text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                <Link href="/" className="hover:text-link transition-colors flex items-center gap-1.5">
                    <span className="text-accent font-bold">$</span> cd ~
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-terminal-prompt">cat</span> {post.meta.slugArray[post.meta.slugArray.length - 1]}.md
            </div>

            <TerminalCard
                headerClassName="border-b border-gray-100 bg-gray-50/80 px-5 py-3 flex items-center justify-between"
            >
                <div className="font-mono text-xs text-gray-400 font-medium">
                    modified: {post.meta.date}
                </div>

                <header className="px-8 md:px-12 pt-12 pb-8 border-b border-gray-100 relative">
                    <h1 className="text-3xl md:text-5xl font-mono font-bold text-gray-900 tracking-tight leading-tight">
                        <span className="text-gray-300 mr-3 -ml-8 absolute">#</span>
                        {post.meta.title}
                    </h1>
                    {post.meta.description && (
                        <p className="text-gray-600 font-sans tracking-wide text-lg border-l-4 border-accent-300 pl-5 mt-6 py-1">
                            {post.meta.description}
                        </p>
                    )}
                </header>

                <div className="p-8 md:p-12 prose prose-slate max-w-none font-sans 
            prose-p:text-gray-700 prose-p:leading-loose
            prose-headings:font-mono prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-gray-900
            prose-a:text-link prose-a:no-underline hover:prose-a:underline hover:prose-a:decoration-2 hover:prose-a:decoration-link-light
            prose-code:font-mono prose-code:bg-accent-50 prose-code:text-accent prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:border prose-code:border-accent-100 prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-pre:font-mono prose-pre:rounded-xl prose-pre:shadow-inner
            prose-blockquote:border-l-4 prose-blockquote:border-gray-200 prose-blockquote:bg-gray-50/50 prose-blockquote:py-2 prose-blockquote:px-5 prose-blockquote:not-italic prose-blockquote:rounded-r-xl
            prose-img:rounded-xl prose-img:shadow-sm prose-img:border prose-img:border-gray-100
        ">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeSanitize]}
                    >
                        {post.content}
                    </ReactMarkdown>
                </div>
            </TerminalCard>
        </article>
    );
}

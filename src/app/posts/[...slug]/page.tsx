import { getPostBySlugArray } from '@/lib/markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import 'highlight.js/styles/github.css';

export const dynamic = 'force-dynamic';

const sanitizeSchema = {
    ...defaultSchema,
    attributes: {
        ...defaultSchema.attributes,
        code: [...(defaultSchema.attributes?.code || []), 'className'],
        span: [...(defaultSchema.attributes?.span || []), 'className'],
    },
};

export default function PostPage({ params }: { params: { slug: string[] } }) {
    const post = getPostBySlugArray(params.slug);

    if (!post) {
        notFound();
    }

    return (
        <article className="mx-auto max-w-3xl animate-in pb-16 duration-500 fade-in slide-in-from-bottom-4">
            <Link
                href="/blog"
                className="mb-6 inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-gray-200 bg-white/85 px-3 py-2 text-sm font-medium text-gray-600 shadow-button transition hover:border-gray-300 hover:bg-white hover:text-gray-900"
            >
                <ArrowLeft className="h-4 w-4 text-accent" />
                返回归档
            </Link>

            <header className="rounded-lg border border-gray-200 bg-white/90 p-6 shadow-token-card md:p-10">
                <div className="mb-5 flex items-center gap-2 font-mono text-xs text-gray-500">
                    <CalendarDays className="h-4 w-4 text-accent" />
                    <time>{post.meta.date || 'UNTRACKED'}</time>
                </div>
                <h1 className="text-3xl font-semibold leading-tight text-gray-900 md:text-5xl">
                    {post.meta.title}
                </h1>
                {post.meta.description ? (
                    <p className="mt-6 border-l-2 border-accent-300 pl-5 text-lg leading-8 text-gray-600">
                        {post.meta.description}
                    </p>
                ) : null}
            </header>

            <div
                className="prose prose-slate mt-6 max-w-none rounded-lg border border-gray-200 bg-white/95 p-6 shadow-token-card md:p-10
                prose-a:text-link prose-a:no-underline hover:prose-a:underline hover:prose-a:decoration-2 hover:prose-a:decoration-link-light
                prose-blockquote:rounded-r-lg prose-blockquote:border-l-4 prose-blockquote:border-gray-200 prose-blockquote:bg-gray-50/70 prose-blockquote:px-5 prose-blockquote:py-2 prose-blockquote:not-italic
                prose-code:rounded-md prose-code:border prose-code:border-accent-100 prose-code:bg-accent-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-accent prose-code:before:content-none prose-code:after:content-none
                prose-headings:font-mono prose-headings:font-semibold prose-headings:text-gray-900
                prose-img:rounded-lg prose-img:border prose-img:border-gray-100 prose-img:shadow-sm
                prose-p:leading-loose prose-p:text-gray-700
                prose-pre:rounded-lg prose-pre:border prose-pre:border-gray-200 prose-pre:bg-[#f6f8fa] prose-pre:font-mono prose-pre:text-[#24292e] prose-pre:shadow-sm
                [&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[inherit]"
            >
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[[rehypeSanitize, sanitizeSchema], rehypeHighlight]}
                >
                    {post.content}
                </ReactMarkdown>
            </div>
        </article>
    );
}

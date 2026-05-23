import { getPostBySlugArray } from '@/lib/markdown';
import { MarkdownContent } from '@/app/components/markdown';
import { PageHero } from '@/app/components/ui';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CalendarDays } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function PostPage({ params }: { params: { slug: string[] } }) {
    const post = getPostBySlugArray(params.slug);

    if (!post) {
        notFound();
    }

    return (
        <article className="mx-auto max-w-3xl pb-16">
            <Link
                href="/blog"
                className="mb-8 inline-flex min-h-[40px] items-center gap-2 rounded-token-button border border-border bg-surface px-3 py-2 text-sm font-medium text-muted transition-colors duration-token-fast hover:border-border-focus hover:text-fg"
            >
                <ArrowLeft className="h-4 w-4 text-subtle" />
                返回归档
            </Link>

            <PageHero
                className="pb-8 lg:grid-cols-1"
                eyebrow={(
                    <span className="inline-flex items-center gap-2 text-subtle">
                        <CalendarDays className="h-4 w-4" />
                        <time>{post.meta.date || 'UNTRACKED'}</time>
                    </span>
                )}
                title={post.meta.title}
                description={post.meta.description ? (
                    <p className="border-l-2 border-accent pl-5 text-lg leading-relaxed text-muted">
                        {post.meta.description}
                    </p>
                ) : null}
            />

            <MarkdownContent
                content={post.content}
                className="mt-8 rounded-token-card border border-border bg-surface p-6 md:p-10"
            />
        </article>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Clock3, Eye, Tag } from 'lucide-react';
import { MarkdownContent } from '@/app/components/markdown';
import type { Frontmatter } from '@/app/types/article';
import { getArticleKindLabel, getArticleStatusLabel } from '@/lib/article-metadata';

interface PreviewPaneProps {
  content: string;
  frontmatter?: Frontmatter;
  readingMinutes?: number;
}

export function PreviewPane({ content, frontmatter, readingMinutes }: PreviewPaneProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="h-full overflow-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-3/4 rounded bg-surface"></div>
          <div className="h-4 w-full rounded bg-surface"></div>
          <div className="h-4 w-5/6 rounded bg-surface"></div>
          <div className="h-4 w-4/6 rounded bg-surface"></div>
        </div>
      </div>
    );
  }

  return (
    <div data-preview-pane className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex min-h-11 items-center justify-between border-b border-border bg-background/80 px-4">
        <div className="flex items-center gap-2 text-sm font-medium text-fg">
          <Eye className="h-4 w-4 text-subtle" />
          预览
        </div>
        <span className="font-mono text-xs text-subtle">rendered markdown</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {content.trim() ? (
          <div className="min-h-full p-6">
            {frontmatter ? (
              <header className="mb-6 border-b border-border pb-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
                  <span className="rounded-token-badge border border-border bg-surface px-2 py-1">
                    {getArticleKindLabel(frontmatter.kind)}
                  </span>
                  <span className="rounded-token-badge border border-border bg-surface px-2 py-1">
                    {getArticleStatusLabel(frontmatter.status)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {frontmatter.date || 'UNTRACKED'}
                  </span>
                  {frontmatter.updatedDate ? (
                    <span>修订 {frontmatter.updatedDate}</span>
                  ) : null}
                  {readingMinutes ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {readingMinutes} 分钟
                    </span>
                  ) : null}
                </div>
                {frontmatter.title ? (
                  <h1 className="mt-3 text-2xl font-semibold text-fg">{frontmatter.title}</h1>
                ) : null}
                {frontmatter.description ? (
                  <p className="mt-2 text-sm leading-6 text-muted">{frontmatter.description}</p>
                ) : null}
                {frontmatter.tags.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-muted">
                    <Tag className="mt-1 h-3.5 w-3.5 text-subtle" />
                    {frontmatter.tags.map((tag) => (
                      <span key={tag} className="rounded-token-badge bg-warm-50 px-2 py-1">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </header>
            ) : null}
            <MarkdownContent content={content} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-sm text-subtle">
            预览会在这里显示
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { MarkdownContent } from '@/app/components/markdown';

interface PreviewPaneProps {
  content: string;
}

export function PreviewPane({ content }: PreviewPaneProps) {
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
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex min-h-11 items-center justify-between border-b border-border bg-background/80 px-4">
        <div className="flex items-center gap-2 text-sm font-medium text-fg">
          <Eye className="h-4 w-4 text-subtle" />
          预览
        </div>
        <span className="font-mono text-xs text-subtle">rendered markdown</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {content.trim() ? (
          <MarkdownContent content={content} className="min-h-full p-6" />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-sm text-subtle">
            预览会在这里显示
          </div>
        )}
      </div>
    </div>
  );
}

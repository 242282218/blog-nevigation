'use client';

import {
  BookOpen,
  Brain,
  Bug,
  Clock3,
  FileText,
  FolderGit2,
  NotebookPen,
  Rocket,
} from 'lucide-react';
import { articleTemplates } from '@/lib/templates';
import { cn } from '@/lib/utils';

interface TemplateSelectorProps {
  onSelect: (templateId: string) => void;
  selectedId?: string | null;
  compact?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  BookOpen: <BookOpen className="w-6 h-6" />,
  Brain: <Brain className="w-6 h-6" />,
  Bug: <Bug className="w-6 h-6" />,
  NotebookPen: <NotebookPen className="w-6 h-6" />,
  FolderGit2: <FolderGit2 className="w-6 h-6" />,
  Rocket: <Rocket className="w-6 h-6" />,
  FileText: <FileText className="w-6 h-6" />,
};

export function TemplateSelector({ onSelect, selectedId, compact = false }: TemplateSelectorProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', compact ? 'xl:grid-cols-3' : 'lg:grid-cols-3')}>
      {articleTemplates.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelect(template.id)}
          className={cn(
            'group rounded-token-card border bg-surface p-4 text-left shadow-token-card transition-all hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-token-card-hover focus:ring-2 focus:ring-link focus:ring-offset-2',
            selectedId === template.id ? 'border-accent-300 ring-2 ring-accent-100' : 'border-border'
          )}
        >
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-accent-200 bg-accent-50 p-3 text-accent transition-colors group-hover:bg-accent-100">
              {iconMap[template.icon] || <FileText className="w-6 h-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-token-caps text-subtle">
                    {template.category || 'Template'}
                  </p>
                  <h3 className="mt-1 font-medium text-fg transition-colors group-hover:text-accent">
                    {template.name}
                  </h3>
                </div>
                {template.estimatedMinutes ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-token-badge border border-border bg-background px-2 py-1 text-xs text-subtle">
                    <Clock3 className="h-3 w-3" />
                    {template.estimatedMinutes}m
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted line-clamp-2">
                {template.description}
              </p>
              {template.highlights?.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {template.highlights.slice(0, 3).map((highlight) => (
                    <span
                      key={highlight}
                      className="rounded-token-badge bg-warm-50 px-2 py-1 text-xs text-muted"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

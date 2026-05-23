import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeroProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
}

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  aside,
  className,
}: PageHeroProps) {
  const gridClass = aside
    ? 'lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end'
    : 'lg:grid-cols-1';

  return (
    <section
      className={cn(
        'grid gap-8 border-b border-border pb-10 md:pb-12',
        gridClass,
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-4 font-mono text-xs uppercase tracking-token-caps text-accent">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="max-w-4xl font-serif text-4xl font-medium leading-tight tracking-token-tight text-fg md:text-5xl">
          {title}
        </h1>
        {description ? (
          <div className="mt-5 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
            {description}
          </div>
        ) : null}
        {actions ? (
          <div className="mt-8 flex flex-wrap gap-3">
            {actions}
          </div>
        ) : null}
      </div>
      {aside ? (
        <div className="lg:justify-self-end">
          {aside}
        </div>
      ) : null}
    </section>
  );
}

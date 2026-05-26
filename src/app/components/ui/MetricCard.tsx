import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'light' | 'dark';
  className?: string;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = 'light',
  className,
}: MetricCardProps) {
  const isDark = tone === 'dark';

  return (
    <div
      className={cn(
        'flex min-h-12 items-center justify-between rounded-token-card border px-3 py-2.5',
        isDark
          ? 'border-white/10 bg-white/[0.04] text-surface'
          : 'border-border bg-surface text-fg',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon className={cn('h-3.5 w-3.5 shrink-0', isDark ? 'text-accent-soft' : 'text-accent')} />
        <span className={cn('truncate font-mono text-xs', isDark ? 'text-warm-400' : 'text-subtle')}>
          {label}
        </span>
      </div>
      <span className={cn('font-mono text-base', isDark ? 'text-surface' : 'text-fg')}>
        {value}
      </span>
    </div>
  );
}

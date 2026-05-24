import { cn } from '@/lib/utils';

interface PostCardProps {
    title: string;
    description?: string;
    date?: string;
    href: string;
    className?: string;
}

export function PostCard({ title, description, date, href, className }: PostCardProps) {
    return (
        <a
            href={href}
            className={cn(
                "group block rounded-token-card border border-border bg-surface-elevated p-5",
                "transition-shadow duration-token-normal ease-token-out",
                "hover:shadow-token-card-hover hover:border-accent-200",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                className
            )}
        >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-fg transition-colors duration-token-fast group-hover:text-accent">
                        {title}
                    </h3>
                    {description && (
                        <p className="mt-1.5 text-sm leading-relaxed text-muted line-clamp-2">
                            {description}
                        </p>
                    )}
                </div>
                {date && (
                    <time className="shrink-0 rounded-token-badge bg-surface px-2.5 py-1 font-mono text-xs text-subtle border border-border">
                        {date}
                    </time>
                )}
            </div>
        </a>
    );
}

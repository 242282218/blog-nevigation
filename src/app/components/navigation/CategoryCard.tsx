import { ArrowUpRight, Link2, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
    title: string;
    description: string;
    url: string;
    tags: string[];
    className?: string;
}

function getHostname(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

export function CategoryCard({ title, description, url, tags, className }: CategoryCardProps) {
    const hostname = getHostname(url);
    const visibleTags = tags.slice(0, 2);
    const hiddenTagCount = Math.max(tags.length - visibleTags.length, 0);

    return (
        <div
            className={cn(
                "group h-full rounded-token-card border border-border bg-surface-elevated p-3",
                "transition duration-token-normal ease-token-out",
                "hover:-translate-y-0.5 hover:border-accent-200 hover:shadow-token-card-hover",
                "focus-within:border-link-light focus-within:shadow-token-md",
                className
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <h4 className="truncate text-base font-semibold leading-snug tracking-token-normal text-fg transition-colors group-hover:text-accent-700">
                        {title}
                    </h4>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                        <Link2 className="h-3 w-3 shrink-0 text-accent transition-colors group-hover:text-link" />
                        <span className="truncate font-mono text-xs text-subtle">{hostname}</span>
                    </div>
                </div>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-token-button border border-border-soft bg-bg text-subtle">
                    <ArrowUpRight className="h-3 w-3 transition-transform duration-token-fast group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
            </div>

            <p className="mt-2 line-clamp-1 text-sm leading-relaxed text-muted">
                {description || hostname}
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5">
                {visibleTags.length > 0 ? (
                    <>
                        {visibleTags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-1 rounded-token-full border border-border-soft bg-bg px-2 py-0.5 text-xs text-subtle"
                            >
                                <Tag className="h-3 w-3" />
                                {tag}
                            </span>
                        ))}
                        {hiddenTagCount > 0 ? (
                            <span className="rounded-token-full border border-border-soft bg-bg px-2 py-0.5 font-mono text-xs text-subtle">
                                +{hiddenTagCount}
                            </span>
                        ) : null}
                    </>
                ) : (
                    <span className="rounded-token-full border border-border-soft bg-surface/72 px-2 py-0.5 font-mono text-xs text-subtle">
                        untagged
                    </span>
                )}
            </div>
        </div>
    );
}

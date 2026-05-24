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
    const visibleTags = tags.slice(0, 3);

    return (
        <div
            className={cn(
                "group h-full overflow-hidden rounded-token-card border border-border bg-surface-elevated",
                "transition duration-token-normal ease-token-out",
                "hover:-translate-y-0.5 hover:border-accent-200 hover:shadow-token-card-hover",
                "focus-within:border-link-light focus-within:shadow-token-md",
                className
            )}
        >
            <div className="flex items-center justify-between border-b border-border-soft bg-bg px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-accent transition-colors group-hover:text-link" />
                    <span className="truncate font-mono text-xs text-subtle">{hostname}</span>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 rounded-token-full border border-border-soft bg-surface px-2 py-1 font-mono text-[0.68rem] uppercase tracking-token-caps text-subtle">
                    open
                    <ArrowUpRight className="h-3 w-3 transition-transform duration-token-fast group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
            </div>

            <div className="flex h-full flex-col gap-4 p-5">
                <h4 className="min-w-0 text-lg font-semibold leading-snug tracking-token-normal text-fg transition-colors group-hover:text-accent-700">
                    {title}
                </h4>

                <p className="line-clamp-3 text-sm leading-7 text-muted">
                    {description || hostname}
                </p>

                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    {visibleTags.length > 0 ? (
                        visibleTags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-1 rounded-token-full border border-border-soft bg-bg px-2.5 py-1 text-xs text-subtle"
                            >
                                <Tag className="h-3 w-3" />
                                {tag}
                            </span>
                        ))
                    ) : (
                        <span className="rounded-token-full border border-border-soft bg-surface/72 px-2.5 py-1 font-mono text-xs text-subtle">
                            untagged
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

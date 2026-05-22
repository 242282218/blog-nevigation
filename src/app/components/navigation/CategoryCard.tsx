import { ExternalLink, Link2, Tag } from 'lucide-react';
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
                "group h-full overflow-hidden rounded-lg border border-gray-200 bg-white/90",
                "transition-all duration-300 hover:border-link-light hover:shadow-token-card-hover",
                "focus-within:border-link-light focus-within:shadow-md",
                className
            )}
        >
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                    <Link2 className="h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-link transition-colors" />
                    <span className="truncate text-xs font-mono text-gray-500">{hostname}</span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5 font-mono text-xs text-gray-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-link-500" />
                    link
                </div>
            </div>

            <div className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                    <h4 className="min-w-0 text-base font-semibold text-gray-800 transition-colors group-hover:text-link">
                        {title}
                    </h4>
                    <ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-link" />
                </div>

                <p className="line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-gray-500">
                    {description || hostname}
                </p>

                <div className="mt-auto flex flex-wrap gap-1.5">
                    {visibleTags.length > 0 ? (
                        visibleTags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-500"
                            >
                                <Tag className="h-3 w-3 text-gray-400" />
                                {tag}
                            </span>
                        ))
                    ) : (
                        <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-mono text-gray-400">
                            untagged
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

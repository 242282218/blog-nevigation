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
                "group relative block overflow-hidden rounded-lg border border-gray-200 bg-white/90 p-5",
                "transition-all duration-300 hover:border-accent-300 hover:shadow-token-card-hover",
                className
            )}
        >
            <div className="absolute bottom-0 left-0 top-0 w-1 bg-transparent transition-colors group-hover:bg-accent" />
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div className="flex-1">
                    <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-gray-800 transition-colors group-hover:text-accent">
                        {title}
                    </h3>
                    {description && (
                        <p className="text-sm leading-6 text-gray-500">
                            {description}
                        </p>
                    )}
                </div>
                {date && (
                    <div className="flex shrink-0 items-center gap-2 md:flex-col md:items-end">
                        <time className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 font-mono text-xs font-medium text-gray-500">
                            {date}
                        </time>
                    </div>
                )}
            </div>
        </a>
    );
}

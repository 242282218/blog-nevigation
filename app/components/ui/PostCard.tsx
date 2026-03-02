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
                "group block bg-white border border-gray-100 hover:border-accent hover:shadow-md",
                "transition-all duration-300 rounded-xl p-6 relative overflow-hidden",
                className
            )}
        >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-accent transition-colors" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1">
                    <h3 className="text-xl font-mono font-bold text-gray-800 group-hover:text-accent transition-colors mb-2 flex items-center gap-2">
                        {title}
                    </h3>
                    {description && (
                        <p className="text-sm text-gray-500 font-sans tracking-wide">
                            {description}
                        </p>
                    )}
                </div>
                {date && (
                    <div className="shrink-0 flex items-center md:flex-col items-end gap-2">
                        <time className="text-xs font-mono text-gray-500 font-medium bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
                            {date}
                        </time>
                    </div>
                )}
            </div>
        </a>
    );
}

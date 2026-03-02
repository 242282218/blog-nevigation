import { cn } from '@/lib/utils';

interface CategoryCardProps {
    name: string;
    slug: string;
    count: number;
    color?: string;
    className?: string;
}

export function CategoryCard({ name, slug, count, color = 'text-nav-purple', className }: CategoryCardProps) {
    return (
        <div
            className={cn(
                "group bg-white border border-gray-200 rounded-lg overflow-hidden",
                "hover:border-gray-300 hover:shadow-md transition-all duration-300",
                className
            )}
        >
            {/* Header - 路径和标签 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/30">
                <div className="flex items-center gap-2">
                    <svg
                        className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        />
                    </svg>
                    <span className="text-sm font-mono text-gray-500">{slug}/</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    <span className="text-xs font-mono text-gray-400">module</span>
                </div>
            </div>

            {/* Body - JSON 风格内容 */}
            <div className="p-4 font-mono text-sm">
                <div className="space-y-1">
                    <div>
                        <span className="text-purple-600">"name"</span>
                        <span className="text-gray-400"> : </span>
                        <span className="text-gray-700">"{name}"</span>
                    </div>
                    <div>
                        <span className="text-purple-600">"exports"</span>
                        <span className="text-gray-400"> : </span>
                        <span className="text-gray-700">{count}</span>
                        <span className="text-gray-300"> // 个工具</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { cn } from '@/lib/utils';
import { MacButtons } from './MacButtons';

interface TerminalCardProps {
    title?: string;
    command?: string;
    children: React.ReactNode;
    opacity?: 1 | 0.5 | 0.4;
    className?: string;
    headerClassName?: string;
    bodyClassName?: string;
}

export function TerminalCard({
    title,
    command,
    children,
    opacity = 1,
    className,
    headerClassName,
    bodyClassName,
}: TerminalCardProps) {
    return (
        <div
            className={cn(
                "bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden",
                "transition-shadow hover:shadow-md",
                className
            )}
        >
            <div
                className={cn(
                    "border-b border-gray-100 bg-gray-50/80 px-5 py-3.5 flex items-center gap-4",
                    headerClassName
                )}
            >
                <MacButtons opacity={opacity} />
                {(title || command) && (
                    <div className="font-mono text-xs text-gray-500 flex items-center gap-2 font-medium">
                        {command && (
                            <>
                                <span className="text-green-500 font-bold">$</span> {command}
                            </>
                        )}
                        {title && !command && title}
                    </div>
                )}
            </div>
            <div className={cn("p-8 md:p-10", bodyClassName)}>
                {children}
            </div>
        </div>
    );
}

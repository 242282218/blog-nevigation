import { cn } from '@/lib/utils';
import { MacButtons } from '../terminal/MacButtons';
import { ReactNode } from 'react';

interface SectionHeaderProps {
    title: ReactNode;
    subtitle?: string;
    command?: string;
    showMacButtons?: boolean;
    macButtonOpacity?: 1 | 0.5 | 0.4;
    className?: string;
    titleClassName?: string;
}

export function SectionHeader({
    title,
    subtitle,
    command,
    showMacButtons = true,
    macButtonOpacity = 1,
    className,
    titleClassName,
}: SectionHeaderProps) {
    return (
        <div
            className={cn(
                "border-b border-gray-100 bg-gray-50/80 px-5 py-3.5 flex items-center gap-4",
                className
            )}
        >
            {showMacButtons && <MacButtons opacity={macButtonOpacity} />}
            <div className="flex-1 flex items-center justify-between">
                <h2 className={cn(
                    "text-2xl font-mono font-bold flex items-center gap-3 text-gray-800",
                    titleClassName
                )}>
                    {title}
                </h2>
                {subtitle && (
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200 hidden sm:block">
                        {subtitle}
                    </span>
                )}
            </div>
            {command && (
                <div className="font-mono text-xs text-gray-500 flex items-center gap-2 font-medium">
                    <span className="text-terminal-prompt font-bold">$</span> {command}
                </div>
            )}
        </div>
    );
}

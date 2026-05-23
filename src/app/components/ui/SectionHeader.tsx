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
                "border-b border-border-soft bg-surface/80 px-5 py-3.5 flex items-center gap-4",
                className
            )}
        >
            {showMacButtons && <MacButtons opacity={macButtonOpacity} />}
            <div className="flex-1 flex items-center justify-between">
                <h2 className={cn(
                    "text-xl font-serif font-medium flex items-center gap-3 text-fg",
                    titleClassName
                )}>
                    {title}
                </h2>
                {subtitle && (
                    <span className="text-xs font-mono bg-surface text-subtle px-2 py-1 rounded-token-badge border border-border-soft hidden sm:block">
                        {subtitle}
                    </span>
                )}
            </div>
            {command && (
                <div className="font-mono text-xs text-subtle flex items-center gap-2 font-medium">
                    <span className="text-terminal-prompt font-medium">$</span> {command}
                </div>
            )}
        </div>
    );
}

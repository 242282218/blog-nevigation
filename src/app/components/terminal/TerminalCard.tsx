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
                "overflow-hidden rounded-token-card border border-border bg-surface",
                "transition-shadow duration-token-normal hover:shadow-token-md",
                className
            )}
        >
            <div
                className={cn(
                    "flex items-center gap-4 border-b border-border-soft bg-surface/80 px-5 py-3.5",
                    headerClassName
                )}
            >
                <MacButtons opacity={opacity} />
                {(title || command) && (
                    <div className="font-mono text-xs text-subtle flex items-center gap-2 font-medium">
                        {command && (
                            <>
                                <span className="text-terminal-prompt font-medium">$</span> {command}
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

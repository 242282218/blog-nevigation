import { cn } from '@/lib/utils';

interface CommandPromptProps {
    command?: string;
    path?: string;
    className?: string;
    showPath?: boolean;
}

export function CommandPrompt({
    command = 'pwd',
    path,
    className,
    showPath = true,
}: CommandPromptProps) {
    return (
        <div
            className={cn(
                "inline-flex items-center gap-2 px-3.5 py-1.5 bg-surface border border-border rounded-token-card font-mono text-sm text-subtle",
                className
            )}
        >
            <span className="text-terminal-prompt font-medium">$</span>
            {command}
            {showPath && path && (
                <>
                    : <span className="text-accent">{path}</span>
                </>
            )}
        </div>
    );
}

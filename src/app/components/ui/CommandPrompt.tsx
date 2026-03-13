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
                "inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm font-mono text-sm text-gray-500",
                className
            )}
        >
            <span className="text-green-500 font-bold">$</span>
            {command}
            {showPath && path && (
                <>
                    : <span className="text-orange-500">{path}</span>
                </>
            )}
        </div>
    );
}

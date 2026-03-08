import { cn } from '@/lib/utils';

interface MacButtonsProps {
    opacity?: 1 | 0.5 | 0.4;
    className?: string;
}

export function MacButtons({ opacity = 1, className }: MacButtonsProps) {
    return (
        <div className={cn("flex gap-2", className)}>
            <div
                className="w-3 h-3 rounded-full shadow-sm border border-black/10"
                style={{ backgroundColor: 'var(--color-mac-red)', opacity }}
            />
            <div
                className="w-3 h-3 rounded-full shadow-sm border border-black/10"
                style={{ backgroundColor: 'var(--color-mac-yellow)', opacity }}
            />
            <div
                className="w-3 h-3 rounded-full shadow-sm border border-black/10"
                style={{ backgroundColor: 'var(--color-mac-green)', opacity }}
            />
        </div>
    );
}

import { cn } from '@/lib/utils';

interface SectionProps {
    children: React.ReactNode;
    className?: string;
    spacing?: 'sm' | 'md' | 'lg';
}

const spacingMap = {
    sm: 'space-y-4',
    md: 'space-y-8',
    lg: 'space-y-16',
};

export function Section({ children, className, spacing = 'md' }: SectionProps) {
    return (
        <section className={cn(spacingMap[spacing], className)}>
            {children}
        </section>
    );
}

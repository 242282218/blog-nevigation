import { cn } from '@/lib/utils';

interface PageContainerProps {
    children: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '5xl' | '7xl' | 'content' | 'wide';
    className?: string;
    as?: 'main' | 'section' | 'div';
}

const maxWidthMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '5xl': 'max-w-5xl',
    '7xl': 'max-w-7xl',
    content: 'max-w-4xl',
    wide: 'max-w-5xl',
};

export function PageContainer({
    children,
    maxWidth = '5xl',
    className,
    as: Component = 'main',
}: PageContainerProps) {
    return (
        <Component
            className={cn(
                "mx-auto px-4 sm:px-6 py-10 md:py-16",
                maxWidthMap[maxWidth],
                className
            )}
        >
            {children}
        </Component>
    );
}

'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/app/components/header';
import { cn } from '@/lib/utils';

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const pathname = usePathname();
    const isEditorRoute = pathname.startsWith('/editor');

    return (
        <>
            {!isEditorRoute && <Header />}
            <main
                id="main-content"
                className={cn(
                    isEditorRoute
                        ? 'min-h-screen'
                        : 'mx-auto min-h-[calc(100vh-4rem)] max-w-token-wide px-4 py-8 sm:px-6 md:py-12'
                )}
            >
                {children}
            </main>
        </>
    );
}

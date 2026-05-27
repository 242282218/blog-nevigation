import type { Metadata } from 'next';
import { JetBrains_Mono, IBM_Plex_Sans, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { AppShell } from './components/layout';
import { readSiteSettingsFromDiskAsync } from '@/lib/editor-data-storage';

const jetbrains = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-jetbrains-mono',
});

const ibmPlex = IBM_Plex_Sans({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-ibm-plex',
});

const sourceSerif = Source_Serif_4({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    variable: '--font-source-serif',
});

export async function generateMetadata(): Promise<Metadata> {
    const settings = await readSiteSettingsFromDiskAsync();

    return {
        title: {
            template: `%s | ${settings.siteName}`,
            default: settings.siteName,
        },
        description: settings.siteDescription,
    };
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="zh-CN" className={`${jetbrains.variable} ${ibmPlex.variable} ${sourceSerif.variable}`}>
            <body className="min-h-screen antialiased">
                <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-link focus:text-white focus:rounded-lg focus:shadow-lg">
                    跳转到主内容
                </a>
                <AppShell>{children}</AppShell>
            </body>
        </html>
    );
}

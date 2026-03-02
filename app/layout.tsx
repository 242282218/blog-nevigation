import type { Metadata } from 'next';
import { JetBrains_Mono, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { Header } from './components/header';

const jetbrains = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-jetbrains-mono',
});

const ibmPlex = IBM_Plex_Sans({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-ibm-plex',
});

export const metadata: Metadata = {
    title: 'Blog / Timeline',
    description: 'A developer focused blog and timeline interface',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="zh-CN" className={`${jetbrains.variable} ${ibmPlex.variable}`}>
            <body className="antialiased min-h-screen selection:bg-accent-200">
                <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-link focus:text-white focus:rounded-lg focus:shadow-lg">
                    跳转到主内容
                </a>
                <Header />
                <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-16">
                    {children}
                </main>
            </body>
        </html>
    );
}

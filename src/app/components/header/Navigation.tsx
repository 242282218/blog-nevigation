import Link from 'next/link';
import { BookOpen, Compass } from 'lucide-react';

const navItems = [
    { text: '导航', href: '/navigation', icon: Compass },
    { text: '博客', href: '/blog', icon: BookOpen },
];

export function Navigation() {
    return (
        <nav className="flex items-center gap-2 md:gap-3" aria-label="主导航">
            {navItems.map((item) => {
                const Icon = item.icon;

                return (
                <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white/85 px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-button transition-all hover:border-gray-300 hover:bg-white hover:text-gray-900 focus:ring-2 focus:ring-link focus:ring-offset-2 sm:px-3.5"
                >
                    <Icon className="h-3.5 w-3.5 text-accent" />
                    {item.text}
                </Link>
                );
            })}
        </nav>
    );
}

import Link from 'next/link';
import { BookOpen, Compass } from 'lucide-react';

const navItems = [
    { text: '导航', href: '/navigation', icon: Compass },
    { text: '博客', href: '/blog', icon: BookOpen },
];

export function Navigation() {
    return (
        <nav className="flex items-center gap-1.5 md:gap-2" aria-label="主导航">
            {navItems.map((item) => {
                const Icon = item.icon;

                return (
                <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-9 items-center gap-1.5 rounded-token-button border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted transition-colors duration-token-fast hover:border-border-focus hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:px-3"
                >
                    <Icon className="h-3.5 w-3.5 text-subtle" />
                    {item.text}
                </Link>
                );
            })}
        </nav>
    );
}

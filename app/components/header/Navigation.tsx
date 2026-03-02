import Link from 'next/link';

const navItems = [
    { text: '导航', href: '/navigation', color: 'text-nav-purple' },
    { text: '博客', href: '/blog', color: 'text-nav-green' },
];

export function Navigation() {
    return (
        <nav className="hidden md:flex items-center gap-3" aria-label="主导航">
            {navItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className="px-3.5 py-1.5 text-xs font-mono border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50/50 transition-all bg-white shadow-button flex items-center gap-1.5 text-gray-600 focus:ring-2 focus:ring-link focus:ring-offset-2"
                >
                    <span className={item.color}>$</span> {item.text}
                </Link>
            ))}
        </nav>
    );
}

import Link from 'next/link';
import Image from 'next/image';

export function TypewriterLogo() {
    return (
        <Link
            href="/"
            className="group flex items-center gap-2.5 rounded-token-button border border-border bg-surface px-2.5 py-1.5 text-sm font-medium text-fg transition-colors duration-token-fast hover:border-accent-200 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
            <Image src="/logo.svg" alt="" width={24} height={24} className="h-6 w-6 rounded-sm" priority />
            <span className="hidden text-muted transition-colors group-hover:text-accent sm:inline">
                blog.navigation
            </span>
        </Link>
    );
}

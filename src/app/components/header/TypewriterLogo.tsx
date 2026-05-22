import Link from 'next/link';
import Image from 'next/image';

export function TypewriterLogo() {
    return (
        <Link
            href="/"
            className="group flex items-center gap-2 rounded-lg border border-gray-200 bg-white/85 px-2.5 py-1.5 text-sm font-semibold text-gray-800 shadow-button transition-all hover:border-accent-300 hover:bg-white focus:ring-2 focus:ring-link focus:ring-offset-2"
        >
            <Image src="/logo.svg" alt="" width={28} height={28} className="h-7 w-7 rounded-md" priority />
            <span className="hidden text-gray-700 transition-colors group-hover:text-accent sm:inline">
                blog.navigation
            </span>
        </Link>
    );
}

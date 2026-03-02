import Link from 'next/link';

export function TypewriterLogo() {
    return (
        <Link
            href="/"
            className="group font-mono font-medium text-sm flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-accent-300 hover:bg-accent-50/30 transition-all focus:ring-2 focus:ring-link focus:ring-offset-2"
        >
            <span className="text-accent group-hover:-translate-x-0.5 transition-transform">←</span>
            <span className="text-gray-600 group-hover:text-accent transition-colors">cd ..</span>
            <span className="w-1.5 h-4 bg-accent animate-pulse rounded-sm opacity-60 group-hover:opacity-100 transition-opacity" />
        </Link>
    );
}

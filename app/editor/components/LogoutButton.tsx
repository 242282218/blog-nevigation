'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogout = async () => {
        setIsSubmitting(true);

        try {
            await fetch('/api/editor-auth', {
                method: 'DELETE',
            });
        } finally {
            router.replace('/editor/login');
            router.refresh();
            setIsSubmitting(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleLogout}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
            <LogOut className="h-4 w-4" />
            <span>{isSubmitting ? '退出中...' : '退出'}</span>
        </button>
    );
}

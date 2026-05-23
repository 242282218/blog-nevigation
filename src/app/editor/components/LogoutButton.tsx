'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { EditorButton } from './EditorShell';

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
        <EditorButton
            type="button"
            onClick={handleLogout}
            disabled={isSubmitting}
        >
            <LogOut className="h-4 w-4" />
            <span>{isSubmitting ? '退出中...' : '退出'}</span>
        </EditorButton>
    );
}

'use client';

import { useState, useEffect } from 'react';

function formatTime(date: Date) {
    return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

export function StatusIndicator() {
    const [time, setTime] = useState<string | null>(null);

    useEffect(() => {
        const updateTime = () => setTime(formatTime(new Date()));

        updateTime();
        const interval = setInterval(() => {
            updateTime();
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
                <span className="text-xs font-mono text-gray-500">online</span>
            </div>
            <div className="text-xs font-mono text-gray-600 tabular-nums border-l border-gray-200 pl-3">
                {time ?? '--:--'}
            </div>
        </div>
    );
}

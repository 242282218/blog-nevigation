'use client';

import { useState, useEffect } from 'react';

// Linux commands to type
const commands = [
    'ls -la',
    'cd ~/projects',
    'git status',
    'npm run dev',
    'docker ps',
    'cat README.md',
    'mkdir new-project',
    'echo "Hello World"',
    'curl -I https://api.github.com',
    'tail -f logs/app.log'
];

export default function TypewriterTitle() {
    const [currentCmdIndex, setCurrentCmdIndex] = useState(0);
    const [displayText, setDisplayText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        const currentCmd = commands[currentCmdIndex];
        const typeSpeed = isDeleting ? 50 : 100;
        const pauseTime = 2000;

        if (isPaused) {
            const pauseTimer = setTimeout(() => {
                setIsPaused(false);
                setIsDeleting(true);
            }, pauseTime);
            return () => clearTimeout(pauseTimer);
        }

        if (!isDeleting && displayText === currentCmd) {
            setIsPaused(true);
            return;
        }

        if (isDeleting && displayText === '') {
            setIsDeleting(false);
            setCurrentCmdIndex((prev) => (prev + 1) % commands.length);
            return;
        }

        const timer = setTimeout(() => {
            if (isDeleting) {
                setDisplayText(currentCmd.slice(0, displayText.length - 1));
            } else {
                setDisplayText(currentCmd.slice(0, displayText.length + 1));
            }
        }, typeSpeed);

        return () => clearTimeout(timer);
    }, [displayText, isDeleting, isPaused, currentCmdIndex]);

    return (
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-mono font-bold text-gray-800 tracking-tight leading-tight flex items-center justify-center gap-3 relative z-10 min-h-[1.2em]">
            <span className="text-green-500">$</span>
            <span className="text-gray-700">{displayText}</span>
            <span className="w-2.5 h-6 bg-orange-400 animate-pulse rounded-sm"></span>
        </h1>
    );
}

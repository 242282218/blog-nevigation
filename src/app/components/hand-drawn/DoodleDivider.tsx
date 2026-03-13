'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface DoodleDividerProps {
    className?: string;
    variant?: 'wave' | 'zigzag' | 'scribble' | 'dots' | 'leaves' | 'arrow';
    color?: string;
    thickness?: number;
    animate?: boolean;
}

/**
 * 涂鸦分隔线组件
 * 提供多种手绘风格的分隔线装饰
 */
export const DoodleDivider: React.FC<DoodleDividerProps> = ({
    className = '',
    variant = 'scribble',
    color = '#2d2d2d',
    thickness = 2,
    animate = true,
}) => {
    const renderDivider = () => {
        switch (variant) {
            case 'wave':
                return (
                    <svg viewBox="0 0 200 20" className="w-full h-6" preserveAspectRatio="none">
                        <motion.path
                            d="M0 10 Q 25 5, 50 10 T 100 10 T 150 10 T 200 10"
                            fill="none"
                            stroke={color}
                            strokeWidth={thickness}
                            strokeLinecap="round"
                            initial={animate ? { pathLength: 0 } : undefined}
                            animate={animate ? { pathLength: 1 } : undefined}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                    </svg>
                );
            
            case 'zigzag':
                return (
                    <svg viewBox="0 0 200 20" className="w-full h-6" preserveAspectRatio="none">
                        <motion.path
                            d="M0 10 L 20 5 L 40 15 L 60 5 L 80 15 L 100 5 L 120 15 L 140 5 L 160 15 L 180 5 L 200 10"
                            fill="none"
                            stroke={color}
                            strokeWidth={thickness}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={animate ? { pathLength: 0 } : undefined}
                            animate={animate ? { pathLength: 1 } : undefined}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                    </svg>
                );
            
            case 'scribble':
                return (
                    <svg viewBox="0 0 200 20" className="w-full h-8" preserveAspectRatio="none">
                        <motion.path
                            d="M0 10 Q 10 5, 20 10 T 40 10 Q 50 15, 60 10 T 80 10 Q 90 5, 100 10 T 120 10 Q 130 15, 140 10 T 160 10 Q 170 5, 180 10 T 200 10"
                            fill="none"
                            stroke={color}
                            strokeWidth={thickness}
                            strokeLinecap="round"
                            initial={animate ? { pathLength: 0 } : undefined}
                            animate={animate ? { pathLength: 1 } : undefined}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                        <motion.path
                            d="M5 12 Q 15 7, 25 12 T 45 12 Q 55 17, 65 12 T 85 12 Q 95 7, 105 12 T 125 12 Q 135 17, 145 12 T 165 12 Q 175 7, 185 12 T 205 12"
                            fill="none"
                            stroke={color}
                            strokeWidth={thickness * 0.6}
                            strokeLinecap="round"
                            opacity="0.5"
                            initial={animate ? { pathLength: 0 } : undefined}
                            animate={animate ? { pathLength: 1 } : undefined}
                            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                        />
                    </svg>
                );
            
            case 'dots':
                return (
                    <div className="flex items-center justify-center gap-3">
                        {[...Array(5)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="rounded-full"
                                style={{
                                    width: thickness * 3,
                                    height: thickness * 3,
                                    backgroundColor: color,
                                }}
                                initial={animate ? { scale: 0, opacity: 0 } : undefined}
                                animate={animate ? { scale: 1, opacity: 1 } : undefined}
                                transition={{
                                    duration: 0.3,
                                    delay: i * 0.1,
                                    ease: "easeOut",
                                }}
                            />
                        ))}
                    </div>
                );
            
            case 'leaves':
                return (
                    <svg viewBox="0 0 200 24" className="w-full h-8" preserveAspectRatio="none">
                        {[...Array(4)].map((_, i) => (
                            <motion.g key={i}>
                                <motion.path
                                    d={`M${i * 50 + 15} 12 Q${i * 50 + 25} 5, ${i * 50 + 35} 12 Q${i * 50 + 25} 19, ${i * 50 + 15} 12`}
                                    fill="none"
                                    stroke={color}
                                    strokeWidth={thickness}
                                    initial={animate ? { pathLength: 0, opacity: 0 } : undefined}
                                    animate={animate ? { pathLength: 1, opacity: 1 } : undefined}
                                    transition={{ duration: 0.4, delay: i * 0.15 }}
                                />
                                <motion.line
                                    x1={i * 50 + 25}
                                    y1={12}
                                    x2={i * 50 + 25}
                                    y2={18}
                                    stroke={color}
                                    strokeWidth={thickness * 0.5}
                                    initial={animate ? { pathLength: 0 } : undefined}
                                    animate={animate ? { pathLength: 1 } : undefined}
                                    transition={{ duration: 0.3, delay: i * 0.15 + 0.2 }}
                                />
                            </motion.g>
                        ))}
                    </svg>
                );
            
            case 'arrow':
                return (
                    <div className="flex items-center justify-center">
                        <motion.svg
                            viewBox="0 0 100 20"
                            className="w-24 h-6"
                            initial={animate ? { opacity: 0, x: -20 } : undefined}
                            animate={animate ? { opacity: 1, x: 0 } : undefined}
                            transition={{ duration: 0.5 }}
                        >
                            <motion.line
                                x1="0"
                                y1="10"
                                x2="80"
                                y2="10"
                                stroke={color}
                                strokeWidth={thickness}
                                strokeLinecap="round"
                                initial={animate ? { pathLength: 0 } : undefined}
                                animate={animate ? { pathLength: 1 } : undefined}
                                transition={{ duration: 0.4 }}
                            />
                            <motion.path
                                d="M70 4 L85 10 L70 16"
                                fill="none"
                                stroke={color}
                                strokeWidth={thickness}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={animate ? { pathLength: 0, opacity: 0 } : undefined}
                                animate={animate ? { pathLength: 1, opacity: 1 } : undefined}
                                transition={{ duration: 0.3, delay: 0.3 }}
                            />
                        </motion.svg>
                    </div>
                );
            
            default:
                return null;
        }
    };

    return (
        <div className={`py-4 ${className}`}>
            {renderDivider()}
        </div>
    );
};

export default DoodleDivider;

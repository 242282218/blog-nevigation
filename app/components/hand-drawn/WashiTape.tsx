'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface WashiTapeProps {
    children?: React.ReactNode;
    className?: string;
    color?: 'pink' | 'blue' | 'yellow' | 'green' | 'purple' | 'orange';
    pattern?: 'stripes' | 'dots' | 'grid' | 'waves' | 'solid';
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom';
    rotation?: number;
    width?: string;
    torn?: boolean;
}

/**
 * 和纸胶带组件 - 模拟日本手账风格的装饰胶带
 * 带有半透明质感、图案纹理和撕裂边缘
 */
export const WashiTape: React.FC<WashiTapeProps> = ({
    children,
    className = '',
    color = 'pink',
    pattern = 'stripes',
    position = 'top-left',
    rotation = -3,
    width = '120px',
    torn = true,
}) => {
    const colorMap = {
        pink: { bg: 'rgba(255, 182, 193, 0.7)', pattern: 'rgba(255, 105, 180, 0.4)' },
        blue: { bg: 'rgba(135, 206, 235, 0.7)', pattern: 'rgba(70, 130, 180, 0.4)' },
        yellow: { bg: 'rgba(255, 223, 128, 0.7)', pattern: 'rgba(218, 165, 32, 0.4)' },
        green: { bg: 'rgba(144, 238, 144, 0.7)', pattern: 'rgba(34, 139, 34, 0.4)' },
        purple: { bg: 'rgba(221, 160, 221, 0.7)', pattern: 'rgba(147, 112, 219, 0.4)' },
        orange: { bg: 'rgba(255, 200, 150, 0.7)', pattern: 'rgba(255, 140, 0, 0.4)' },
    };

    const colors = colorMap[color];

    // 生成图案 SVG
    const generatePattern = () => {
        switch (pattern) {
            case 'stripes':
                return (
                    <pattern id={`stripes-${color}`} x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                        <rect width="10" height="10" fill="transparent" />
                        <line x1="5" y1="0" x2="5" y2="10" stroke={colors.pattern} strokeWidth="2" />
                    </pattern>
                );
            case 'dots':
                return (
                    <pattern id={`dots-${color}`} x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
                        <rect width="12" height="12" fill="transparent" />
                        <circle cx="6" cy="6" r="2" fill={colors.pattern} />
                    </pattern>
                );
            case 'grid':
                return (
                    <pattern id={`grid-${color}`} x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
                        <rect width="15" height="15" fill="transparent" />
                        <path d="M 15 0 L 0 0 0 15" fill="none" stroke={colors.pattern} strokeWidth="1" />
                    </pattern>
                );
            case 'waves':
                return (
                    <pattern id={`waves-${color}`} x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
                        <rect width="20" height="10" fill="transparent" />
                        <path d="M0 5 Q 5 0, 10 5 T 20 5" fill="none" stroke={colors.pattern} strokeWidth="1.5" />
                    </pattern>
                );
            default:
                return null;
        }
    };

    // 生成撕裂边缘路径
    const generateTornEdge = (width: number, height: number): string => {
        const points: string[] = [];
        const segments = 20;
        
        // 上边缘
        for (let i = 0; i <= segments; i++) {
            const x = (width / segments) * i;
            const y = Math.random() * 3;
            points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
        }
        
        // 右边缘
        points.push(`L ${width} ${height}`);
        
        // 下边缘（撕裂效果）
        for (let i = segments; i >= 0; i--) {
            const x = (width / segments) * i;
            const y = height - Math.random() * 4;
            points.push(`L ${x} ${y}`);
        }
        
        // 左边缘
        points.push('Z');
        
        return points.join(' ');
    };

    const positionStyles = {
        'top-left': { top: '-15px', left: '20px' },
        'top-right': { top: '-15px', right: '20px' },
        'bottom-left': { bottom: '-15px', left: '20px' },
        'bottom-right': { bottom: '-15px', right: '20px' },
        'top': { top: '-15px', left: '50%', transform: 'translateX(-50%)' },
        'bottom': { bottom: '-15px', left: '50%', transform: 'translateX(-50%)' },
    };

    return (
        <motion.div
            className={`relative ${className}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
            {/* 胶带装饰 */}
            <motion.div
                className="absolute z-20 pointer-events-none"
                style={{
                    ...positionStyles[position],
                    width,
                    height: '32px',
                    transform: `rotate(${rotation}deg)`,
                }}
                whileHover={{ scale: 1.05, rotate: rotation + 2 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
                <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 120 32"
                    preserveAspectRatio="none"
                    style={{ overflow: 'visible' }}
                >
                    <defs>
                        {generatePattern()}
                        
                        {/* 胶带质感滤镜 */}
                        <filter id={`tape-texture-${color}`}>
                            <feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="2" result="noise" />
                            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.3 0" in="noise" result="coloredNoise" />
                            <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="composite" />
                            <feBlend mode="multiply" in="composite" in2="SourceGraphic" />
                        </filter>
                    </defs>
                    
                    {/* 胶带主体 */}
                    <g filter={torn ? `url(#tape-texture-${color})` : undefined}>
                        {torn ? (
                            <path
                                d={generateTornEdge(120, 32)}
                                fill={colors.bg}
                                opacity={0.9}
                            />
                        ) : (
                            <rect width="120" height="32" fill={colors.bg} opacity={0.9} />
                        )}
                        
                        {/* 图案层 */}
                        {pattern !== 'solid' && (
                            <rect
                                width="120"
                                height="32"
                                fill={`url(#${pattern}-${color})`}
                                opacity={0.8}
                                clipPath={torn ? `path('${generateTornEdge(120, 32)}')` : undefined}
                            />
                        )}
                    </g>
                </svg>
            </motion.div>

            {/* 内容 */}
            <div className="relative z-10">{children}</div>
        </motion.div>
    );
};

export default WashiTape;

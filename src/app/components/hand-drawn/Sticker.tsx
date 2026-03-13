'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface StickerProps {
    children: React.ReactNode;
    className?: string;
    shape?: 'circle' | 'square' | 'rounded' | 'star' | 'heart';
    color?: string;
    borderColor?: string;
    rotation?: number;
    peel?: boolean;
    shadow?: boolean;
}

/**
 * 贴纸组件 - 模拟不干胶贴纸效果
 * 带有轻微卷曲、阴影和光泽感
 */
export const Sticker: React.FC<StickerProps> = ({
    children,
    className = '',
    shape = 'rounded',
    color = '#ff6b6b',
    borderColor = '#ffffff',
    rotation = -5,
    peel = true,
    shadow = true,
}) => {
    const shapePaths = {
        circle: 'M50 5 A45 45 0 1 1 50 95 A45 45 0 1 1 50 5 Z',
        square: 'M5 5 L95 5 L95 95 L5 95 Z',
        rounded: 'M20 5 L80 5 Q95 5, 95 20 L95 80 Q95 95, 80 95 L20 95 Q5 95, 5 80 L5 20 Q5 5, 20 5 Z',
        star: 'M50 5 L61 35 L95 35 L68 55 L79 85 L50 65 L21 85 L32 55 L5 35 L39 35 Z',
        heart: 'M50 25 Q30 5, 15 25 Q5 40, 25 60 L50 90 L75 60 Q95 40, 85 25 Q70 5, 50 25 Z',
    };

    const viewBox = shape === 'circle' ? '0 0 100 100' : '0 0 100 100';

    return (
        <motion.div
            className={`relative inline-block ${className}`}
            style={{ transform: `rotate(${rotation}deg)` }}
            initial={{ opacity: 0, scale: 0.8, rotate: rotation - 10 }}
            animate={{ opacity: 1, scale: 1, rotate: rotation }}
            whileHover={{ 
                scale: 1.08, 
                rotate: rotation + 3,
                transition: { type: "spring", stiffness: 300, damping: 15 }
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
            {/* 阴影层 */}
            {shadow && (
                <div
                    className="absolute inset-0 -z-10"
                    style={{
                        transform: 'translate(4px, 4px)',
                        filter: 'blur(3px)',
                    }}
                >
                    <svg viewBox={viewBox} className="w-full h-full">
                        <path
                            d={shapePaths[shape]}
                            fill="rgba(0,0,0,0.2)"
                        />
                    </svg>
                </div>
            )}

            {/* 贴纸主体 */}
            <div className="relative">
                <svg
                    viewBox={viewBox}
                    className="w-full h-full"
                    style={{ overflow: 'visible' }}
                >
                    <defs>
                        {/* 贴纸光泽渐变 */}
                        <linearGradient id={`sticker-shine-${shape}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                            <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                        </linearGradient>

                        {/* 边缘粗糙滤镜 */}
                        <filter id={`sticker-rough-${shape}`}>
                            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
                            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1" xChannelSelector="R" yChannelSelector="G" />
                        </filter>
                    </defs>

                    {/* 主形状 */}
                    <g filter={`url(#sticker-rough-${shape})`}>
                        <path
                            d={shapePaths[shape]}
                            fill={color}
                            stroke={borderColor}
                            strokeWidth="3"
                        />
                        
                        {/* 光泽层 */}
                        <path
                            d={shapePaths[shape]}
                            fill={`url(#sticker-shine-${shape})`}
                        />
                    </g>
                </svg>

                {/* 内容 */}
                <div
                    className="absolute inset-0 flex items-center justify-center p-4"
                    style={{
                        fontFamily: "'Permanent Marker', cursive",
                        color: borderColor,
                        textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
                    }}
                >
                    {children}
                </div>
            </div>

            {/* 卷曲角效果 */}
            {peel && (
                <motion.div
                    className="absolute -bottom-1 -right-1 w-6 h-6 pointer-events-none"
                    initial={{ opacity: 0, rotate: 0 }}
                    animate={{ opacity: 1, rotate: -10 }}
                    transition={{ delay: 0.3 }}
                >
                    <svg viewBox="0 0 24 24" className="w-full h-full">
                        <defs>
                            <linearGradient id="peel-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={color} />
                                <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M0 24 L24 24 L24 0 Q12 12, 0 24 Z"
                            fill="url(#peel-gradient)"
                            opacity="0.6"
                        />
                    </svg>
                </motion.div>
            )}
        </motion.div>
    );
};

export default Sticker;

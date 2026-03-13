'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface PolaroidFrameProps {
    src: string;
    alt: string;
    caption?: string;
    className?: string;
    rotation?: number;
    size?: 'small' | 'medium' | 'large';
    shadow?: boolean;
    tape?: boolean;
    tapeColor?: 'pink' | 'blue' | 'yellow' | 'green' | 'purple';
}

/**
 * Polaroid 照片框组件 - 模拟拍立得照片风格
 * 带有白色边框、手写感标签、轻微旋转和阴影
 */
export const PolaroidFrame: React.FC<PolaroidFrameProps> = ({
    src,
    alt,
    caption,
    className = '',
    rotation = -3,
    size = 'medium',
    shadow = true,
    tape = true,
    tapeColor = 'pink',
}) => {
    const sizeMap = {
        small: { width: 200, padding: 12, fontSize: 'text-sm' },
        medium: { width: 280, padding: 16, fontSize: 'text-base' },
        large: { width: 360, padding: 20, fontSize: 'text-lg' },
    };

    const dimensions = sizeMap[size];

    return (
        <motion.div
            className={`relative inline-block ${className}`}
            style={{ width: dimensions.width }}
            initial={{ opacity: 0, y: 20, rotate: rotation - 5 }}
            animate={{ opacity: 1, y: 0, rotate: rotation }}
            whileHover={{ 
                scale: 1.03, 
                rotate: rotation + 2,
                transition: { type: "spring", stiffness: 300, damping: 20 }
            }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
            {/* 和纸胶带装饰 */}
            {tape && (
                <motion.div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 z-20"
                    style={{ width: '80px', height: '28px' }}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <svg width="100%" height="100%" viewBox="0 0 80 28" preserveAspectRatio="none">
                        <defs>
                            <filter id={`polaroid-tape-${tapeColor}`}>
                                <feTurbulence type="fractalNoise" baseFrequency="0.2" numOctaves="1" result="noise" />
                                <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
                            </filter>
                        </defs>
                        <rect
                            x="0"
                            y="2"
                            width="80"
                            height="24"
                            fill={{
                                pink: 'rgba(255, 182, 193, 0.8)',
                                blue: 'rgba(135, 206, 235, 0.8)',
                                yellow: 'rgba(255, 223, 128, 0.8)',
                                green: 'rgba(144, 238, 144, 0.8)',
                                purple: 'rgba(221, 160, 221, 0.8)',
                            }[tapeColor]}
                            filter={`url(#polaroid-tape-${tapeColor})`}
                            rx="2"
                        />
                    </svg>
                </motion.div>
            )}

            {/* Polaroid 边框 */}
            <div
                className="relative bg-white"
                style={{
                    padding: dimensions.padding,
                    paddingBottom: caption ? dimensions.padding * 2 : dimensions.padding,
                    boxShadow: shadow
                        ? '3px 3px 10px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)'
                        : '0 0 0 1px rgba(0,0,0,0.05)',
                }}
            >
                {/* 照片区域 */}
                <div className="relative overflow-hidden bg-gray-100" style={{ aspectRatio: '1/1' }}>
                    <Image
                        src={src}
                        alt={alt}
                        fill
                        className="object-cover"
                        sizes={`${dimensions.width}px`}
                    />
                    
                    {/* 照片上的轻微纹理 */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E")`,
                            opacity: 0.08,
                            mixBlendMode: 'overlay',
                        }}
                    />
                </div>

                {/* 手写风格标签 */}
                {caption && (
                    <motion.div
                        className={`mt-4 text-center ${dimensions.fontSize}`}
                        style={{
                            fontFamily: "'Caveat', cursive",
                            color: '#4a4a4a',
                            transform: `rotate(${Math.random() * 2 - 1}deg)`,
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        {caption}
                    </motion.div>
                )}
            </div>

            {/* 底部阴影增强 */}
            {shadow && (
                <div
                    className="absolute -bottom-2 left-4 right-4 h-4 -z-10"
                    style={{
                        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, transparent 70%)',
                        filter: 'blur(4px)',
                    }}
                />
            )}
        </motion.div>
    );
};

export default PolaroidFrame;

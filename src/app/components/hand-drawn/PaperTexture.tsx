'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface PaperTextureProps {
    children?: React.ReactNode;
    className?: string;
    variant?: 'cream' | 'white' | 'kraft' | 'graph' | 'notebook';
    intensity?: 'light' | 'medium' | 'heavy';
    showGrain?: boolean;
    showFibers?: boolean;
}

/**
 * 纸张纹理背景组件
 * 提供多种纸张质感： cream（奶油纸）、white（白纸）、kraft（牛皮纸）、graph（方格纸）、notebook（笔记本）
 */
export const PaperTexture: React.FC<PaperTextureProps> = ({
    children,
    className = '',
    variant = 'cream',
    intensity = 'medium',
    showGrain = true,
    showFibers = true,
}) => {
    const intensityMap = {
        light: 0.3,
        medium: 0.5,
        heavy: 0.8,
    };

    const variantStyles = {
        cream: {
            background: '#faf8f3',
            textureColor: '#e8e4dc',
        },
        white: {
            background: '#ffffff',
            textureColor: '#f0f0f0',
        },
        kraft: {
            background: '#d4c4a8',
            textureColor: '#b8a88a',
        },
        graph: {
            background: '#fafafa',
            textureColor: '#e0e0e0',
        },
        notebook: {
            background: '#fffef8',
            textureColor: '#f5f5dc',
        },
    };

    const style = variantStyles[variant];
    const grainOpacity = intensityMap[intensity];

    return (
        <motion.div
            className={`relative overflow-hidden ${className}`}
            style={{ backgroundColor: style.background }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* 噪点纹理层 */}
            {showGrain && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                        opacity: grainOpacity * 0.4,
                        mixBlendMode: 'multiply',
                    }}
                />
            )}

            {/* 纤维纹理层 */}
            {showFibers && (
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ opacity: grainOpacity * 0.3 }}
                >
                    <defs>
                        <pattern
                            id="fibers"
                            x="0"
                            y="0"
                            width="100"
                            height="100"
                            patternUnits="userSpaceOnUse"
                        >
                            {/* 随机纤维线条 */}
                            <path
                                d="M10 20 Q 30 15, 50 22 T 90 18"
                                stroke={style.textureColor}
                                strokeWidth="0.5"
                                fill="none"
                                opacity="0.6"
                            />
                            <path
                                d="M20 50 Q 40 55, 60 48 T 95 52"
                                stroke={style.textureColor}
                                strokeWidth="0.3"
                                fill="none"
                                opacity="0.4"
                            />
                            <path
                                d="M5 75 Q 25 70, 45 78 T 85 72"
                                stroke={style.textureColor}
                                strokeWidth="0.4"
                                fill="none"
                                opacity="0.5"
                            />
                            <path
                                d="M30 5 Q 50 8, 70 3"
                                stroke={style.textureColor}
                                strokeWidth="0.3"
                                fill="none"
                                opacity="0.3"
                            />
                            <path
                                d="M60 85 Q 75 88, 90 84"
                                stroke={style.textureColor}
                                strokeWidth="0.5"
                                fill="none"
                                opacity="0.4"
                            />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#fibers)" />
                </svg>
            )}

            {/* 方格纸网格 */}
            {variant === 'graph' && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `
                            linear-gradient(${style.textureColor} 1px, transparent 1px),
                            linear-gradient(90deg, ${style.textureColor} 1px, transparent 1px)
                        `,
                        backgroundSize: '20px 20px',
                        opacity: 0.5,
                    }}
                />
            )}

            {/* 笔记本横线 */}
            {variant === 'notebook' && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(${style.textureColor} 1px, transparent 1px)`,
                        backgroundSize: '100% 28px',
                        backgroundPosition: '0 20px',
                        opacity: 0.6,
                    }}
                >
                    {/* 红色边线 */}
                    <div
                        className="absolute left-12 top-0 bottom-0 w-px"
                        style={{
                            backgroundColor: '#ff9999',
                            opacity: 0.6,
                        }}
                    />
                </div>
            )}

            {/* 纸张边缘阴影效果 */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    boxShadow: 'inset 0 0 60px rgba(0,0,0,0.03)',
                }}
            />

            {/* 内容 */}
            <div className="relative z-10">{children}</div>
        </motion.div>
    );
};

export default PaperTexture;

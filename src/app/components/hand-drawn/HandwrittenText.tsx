'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface HandwrittenTextProps {
    children: React.ReactNode;
    className?: string;
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
    font?: 'caveat' | 'indie-flower' | 'permanent-marker' | 'amatic' | 'satisfy';
    size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
    color?: string;
    underline?: boolean;
    highlight?: boolean;
    highlightColor?: string;
    animate?: boolean;
    irregular?: boolean;
}

/**
 * 手写风格排版组件
 * 支持多种手写字体和装饰效果
 */
export const HandwrittenText: React.FC<HandwrittenTextProps> = ({
    children,
    className = '',
    as: Component = 'span',
    font = 'caveat',
    size = 'base',
    color = '#2d2d2d',
    underline = false,
    highlight = false,
    highlightColor = 'rgba(255, 255, 0, 0.3)',
    animate = true,
    irregular = true,
}) => {
    const fontMap = {
        'caveat': "'Caveat', cursive",
        'indie-flower': "'Indie Flower', cursive",
        'permanent-marker': "'Permanent Marker', cursive",
        'amatic': "'Amatic SC', cursive",
        'satisfy': "'Satisfy', cursive",
    };

    const sizeMap = {
        'xs': 'text-xs',
        'sm': 'text-sm',
        'base': 'text-base',
        'lg': 'text-lg',
        'xl': 'text-xl',
        '2xl': 'text-2xl',
        '3xl': 'text-3xl',
        '4xl': 'text-4xl',
        '5xl': 'text-5xl',
    };

    // 为每个字符生成随机旋转
    const renderIrregularText = (text: string) => {
        if (!irregular || typeof text !== 'string') return text;

        return text.split('').map((char, index) => {
            const rotation = (Math.random() - 0.5) * 6; // -3 到 3 度
            const yOffset = (Math.random() - 0.5) * 3; // 轻微上下偏移

            return (
                <motion.span
                    key={index}
                    style={{
                        display: 'inline-block',
                        transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
                    }}
                    initial={animate ? { opacity: 0, y: 10 } : undefined}
                    animate={animate ? { opacity: 1, y: yOffset } : undefined}
                    transition={{
                        duration: 0.3,
                        delay: index * 0.03,
                        ease: "easeOut",
                    }}
                >
                    {char === ' ' ? '\u00A0' : char}
                </motion.span>
            );
        });
    };

    // 手写风格下划线 SVG
    const UnderlineSVG = () => (
        <svg
            className="absolute -bottom-1 left-0 w-full h-3"
            viewBox="0 0 100 12"
            preserveAspectRatio="none"
            style={{ overflow: 'visible' }}
        >
            <motion.path
                d="M0 6 Q 25 2, 50 6 T 100 6"
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
            />
        </svg>
    );

    // 高亮背景
    const HighlightBackground = () => (
        <motion.span
            className="absolute inset-0 -z-10"
            style={{
                backgroundColor: highlightColor,
                transform: 'rotate(-1deg) scale(1.05)',
                borderRadius: '4px',
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
        />
    );

    return (
        <Component
            className={`relative inline-block ${sizeMap[size]} ${className}`}
            style={{
                fontFamily: fontMap[font],
                color,
                lineHeight: '1.4',
            }}
        >
            {highlight && <HighlightBackground />}
            
            <span className="relative">
                {renderIrregularText(String(children))}
            </span>
            
            {underline && <UnderlineSVG />}
        </Component>
    );
};

export default HandwrittenText;

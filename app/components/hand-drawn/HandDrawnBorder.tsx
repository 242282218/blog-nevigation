'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface HandDrawnBorderProps {
    children: React.ReactNode;
    className?: string;
    color?: string;
    strokeWidth?: number;
    roughness?: number;
    fill?: string;
    hover?: boolean;
}

/**
 * 手绘边框组件 - 使用 SVG 路径模拟手绘蜡笔/铅笔效果
 * 具有不规则圆角和粗糙边缘
 */
export const HandDrawnBorder: React.FC<HandDrawnBorderProps> = ({
    children,
    className = '',
    color = '#2d2d2d',
    strokeWidth = 2,
    roughness = 2,
    fill = 'transparent',
    hover = true,
}) => {
    // 生成随机偏移的圆角矩形路径
    const generateRoughPath = (width: number, height: number, radius: number): string => {
        const r = radius;
        const variance = roughness;
        
        // 添加随机偏移
        const rv = () => (Math.random() - 0.5) * variance;
        
        // 不规则圆角矩形路径
        return `
            M ${r + rv()} ${rv()}
            L ${width - r + rv()} ${rv()}
            Q ${width + rv()} ${rv()} ${width + rv()} ${r + rv()}
            L ${width + rv()} ${height - r + rv()}
            Q ${width + rv()} ${height + rv()} ${width - r + rv()} ${height + rv()}
            L ${r + rv()} ${height + rv()}
            Q ${rv()} ${height + rv()} ${rv()} ${height - r + rv()}
            L ${rv()} ${r + rv()}
            Q ${rv()} ${rv()} ${r + rv()} ${rv()}
            Z
        `;
    };

    // 生成多重描边路径以增加手绘质感
    const generateMultiStroke = (width: number, height: number, radius: number): string[] => {
        const paths: string[] = [];
        const layers = 3;
        
        for (let i = 0; i < layers; i++) {
            const offset = (i - 1) * 0.5;
            paths.push(generateRoughPath(width + offset * 2, height + offset * 2, radius));
        }
        
        return paths;
    };

    return (
        <motion.div
            className={`relative ${className}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
            {/* SVG 边框层 */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                preserveAspectRatio="none"
                style={{ overflow: 'visible' }}
            >
                <defs>
                    {/* 手绘滤镜 */}
                    <filter id="roughPaper" x="-20%" y="-20%" width="140%" height="140%">
                        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                    
                    {/* 蜡笔质感滤镜 */}
                    <filter id="crayon" x="-20%" y="-20%" width="140%" height="140%">
                        <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" result="turbulence" />
                        <feDisplacementMap in2="turbulence" in="SourceGraphic" scale="3" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </defs>
                
                {/* 主边框 - 使用多重描边 */}
                <g filter="url(#crayon)">
                    {/* 阴影层 */}
                    <rect
                        x="3"
                        y="3"
                        width="100%"
                        height="100%"
                        rx="12"
                        ry="12"
                        fill="none"
                        stroke="rgba(0,0,0,0.1)"
                        strokeWidth={strokeWidth}
                        style={{ transform: 'translate(2px, 2px)' }}
                    />
                    
                    {/* 主描边 - 使用 path 实现不规则效果 */}
                    <motion.rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        rx="12"
                        ry="12"
                        fill={fill}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                    
                    {/* 额外的不规则描边增强手绘感 */}
                    <motion.path
                        d={`M 12 0 Q 50% -2 100% 12 M 100% 12 Q 102 50% 100% 100% M 100% 100% Q 50% 102 12 100% M 12 100% Q -2 50% 12 0`}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth * 0.6}
                        strokeLinecap="round"
                        strokeDasharray="100 5 20 3"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.7 }}
                        transition={{ duration: 1, delay: 0.3 }}
                    />
                </g>
            </svg>
            
            {/* 内容区域 */}
            <motion.div
                className="relative z-10 p-6"
                whileHover={hover ? { scale: 1.01, rotate: 0.5 } : undefined}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                {children}
            </motion.div>
        </motion.div>
    );
};

export default HandDrawnBorder;

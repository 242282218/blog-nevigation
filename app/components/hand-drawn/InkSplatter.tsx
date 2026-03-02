'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface InkSplatterProps {
    className?: string;
    color?: string;
    size?: 'small' | 'medium' | 'large';
    variant?: 'splatter' | 'drop' | 'brush' | 'stamp';
    opacity?: number;
    animate?: boolean;
}

/**
 * 墨迹喷溅装饰组件
 * 提供多种墨迹效果：喷溅、滴落、笔触、印章
 */
export const InkSplatter: React.FC<InkSplatterProps> = ({
    className = '',
    color = '#2d2d2d',
    size = 'medium',
    variant = 'splatter',
    opacity = 0.15,
    animate = true,
}) => {
    const sizeMap = {
        small: 60,
        medium: 120,
        large: 200,
    };

    const dimensions = sizeMap[size];

    // 喷溅效果路径
    const splatterPaths = [
        // 中心主体
        "M30 15 Q45 10, 55 20 T65 35 Q70 50, 60 60 T40 70 Q20 75, 15 60 T10 40 Q12 25, 30 15 Z",
        // 飞溅点1
        "M70 25 Q75 22, 78 28 T75 35 Q70 38, 68 32 T70 25 Z",
        // 飞溅点2
        "M20 75 Q15 78, 12 72 T18 65 Q25 62, 28 68 T20 75 Z",
        // 飞溅点3
        "M60 10 Q65 5, 70 12 T65 20 Q58 22, 55 15 T60 10 Z",
        // 飞溅点4
        "M10 30 Q5 28, 8 22 T18 25 Q22 30, 15 35 T10 30 Z",
    ];

    // 滴落效果路径
    const dropPath = "M30 10 Q50 10, 50 30 Q50 55, 30 60 Q10 55, 10 30 Q10 10, 30 10 Z M30 60 Q35 75, 30 85 Q25 75, 30 60";

    // 笔触效果路径
    const brushPaths = [
        "M10 20 Q30 15, 50 20 T90 18 Q95 22, 85 25 T45 28 Q25 30, 15 25 T10 20 Z",
        "M15 40 Q35 38, 55 42 T85 40 Q90 44, 80 47 T50 50 Q30 48, 20 44 T15 40 Z",
        "M20 60 Q40 58, 60 62 T80 60 Q85 64, 75 67 T55 68 Q35 66, 25 63 T20 60 Z",
    ];

    // 印章效果路径
    const stampPath = "M25 25 L75 25 L75 75 L25 75 Z M30 30 L70 30 L70 70 L30 70 Z";

    const getPaths = () => {
        switch (variant) {
            case 'splatter':
                return splatterPaths;
            case 'drop':
                return [dropPath];
            case 'brush':
                return brushPaths;
            case 'stamp':
                return [stampPath];
            default:
                return splatterPaths;
        }
    };

    const paths = getPaths();

    return (
        <motion.div
            className={`pointer-events-none ${className}`}
            style={{
                width: dimensions,
                height: dimensions,
            }}
            initial={animate ? { opacity: 0, scale: 0.5 } : undefined}
            animate={animate ? { opacity, scale: 1 } : undefined}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 100 100"
                style={{ overflow: 'visible' }}
            >
                <defs>
                    {/* 墨迹纹理滤镜 */}
                    <filter id={`ink-texture-${variant}`}>
                        <feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="4" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
                        <feGaussianBlur stdDeviation="0.5" />
                    </filter>
                    
                    {/* 边缘粗糙滤镜 */}
                    <filter id={`rough-edge-${variant}`}>
                        <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" result="turbulence" />
                        <feDisplacementMap in2="turbulence" in="SourceGraphic" scale="2" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </defs>

                <g filter={`url(#ink-texture-${variant})`}>
                    {paths.map((path, index) => (
                        <motion.path
                            key={index}
                            d={path}
                            fill={variant === 'stamp' ? 'none' : color}
                            stroke={color}
                            strokeWidth={variant === 'stamp' ? 3 : 0}
                            initial={animate ? { pathLength: 0, opacity: 0 } : undefined}
                            animate={animate ? { pathLength: 1, opacity: 1 } : undefined}
                            transition={{
                                duration: 0.4,
                                delay: index * 0.1,
                                ease: "easeOut",
                            }}
                        />
                    ))}
                </g>
            </svg>
        </motion.div>
    );
};

export default InkSplatter;

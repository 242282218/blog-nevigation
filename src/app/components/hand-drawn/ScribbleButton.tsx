'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ScribbleButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
}

/**
 * 涂鸦风格按钮组件
 * 带有手绘边框、填充效果和不规则形状
 */
export const ScribbleButton: React.FC<ScribbleButtonProps> = ({
    children,
    onClick,
    className = '',
    variant = 'primary',
    size = 'medium',
    disabled = false,
    icon,
    iconPosition = 'left',
}) => {
    const sizeClasses = {
        small: 'px-4 py-2 text-sm',
        medium: 'px-6 py-3 text-base',
        large: 'px-8 py-4 text-lg',
    };

    const variantStyles = {
        primary: {
            bg: '#3d5a80',
            text: '#ffffff',
            hoverBg: '#2d4a70',
        },
        secondary: {
            bg: '#98c1d9',
            text: '#2d2d2d',
            hoverBg: '#88b1c9',
        },
        outline: {
            bg: 'transparent',
            text: '#3d5a80',
            hoverBg: 'rgba(61, 90, 128, 0.1)',
        },
        ghost: {
            bg: 'transparent',
            text: '#2d2d2d',
            hoverBg: 'rgba(0, 0, 0, 0.05)',
        },
    };

    const style = variantStyles[variant];

    return (
        <motion.button
            onClick={onClick}
            disabled={disabled}
            className={`
                relative inline-flex items-center justify-center gap-2
                font-medium transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${sizeClasses[size]}
                ${className}
            `}
            style={{
                fontFamily: "'Caveat', cursive",
                color: style.text,
            }}
            whileHover={!disabled ? { scale: 1.03 } : undefined}
            whileTap={!disabled ? { scale: 0.98 } : undefined}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
            {/* SVG 边框和背景 */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ overflow: 'visible' }}
                preserveAspectRatio="none"
            >
                <defs>
                    <filter id="button-rough">
                        <feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="2" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </defs>

                {/* 背景 */}
                <motion.rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    rx="8"
                    ry="8"
                    fill={style.bg}
                    filter="url(#button-rough)"
                    initial={false}
                    whileHover={!disabled ? { fill: style.hoverBg } : undefined}
                    transition={{ duration: 0.2 }}
                />

                {/* 手绘边框 */}
                {variant === 'outline' && (
                    <motion.rect
                        x="1"
                        y="1"
                        width="calc(100% - 2px)"
                        height="calc(100% - 2px)"
                        rx="8"
                        ry="8"
                        fill="none"
                        stroke={style.text}
                        strokeWidth="2"
                        strokeDasharray="8 3"
                        filter="url(#button-rough)"
                        initial={{ pathLength: 1 }}
                        whileHover={!disabled ? { strokeDasharray: "12 4" } : undefined}
                    />
                )}

                {/* 装饰性涂鸦线条 */}
                <motion.path
                    d="M 10 80% Q 30% 85%, 50% 80% T 90% 82%"
                    fill="none"
                    stroke={style.text}
                    strokeWidth="1"
                    opacity="0.3"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                />
            </svg>

            {/* 内容 */}
            <span className="relative z-10 flex items-center gap-2">
                {icon && iconPosition === 'left' && (
                    <motion.span
                        initial={{ rotate: 0 }}
                        whileHover={{ rotate: -10 }}
                        transition={{ type: "spring", stiffness: 300 }}
                    >
                        {icon}
                    </motion.span>
                )}
                {children}
                {icon && iconPosition === 'right' && (
                    <motion.span
                        initial={{ rotate: 0 }}
                        whileHover={{ rotate: 10 }}
                        transition={{ type: "spring", stiffness: 300 }}
                    >
                        {icon}
                    </motion.span>
                )}
            </span>
        </motion.button>
    );
};

export default ScribbleButton;

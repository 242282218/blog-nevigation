/**
 * Tailwind CSS 配置扩展 - 手绘风格设计系统
 * 
 * 使用方式：
 * 1. 将此配置合并到主 tailwind.config.ts 中
 * 2. 或者作为预设导入
 * 
 * @example
 * // tailwind.config.ts
 * import sketchConfig from './design-system/tailwind.sketch.config.js';
 * 
 * export default {
 *   presets: [sketchConfig],
 *   // ...其他配置
 * }
 */

/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      /* ============================================
         颜色系统
         ============================================ */
      colors: {
        // 纸张色系
        'sketch-paper': {
          white: '#FAFAF8',
          cream: '#F5F1E8',
          aged: '#EDE8D0',
          kraft: '#C4A77D',
          graph: '#F0F4F0',
        },
        // 铅笔色系
        'sketch-pencil': {
          light: '#9CA3AF',
          medium: '#6B7280',
          dark: '#4A4A4A',
        },
        // 墨迹色系
        'sketch-ink': {
          black: '#1A1A1A',
          charcoal: '#2D2D2D',
        },
        // 蜡笔彩色系
        'sketch-crayon': {
          red: '#E85D4E',
          orange: '#F4A261',
          yellow: '#E9C46A',
          green: '#2A9D8F',
          blue: '#4A90E2',
          purple: '#9B59B6',
          pink: '#E87EA1',
        },
        // 语义化颜色
        'sketch': {
          primary: '#4A90E2',
          secondary: '#9B59B6',
          success: '#2A9D8F',
          warning: '#E9C46A',
          error: '#E85D4E',
          background: '#FAFAF8',
          surface: '#F5F1E8',
          text: '#1A1A1A',
          'text-muted': '#6B7280',
          border: '#9CA3AF',
        },
      },

      /* ============================================
         字体系统
         ============================================ */
      fontFamily: {
        'sketch-heading': ['Caveat', 'cursive'],
        'sketch-subheading': ['Patrick Hand', 'cursive'],
        'sketch-body': ['Quicksand', 'sans-serif'],
        'sketch-accent': ['Indie Flower', 'cursive'],
        'sketch-code': ['Kalam', 'cursive'],
      },

      /* ============================================
         字体大小
         ============================================ */
      fontSize: {
        'sketch-xs': ['0.75rem', { lineHeight: '1.5' }],
        'sketch-sm': ['0.875rem', { lineHeight: '1.6' }],
        'sketch-base': ['1rem', { lineHeight: '1.7' }],
        'sketch-lg': ['1.125rem', { lineHeight: '1.7' }],
        'sketch-xl': ['1.25rem', { lineHeight: '1.5' }],
        'sketch-2xl': ['1.5rem', { lineHeight: '1.4' }],
        'sketch-3xl': ['1.75rem', { lineHeight: '1.4' }],
        'sketch-4xl': ['2.25rem', { lineHeight: '1.3' }],
        'sketch-5xl': ['3rem', { lineHeight: '1.2' }],
        'sketch-6xl': ['4rem', { lineHeight: '1.1' }],
      },

      /* ============================================
         行高
         ============================================ */
      lineHeight: {
        'sketch-none': '1',
        'sketch-tight': '1.25',
        'sketch-snug': '1.375',
        'sketch-normal': '1.5',
        'sketch-relaxed': '1.625',
        'sketch-loose': '1.75',
      },

      /* ============================================
         字间距
         ============================================ */
      letterSpacing: {
        'sketch-tighter': '-0.05em',
        'sketch-tight': '-0.025em',
        'sketch-normal': '0',
        'sketch-wide': '0.025em',
        'sketch-wider': '0.05em',
      },

      /* ============================================
         间距系统
         ============================================ */
      spacing: {
        'sketch-0': '0',
        'sketch-px': '1px',
        'sketch-xs': '0.25rem',   // 4px
        'sketch-sm': '0.5rem',    // 8px
        'sketch-md': '1rem',      // 16px
        'sketch-lg': '1.5rem',    // 24px
        'sketch-xl': '2.5rem',    // 40px
        'sketch-2xl': '4rem',     // 64px
        'sketch-3xl': '6rem',     // 96px
      },

      /* ============================================
         圆角系统
         ============================================ */
      borderRadius: {
        'sketch-none': '0',
        'sketch-sm': '4px',
        'sketch-md': '8px',
        'sketch-lg': '12px',
        'sketch-xl': '16px',
        'sketch-full': '9999px',
        // 不规则有机圆角 - 手绘风格核心
        'sketch-organic': '255px 15px 225px 15px / 15px 225px 15px 255px',
        'sketch-organic-sm': '12px 15px 14px 16px / 16px 14px 15px 12px',
      },

      /* ============================================
         阴影系统
         ============================================ */
      boxShadow: {
        'sketch-none': 'none',
        'sketch-sm': '1px 2px 0 0 rgba(0, 0, 0, 0.05)',
        'sketch-md': '2px 3px 0 0 rgba(0, 0, 0, 0.08)',
        'sketch-lg': '3px 4px 0 0 rgba(0, 0, 0, 0.1), 4px 5px 0 0 rgba(0, 0, 0, 0.05)',
        'sketch-xl': '4px 6px 0 0 rgba(0, 0, 0, 0.1), 5px 7px 0 0 rgba(0, 0, 0, 0.08), 6px 8px 0 0 rgba(0, 0, 0, 0.05)',
        // 手绘风格阴影 - 多层偏移
        'sketch': '3px 4px 0 0 rgba(0, 0, 0, 0.1), 4px 5px 0 0 rgba(0, 0, 0, 0.08), 5px 6px 0 0 rgba(0, 0, 0, 0.05)',
        // 蜡笔彩色阴影（需要配合 CSS 变量使用）
        'sketch-crayon': '4px 4px 0 0 var(--tw-shadow-color), 6px 6px 0 0 rgba(0, 0, 0, 0.1)',
      },

      /* ============================================
         过渡动画
         ============================================ */
      transitionDuration: {
        'sketch-fast': '150ms',
        'sketch-normal': '200ms',
        'sketch-slow': '300ms',
      },

      transitionTimingFunction: {
        'sketch-default': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'sketch-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'sketch-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'sketch-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'sketch-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },

      /* ============================================
         旋转
         ============================================ */
      rotate: {
        'sketch-left': '-1deg',
        'sketch-right': '1deg',
        'sketch-left-md': '-2deg',
        'sketch-right-md': '2deg',
      },

      /* ============================================
         边框宽度
         ============================================ */
      borderWidth: {
        'sketch-thin': '1px',
        'sketch-normal': '2px',
        'sketch-thick': '3px',
      },

      /* ============================================
         Z-Index
         ============================================ */
      zIndex: {
        'sketch-dropdown': '1000',
        'sketch-sticky': '1020',
        'sketch-fixed': '1030',
        'sketch-modal-backdrop': '1040',
        'sketch-modal': '1050',
        'sketch-popover': '1060',
        'sketch-tooltip': '1070',
        'sketch-toast': '1080',
      },

      /* ============================================
         动画关键帧
         ============================================ */
      keyframes: {
        'sketch-wiggle': {
          '0%, 100%': { transform: 'rotate(-1deg)' },
          '50%': { transform: 'rotate(1deg)' },
        },
        'sketch-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'sketch-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-2px)' },
          '75%': { transform: 'translateX(2px)' },
        },
        'sketch-draw': {
          '0%': { strokeDashoffset: '100%' },
          '100%': { strokeDashoffset: '0%' },
        },
      },

      animation: {
        'sketch-wiggle': 'sketch-wiggle 0.3s ease-in-out',
        'sketch-bounce': 'sketch-bounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'sketch-shake': 'sketch-shake 0.3s ease-in-out',
        'sketch-draw': 'sketch-draw 1s ease-out forwards',
      },

      /* ============================================
         背景图案
         ============================================ */
      backgroundImage: {
        // 方格纸背景
        'sketch-graph': `
          linear-gradient(#e5e7eb 1px, transparent 1px),
          linear-gradient(90deg, #e5e7eb 1px, transparent 1px)
        `,
        // 横线纸背景
        'sketch-lined': `repeating-linear-gradient(
          transparent,
          transparent 31px,
          #e5e7eb 31px,
          #e5e7eb 32px
        )`,
        // 点阵纸背景
        'sketch-dot': `radial-gradient(#e5e7eb 1px, transparent 1px)`,
        // 荧光笔高亮
        'sketch-highlight': 'linear-gradient(transparent 60%, rgba(233, 196, 106, 0.4) 60%)',
      },

      backgroundSize: {
        'sketch-graph': '20px 20px',
        'sketch-lined': '100% 32px',
        'sketch-dot': '20px 20px',
      },
    },
  },

  /* ============================================
     自定义插件
     ============================================ */
  plugins: [
    // 手绘风格插件
    function({ addComponents, addUtilities, theme }) {
      // 添加组件样式
      addComponents({
        // 手绘按钮
        '.sketch-btn': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${theme('spacing.sketch-sm')} ${theme('spacing.sketch-md')}`,
          fontFamily: theme('fontFamily.sketch-subheading'),
          fontSize: theme('fontSize.sketch-lg')[0],
          color: theme('colors.sketch.text'),
          backgroundColor: theme('colors.sketch-paper.cream'),
          border: `${theme('borderWidth.sketch-normal')} solid ${theme('colors.sketch-ink.black')}`,
          borderRadius: theme('borderRadius.sketch-organic'),
          transform: 'rotate(-1deg)',
          cursor: 'pointer',
          transition: `transform ${theme('transitionDuration.sketch-normal')} ${theme('transitionTimingFunction.sketch-default')}, box-shadow ${theme('transitionDuration.sketch-normal')} ${theme('transitionTimingFunction.sketch-default')}`,
          '&:hover': {
            transform: 'rotate(0deg) translateY(-2px)',
            boxShadow: theme('boxShadow.sketch'),
          },
          '&:active': {
            transform: 'rotate(0deg) translateY(1px)',
            boxShadow: theme('boxShadow.sketch-sm'),
          },
          '&:focus-visible': {
            outline: 'none',
            boxShadow: `0 0 0 3px ${theme('colors.sketch-paper.white')}, 0 0 0 5px ${theme('colors.sketch-crayon.blue')}`,
          },
          '&:disabled': {
            opacity: '0.5',
            borderStyle: 'dashed',
            cursor: 'not-allowed',
            transform: 'none',
            boxShadow: 'none',
          },
        },

        // 主要按钮
        '.sketch-btn-primary': {
          backgroundColor: theme('colors.sketch-crayon.blue'),
          color: 'white',
          borderColor: theme('colors.sketch-ink.black'),
        },

        // 手绘卡片
        '.sketch-card': {
          position: 'relative',
          padding: theme('spacing.sketch-lg'),
          backgroundColor: theme('colors.sketch-paper.white'),
          border: `${theme('borderWidth.sketch-normal')} solid ${theme('colors.sketch-pencil.medium')}`,
          borderRadius: theme('borderRadius.sketch-organic-sm'),
          transform: 'rotate(-0.5deg)',
          transition: `transform ${theme('transitionDuration.sketch-slow')} ${theme('transitionTimingFunction.sketch-default')}, box-shadow ${theme('transitionDuration.sketch-slow')} ${theme('transitionTimingFunction.sketch-default')}`,
          '&:hover': {
            transform: 'rotate(0deg) translateY(-4px)',
            boxShadow: theme('boxShadow.sketch-lg'),
          },
        },

        // 胶带效果
        '.sketch-tape': {
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%) rotate(-2deg)',
            width: '80px',
            height: '24px',
            background: 'rgba(255, 255, 255, 0.6)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: theme('boxShadow.sm'),
          },
        },

        // 手绘输入框
        '.sketch-input': {
          width: '100%',
          padding: `${theme('spacing.sketch-sm')} ${theme('spacing.sketch-md')}`,
          fontFamily: theme('fontFamily.sketch-body'),
          fontSize: theme('fontSize.sketch-base')[0],
          color: theme('colors.sketch.text'),
          backgroundColor: theme('colors.sketch-paper.white'),
          border: `${theme('borderWidth.sketch-normal')} solid ${theme('colors.sketch-pencil.light')}`,
          borderRadius: theme('borderRadius.sketch-organic-sm'),
          transition: `border-color ${theme('transitionDuration.sketch-normal')} ${theme('transitionTimingFunction.sketch-default')}, border-width ${theme('transitionDuration.sketch-fast')} ${theme('transitionTimingFunction.sketch-default')}`,
          '&::placeholder': {
            color: theme('colors.sketch-pencil.light'),
          },
          '&:focus': {
            outline: 'none',
            borderColor: theme('colors.sketch-crayon.blue'),
            borderWidth: theme('borderWidth.sketch-thick'),
          },
          '&:disabled': {
            opacity: '0.5',
            borderStyle: 'dashed',
            cursor: 'not-allowed',
          },
        },

        // 手绘链接
        '.sketch-link': {
          position: 'relative',
          color: theme('colors.sketch-crayon.blue'),
          textDecoration: 'none',
          fontWeight: theme('fontWeight.medium'),
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '-2px',
            left: '0',
            width: '100%',
            height: '2px',
            backgroundColor: theme('colors.sketch-crayon.blue'),
            transform: 'scaleX(0)',
            transformOrigin: 'right',
            transition: `transform ${theme('transitionDuration.sketch-slow')} ${theme('transitionTimingFunction.sketch-default')}`,
          },
          '&:hover::after': {
            transform: 'scaleX(1)',
            transformOrigin: 'left',
          },
          '&:visited': {
            color: theme('colors.sketch-crayon.purple'),
          },
        },

        // 荧光笔高亮
        '.sketch-highlight': {
          background: 'linear-gradient(transparent 60%, rgba(233, 196, 106, 0.4) 60%)',
        },

        // 手绘下划线
        '.sketch-underline': {
          position: 'relative',
          display: 'inline-block',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '-4px',
            left: '-2px',
            right: '-2px',
            height: '3px',
            background: `linear-gradient(to right, ${theme('colors.sketch-crayon.blue')} 0%, ${theme('colors.sketch-crayon.blue')} 45%, transparent 45%, transparent 55%, ${theme('colors.sketch-crayon.blue')} 55%, ${theme('colors.sketch-crayon.blue')} 100%)`,
            borderRadius: '2px',
            transform: 'rotate(-1deg)',
          },
        },
      });

      // 添加工具类
      addUtilities({
        // 纸张背景
        '.bg-sketch-graph': {
          backgroundColor: theme('colors.sketch-paper.white'),
          backgroundImage: theme('backgroundImage.sketch-graph'),
          backgroundSize: '20px 20px',
        },
        '.bg-sketch-lined': {
          backgroundColor: theme('colors.sketch-paper.white'),
          backgroundImage: theme('backgroundImage.sketch-lined'),
          backgroundSize: '100% 32px',
        },
        '.bg-sketch-dot': {
          backgroundColor: theme('colors.sketch-paper.white'),
          backgroundImage: theme('backgroundImage.sketch-dot'),
          backgroundSize: '20px 20px',
        },

        // 焦点样式
        '.focus-sketch': {
          '&:focus-visible': {
            outline: 'none',
            boxShadow: `0 0 0 3px ${theme('colors.sketch-paper.white')}, 0 0 0 6px ${theme('colors.sketch-crayon.blue')}`,
            borderRadius: theme('borderRadius.sketch-organic'),
          },
        },

        // 触摸目标
        '.touch-target': {
          minHeight: '44px',
          minWidth: '44px',
        },
      });
    },
  ],

  /* ============================================
     安全列表（确保这些类名始终生成）
     ============================================ */
  safelist: [
    'font-sketch-heading',
    'font-sketch-subheading',
    'font-sketch-body',
    'font-sketch-accent',
    'font-sketch-code',
    'bg-sketch-paper-white',
    'bg-sketch-paper-cream',
    'text-sketch-ink-black',
    'text-sketch-pencil-medium',
    'rounded-sketch-organic',
    'rounded-sketch-organic-sm',
    'shadow-sketch',
    'shadow-sketch-lg',
    'rotate-sketch-left',
    'rotate-sketch-right',
    'sketch-btn',
    'sketch-btn-primary',
    'sketch-card',
    'sketch-input',
    'sketch-link',
    'sketch-highlight',
    'sketch-underline',
    'sketch-tape',
  ],
};

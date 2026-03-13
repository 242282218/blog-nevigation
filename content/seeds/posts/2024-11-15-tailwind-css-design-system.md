---
title: 使用 Tailwind CSS 构建设计系统
date: 2024-11-15
description: 基于 Tailwind CSS 搭建可复用、可扩展的组件设计系统
---

# 使用 Tailwind CSS 构建设计系统

## 为什么选择 Tailwind？

- 原子化 CSS，减少样式冲突
- 高度可定制，适应品牌需求
- 开发效率高，无需切换文件

## 设计令牌配置

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        }
      },
      spacing: {
        '18': '4.5rem',
      }
    }
  }
}
```

## 组件模式

### 按钮组件

```jsx
const Button = ({ 
  variant = 'primary', 
  size = 'md',
  children 
}) => {
  const baseStyles = 'rounded-lg font-medium transition-colors'
  const variants = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300'
  }
  
  return (
    <button className={cn(baseStyles, variants[variant])}>
      {children}
    </button>
  )
}
```

## 总结

Tailwind CSS 是构建现代设计系统的优秀选择。

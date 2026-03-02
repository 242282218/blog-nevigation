# 手绘/涂鸦/拼贴风格设计系统

> Sketch UI Design System v1.0

一个完整的手绘风格设计系统，包含设计令牌、CSS 变量、Tailwind 配置和组件规范。

---

## 文件结构

```
design-system/
├── README.md                      # 本文件
├── sketch-design-system.md        # 完整设计规范文档
├── tokens.json                    # 设计令牌（JSON 格式）
├── sketch-variables.css           # CSS 变量定义
└── tailwind.sketch.config.js      # Tailwind CSS 扩展配置
```

---

## 快速开始

### 1. 导入 CSS 变量

在全局 CSS 文件中导入：

```css
/* app/globals.css 或 styles.css */
@import './design-system/sketch-variables.css';
```

### 2. 配置 Tailwind

将手绘风格配置合并到主配置中：

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";
import sketchConfig from "./design-system/tailwind.sketch.config.js";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // 你的其他配置...
    },
  },
  presets: [sketchConfig], // 添加手绘风格预设
  plugins: [
    // 你的其他插件...
  ],
};

export default config;
```

### 3. 使用设计令牌

```javascript
// 导入设计令牌
import tokens from './design-system/tokens.json';

// 使用颜色
const primaryColor = tokens.tokens.color.crayon.blue.value; // #4A90E2
```

---

## 使用示例

### 基础样式

```jsx
// 使用手绘风格类名
<div className="sketch-theme">
  <h1 className="font-sketch-heading text-sketch-5xl text-sketch-ink-black">
    手绘风格标题
  </h1>
  
  <p className="font-sketch-body text-sketch-base text-sketch-text">
    这是一段正文内容，使用圆润的无衬线字体确保可读性。
  </p>
</div>
```

### 按钮组件

```jsx
// 手绘按钮
<button className="sketch-btn">
  默认按钮
</button>

<button className="sketch-btn sketch-btn-primary">
  主要按钮
</button>

// 或者使用 Tailwind 工具类组合
<button className="
  px-6 py-3
  bg-sketch-paper-cream 
  border-2 border-sketch-ink-black
  rounded-sketch-organic
  font-sketch-subheading text-sketch-lg
  -rotate-1
  hover:rotate-0 hover:-translate-y-0.5
  hover:shadow-sketch
  transition-all duration-sketch-normal
">
  自定义按钮
</button>
```

### 卡片组件

```jsx
// 手绘卡片
<div className="sketch-card sketch-tape">
  <h3 className="font-sketch-subheading text-sketch-2xl mb-3">
    卡片标题
  </h3>
  <p className="font-sketch-body text-sketch-text">
    卡片内容...
  </p>
</div>
```

### 输入框

```jsx
<input 
  type="text"
  className="sketch-input"
  placeholder="请输入内容..."
/>
```

### 链接

```jsx
<a href="#" className="sketch-link">
  手绘风格链接
</a>
```

### 背景纹理

```jsx
// 方格纸背景
<div className="bg-sketch-graph p-8">
  方格纸背景内容
</div>

// 横线纸背景
<div className="bg-sketch-lined p-8">
  横线纸背景内容
</div>

// 点阵纸背景
<div className="bg-sketch-dot p-8">
  点阵纸背景内容
</div>
```

---

## 颜色系统

### 纸张色系

| 名称 | Tailwind 类 | Hex |
|-----|------------|-----|
| Paper White | `bg-sketch-paper-white` | `#FAFAF8` |
| Cream Paper | `bg-sketch-paper-cream` | `#F5F1E8` |
| Aged Paper | `bg-sketch-paper-aged` | `#EDE8D0` |
| Kraft Paper | `bg-sketch-paper-kraft` | `#C4A77D` |

### 铅笔色系

| 名称 | Tailwind 类 | Hex |
|-----|------------|-----|
| Pencil Light | `text-sketch-pencil-light` | `#9CA3AF` |
| Pencil Medium | `text-sketch-pencil-medium` | `#6B7280` |
| Pencil Dark | `text-sketch-pencil-dark` | `#4A4A4A` |

### 墨迹色系

| 名称 | Tailwind 类 | Hex |
|-----|------------|-----|
| Ink Black | `text-sketch-ink-black` | `#1A1A1A` |
| Charcoal | `text-sketch-ink-charcoal` | `#2D2D2D` |

### 蜡笔彩色系

| 名称 | Tailwind 类 | Hex |
|-----|------------|-----|
| Crayon Red | `text-sketch-crayon-red` | `#E85D4E` |
| Crayon Orange | `text-sketch-crayon-orange` | `#F4A261` |
| Crayon Yellow | `text-sketch-crayon-yellow` | `#E9C46A` |
| Crayon Green | `text-sketch-crayon-green` | `#2A9D8F` |
| Crayon Blue | `text-sketch-crayon-blue` | `#4A90E2` |
| Crayon Purple | `text-sketch-crayon-purple` | `#9B59B6` |
| Crayon Pink | `text-sketch-crayon-pink` | `#E87EA1` |

---

## 字体系统

| 用途 | Tailwind 类 | 字体 |
|-----|------------|-----|
| 标题 | `font-sketch-heading` | Caveat |
| 副标题 | `font-sketch-subheading` | Patrick Hand |
| 正文 | `font-sketch-body` | Quicksand |
| 装饰 | `font-sketch-accent` | Indie Flower |
| 代码 | `font-sketch-code` | Kalam |

---

## 间距系统

| Token | Tailwind 类 | 值 |
|-------|------------|---|
| xs | `p-sketch-xs` / `m-sketch-xs` | 4px |
| sm | `p-sketch-sm` / `m-sketch-sm` | 8px |
| md | `p-sketch-md` / `m-sketch-md` | 16px |
| lg | `p-sketch-lg` / `m-sketch-lg` | 24px |
| xl | `p-sketch-xl` / `m-sketch-xl` | 40px |
| 2xl | `p-sketch-2xl` / `m-sketch-2xl` | 64px |
| 3xl | `p-sketch-3xl` / `m-sketch-3xl` | 96px |

---

## 圆角系统

| 名称 | Tailwind 类 | 值 |
|-----|------------|---|
| 小 | `rounded-sketch-sm` | 4px |
| 中 | `rounded-sketch-md` | 8px |
| 大 | `rounded-sketch-lg` | 12px |
| 超大 | `rounded-sketch-xl` | 16px |
| 有机圆角 | `rounded-sketch-organic` | 不规则 |
| 小有机圆角 | `rounded-sketch-organic-sm` | 小不规则 |

---

## 阴影系统

| 名称 | Tailwind 类 |
|-----|------------|
| 小 | `shadow-sketch-sm` |
| 中 | `shadow-sketch-md` |
| 大 | `shadow-sketch-lg` |
| 超大 | `shadow-sketch-xl` |
| 手绘风格 | `shadow-sketch` |

---

## 可访问性

设计系统已考虑以下可访问性要求：

1. **对比度**：所有文字颜色满足 WCAG 2.1 AA 标准（4.5:1）
2. **焦点可见性**：所有交互元素有清晰的焦点样式
3. **减少动画**：支持 `prefers-reduced-motion` 媒体查询
4. **触摸目标**：最小触摸区域 44x44px

```css
/* 减少动画 */
@media (prefers-reduced-motion: reduce) {
  .sketch-btn,
  .sketch-card {
    transition: none !important;
    animation: none !important;
  }
}
```

---

## 浏览器支持

- Chrome 88+
- Firefox 78+
- Safari 14+
- Edge 88+

---

## 许可证

MIT License

---

## 参考资源

- [PaperCSS](https://www.getpapercss.com/) - 纸张风格 CSS 框架
- [Rough.js](https://roughjs.com/) - 手绘风格图形库
- [Wired Elements](https://wiredjs.com/) - 手绘风格 Web Components

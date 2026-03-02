# 手绘/涂鸦/拼贴风格设计系统

## Sketch UI Design System v1.0

> 一个充满人文气息、不完美但真实的手绘风格设计系统

---

## 1. 设计原则

### 1.1 为什么使用手绘风格？

手绘风格（Hand-drawn / Sketch / Doodle）是一种**反抛光（Anti-Polish）**的设计美学，它拥抱不完美，强调人性化的触感。

**核心价值：**
- **真实性**：展现创作过程，而非只展示最终成品
- **亲和力**：降低数字产品的冰冷感，增加温度
- **独特性**：在千篇一律的精致 UI 中脱颖而出
- **创意表达**：适合艺术、教育、个人博客等创意领域

### 1.2 适用场景

| 场景类型 | 适用度 | 说明 |
|---------|-------|------|
| 创意作品集 | ★★★★★ | 艺术家、设计师个人网站 |
| 教育平台 | ★★★★★ | 儿童教育、创意课程 |
| 个人博客 | ★★★★☆ | 生活方式、手工艺、美食博客 |
| 独立品牌 | ★★★★☆ | 手工艺品、独立设计师品牌 |
| 故事讲述 | ★★★★★ | 叙事性网站、回忆录 |
| 游戏/娱乐 | ★★★★☆ | 休闲游戏、娱乐应用 |
| SaaS/企业 | ★★☆☆☆ | 需谨慎使用，可能不够专业 |

### 1.3 设计哲学

1. **拥抱不完美**：线条可以歪斜，元素可以错位
2. **保持可读性**：在个性化的同时确保功能可用
3. **适度使用**：手绘元素作为点缀，而非全部
4. **一致性**：在"不完美"中保持视觉逻辑一致

---

## 2. 颜色系统

### 2.1 基础色板

#### 纸张色系（Paper Colors）
模拟真实纸张的质感和颜色变化

| 名称 | Hex | 用途 |
|-----|-----|-----|
| Paper White | `#FAFAF8` | 主背景色 |
| Cream Paper | `#F5F1E8` | 次要背景、卡片 |
| Aged Paper | `#EDE8D0` | 复古感背景 |
| Kraft Paper | `#C4A77D` | 牛皮纸效果 |
| Graph Paper | `#F0F4F0` | 方格纸背景 |

#### 铅笔与墨迹（Pencil & Ink）
模拟铅笔、钢笔、马克笔的笔触颜色

| 名称 | Hex | 用途 |
|-----|-----|-----|
| Pencil Light | `#9CA3AF` | 浅铅笔线、禁用状态 |
| Pencil Medium | `#6B7280` | 次要文字、边框 |
| Pencil Dark | `#4A4A4A` | 主要文字 |
| Ink Black | `#1A1A1A` | 标题、强调 |
| Charcoal | `#2D2D2D` | 正文、深色元素 |

#### 蜡笔彩色（Crayon Colors）
模拟蜡笔、彩色铅笔的柔和色彩

| 名称 | Hex | 用途 |
|-----|-----|-----|
| Crayon Red | `#E85D4E` | 错误、警告 |
| Crayon Orange | `#F4A261` | CTA按钮、强调 |
| Crayon Yellow | `#E9C46A` | 高亮、提示 |
| Crayon Green | `#2A9D8F` | 成功、确认 |
| Crayon Blue | `#4A90E2` | 链接、主要操作 |
| Crayon Purple | `#9B59B6` | 创意、特殊功能 |
| Crayon Pink | `#E87EA1` | 装饰、女性化内容 |

### 2.2 语义化颜色

```
Primary:    Crayon Blue    #4A90E2  - 主要操作、链接
Secondary:  Crayon Purple  #9B59B6  - 次要操作
Success:    Crayon Green   #2A9D8F  - 成功状态
Warning:    Crayon Yellow  #E9C46A  - 警告状态
Error:      Crayon Red     #E85D4E  - 错误状态
Background: Paper White    #FAFAF8  - 主背景
Surface:    Cream Paper    #F5F1E8  - 卡片、浮层
Text:       Ink Black      #1A1A1A  - 主要文字
TextMuted:  Pencil Medium  #6B7280  - 次要文字
Border:     Pencil Light   #9CA3AF  - 边框、分割线
```

### 2.3 颜色使用规则

1. **背景优先使用纸张色**：避免纯白 `#FFFFFF`，使用带有轻微暖色调的纸张白
2. **文字使用铅笔灰/墨迹黑**：避免纯黑，使用 `#1A1A1A` 或 `#4A4A4A`
3. **强调色使用蜡笔色**：饱和度适中，不刺眼
4. **透明度模拟铅笔深浅**：通过 `opacity` 模拟铅笔用力程度

---

## 3. 字体系统

### 3.1 字体选择

#### 主要字体（标题）

| 字体 | 风格 | 用途 |
|-----|-----|-----|
| **Caveat** | 手写体 | 主标题、大标题 |
| **Patrick Hand** | 印刷手写体 | 副标题、强调文字 |
| **Indie Flower** | 随意手写 | 装饰性文字、引用 |

#### 辅助字体（正文）

| 字体 | 风格 | 用途 |
|-----|-----|-----|
| **Quicksand** | 圆润无衬线 | 正文、UI元素 |
| **Nunito** | 友好无衬线 | 按钮、标签 |
| **Comic Neue** | 漫画风格 | 儿童内容、趣味元素 |

#### 等宽字体（代码）

| 字体 | 风格 | 用途 |
|-----|-----|-----|
| **Kalam** | 手写等宽 | 代码块、笔记 |

### 3.2 字体层级

```
H1 (Display):     Caveat / 48px / 700 / line-height: 1.2
H2 (Title):       Caveat / 36px / 600 / line-height: 1.3
H3 (Subtitle):    Patrick Hand / 28px / 600 / line-height: 1.4
H4 (Heading):     Patrick Hand / 24px / 600 / line-height: 1.4
H5 (Subheading):  Quicksand / 20px / 600 / line-height: 1.5
H6 (Label):       Quicksand / 16px / 600 / line-height: 1.5

Body Large:       Quicksand / 18px / 400 / line-height: 1.7
Body:             Quicksand / 16px / 400 / line-height: 1.7
Body Small:       Quicksand / 14px / 400 / line-height: 1.6
Caption:          Quicksand / 12px / 500 / line-height: 1.5

Code:             Kalam / 14px / 400 / line-height: 1.6
```

### 3.3 字体使用原则

1. **手写体用于标题**：营造人文气息，但不要用于大段正文
2. **正文使用圆润无衬线**：确保可读性
3. **字号略大**：手绘风格适合稍大的字号，建议正文最小 16px
4. **行高宽松**：手绘风格适合 1.6-1.8 的行高
5. **字间距略宽**：增加呼吸感，特别是手写体

---

## 4. 间距和布局规范

### 4.1 不规则间距系统

手绘风格拒绝完美的网格，采用"有机间距"：

```
基础单位: 4px

Spacing Tokens:
  xs:    4px   (微调)
  sm:    8px   (紧凑)
  md:    16px  (标准)
  lg:    24px  (宽松)
  xl:    40px  (章节间距)
  2xl:   64px  (大区块)
  3xl:   96px  (页面间距)

不规则偏移 (Imperfect Offsets):
  slight:   1-3px   (轻微错位)
  medium:   4-8px   (明显错位)
  large:    8-16px  (大幅错位)
```

### 4.2 错位布局（Offset Layout）

```
元素错位规则:
  Card Offset:      translate(-2px, 3px) rotate(-1deg)
  Button Offset:    translate(1px, -2px) rotate(0.5deg)
  Image Offset:     translate(-3px, 2px) rotate(-2deg)
  Text Box Offset:  translate(2px, -1px) rotate(1deg)
```

### 4.3 布局原则

1. **打破严格对齐**：元素可以稍微偏离网格
2. **重叠元素**：允许轻微重叠，增加层次感
3. **不规则留白**：留白不必均匀分布
4. **旋转元素**：小幅旋转（-3deg 到 3deg）增加生动感

---

## 5. 效果规范

### 5.1 纹理效果

#### 纸张纹理
```css
/* 基础纸张纹理 */
.paper-texture {
  background-image: url("data:image/svg+xml,..."); /* 噪点纹理 */
  background-blend-mode: multiply;
}

/* 方格纸 */
.graph-paper {
  background-image: 
    linear-gradient(#e5e7eb 1px, transparent 1px),
    linear-gradient(90deg, #e5e7eb 1px, transparent 1px);
  background-size: 20px 20px;
}

/* 横线纸 */
.lined-paper {
  background-image: repeating-linear-gradient(
    transparent,
    transparent 31px,
    #e5e7eb 31px,
    #e5e7eb 32px
  );
}
```

#### 噪点叠加
```css
.noise-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("noise.png");
  opacity: 0.03;
  pointer-events: none;
  mix-blend-mode: overlay;
}
```

### 5.2 阴影效果

手绘风格的阴影应该是"不完美"的：

```css
/* 手绘阴影 - 使用多个偏移模拟手绘感 */
.sketch-shadow {
  box-shadow: 
    3px 4px 0 0 rgba(0,0,0,0.1),
    4px 5px 0 0 rgba(0,0,0,0.08),
    5px 6px 0 0 rgba(0,0,0,0.05);
}

/* 蜡笔阴影 - 彩色阴影 */
.crayon-shadow {
  box-shadow: 
    4px 4px 0 0 var(--crayon-color),
    6px 6px 0 0 rgba(0,0,0,0.1);
}

/* 无阴影 - 扁平手绘 */
.flat-sketch {
  box-shadow: none;
  border: 2px solid var(--ink-black);
}
```

### 5.3 边框样式

#### 手绘边框
```css
/* SVG 手绘边框 */
.hand-drawn-border {
  border: none;
  position: relative;
}
.hand-drawn-border::before {
  content: '';
  position: absolute;
  inset: -3px;
  border: 2px solid var(--ink-black);
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
}

/* 不规则圆角 */
.organic-radius {
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
}
```

#### 虚线/点线边框
```css
/* 虚线边框 */
.dashed-sketch {
  border: 2px dashed var(--pencil-medium);
  border-radius: 8px;
}

/* 点线边框 */
.dotted-sketch {
  border: 2px dotted var(--pencil-light);
}
```

### 5.4 装饰元素

#### 下划线
```css
/* 手绘下划线 */
.sketch-underline {
  position: relative;
  display: inline-block;
}
.sketch-underline::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  right: 0;
  height: 3px;
  background: url("underline.svg") repeat-x;
}
```

#### 高亮标记
```css
/* 荧光笔效果 */
.highlighter {
  background: linear-gradient(
    transparent 60%,
    rgba(233, 196, 106, 0.4) 60%
  );
}
```

---

## 6. 组件状态规范

### 6.1 按钮状态

```css
/* 默认状态 */
.btn-sketch {
  background: var(--cream-paper);
  border: 2px solid var(--ink-black);
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
  padding: 12px 24px;
  font-family: 'Patrick Hand', cursive;
  font-size: 18px;
  transform: rotate(-1deg);
  transition: transform 0.2s, box-shadow 0.2s;
}

/* Hover 状态 - 轻微抬起 */
.btn-sketch:hover {
  transform: rotate(0deg) translateY(-2px);
  box-shadow: 3px 4px 0 0 rgba(0,0,0,0.15);
}

/* Active 状态 - 按下 */
.btn-sketch:active {
  transform: rotate(0deg) translateY(1px);
  box-shadow: 1px 2px 0 0 rgba(0,0,0,0.1);
}

/* Focus 状态 - 手绘焦点环 */
.btn-sketch:focus-visible {
  outline: none;
  box-shadow: 
    0 0 0 3px var(--cream-paper),
    0 0 0 5px var(--crayon-blue);
}

/* Disabled 状态 - 褪色 */
.btn-sketch:disabled {
  opacity: 0.5;
  border-style: dashed;
  cursor: not-allowed;
  transform: none;
}
```

### 6.2 卡片状态

```css
/* 默认状态 */
.card-sketch {
  background: var(--paper-white);
  border: 2px solid var(--pencil-medium);
  border-radius: 20px 15px 25px 18px / 18px 25px 15px 20px;
  padding: 24px;
  transform: rotate(-0.5deg);
  position: relative;
}

/* 胶带效果 */
.card-sketch::before {
  content: '';
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%) rotate(-2deg);
  width: 80px;
  height: 24px;
  background: rgba(255,255,255,0.6);
  border: 1px solid rgba(0,0,0,0.1);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* Hover 状态 */
.card-sketch:hover {
  transform: rotate(0deg) translateY(-4px);
  box-shadow: 4px 6px 0 0 rgba(0,0,0,0.1);
}
```

### 6.3 输入框状态

```css
/* 默认状态 */
.input-sketch {
  background: var(--paper-white);
  border: 2px solid var(--pencil-light);
  border-radius: 12px 15px 14px 16px / 16px 14px 15px 12px;
  padding: 12px 16px;
  font-family: 'Quicksand', sans-serif;
  font-size: 16px;
}

/* Focus 状态 - 边框变深 */
.input-sketch:focus {
  outline: none;
  border-color: var(--crayon-blue);
  border-width: 3px;
}

/* Error 状态 - 红色波浪线 */
.input-sketch.error {
  border-color: var(--crayon-red);
  background-image: url("wavy-line.svg");
  background-position: bottom;
  background-repeat: repeat-x;
}
```

### 6.4 链接状态

```css
/* 默认状态 */
.link-sketch {
  color: var(--crayon-blue);
  text-decoration: none;
  position: relative;
}

/* 手绘下划线 */
.link-sketch::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--crayon-blue);
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 0.3s;
}

/* Hover 状态 */
.link-sketch:hover::after {
  transform: scaleX(1);
  transform-origin: left;
}

/* Visited 状态 */
.link-sketch:visited {
  color: var(--crayon-purple);
}
```

---

## 7. 可访问性考虑

### 7.1 对比度要求

尽管是手绘风格，仍需满足 WCAG 2.1 AA 标准：

| 元素 | 最小对比度 | 建议 |
|-----|-----------|-----|
| 正文文字 | 4.5:1 | 使用 `#4A4A4A` 在 `#FAFAF8` 上 = 8.6:1 ✓ |
| 大文字 | 3:1 | 使用 `#6B7280` 在 `#FAFAF8` 上 = 5.4:1 ✓ |
| UI组件 | 3:1 | 按钮边框、输入框边框需清晰可见 |

### 7.2 焦点可见性

```css
/* 强制焦点环 */
:focus-visible {
  outline: 3px solid var(--crayon-blue);
  outline-offset: 3px;
}

/* 手绘风格焦点环 */
.sketch-focus:focus-visible {
  outline: none;
  box-shadow: 
    0 0 0 3px var(--paper-white),
    0 0 0 6px var(--crayon-blue);
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
}
```

### 7.3 动画与运动

```css
/* 尊重用户偏好 */
@media (prefers-reduced-motion: reduce) {
  .sketch-element {
    transform: none !important;
    transition: none !important;
    animation: none !important;
  }
}

/* 轻微的手绘动画 */
@keyframes sketchWiggle {
  0%, 100% { transform: rotate(-1deg); }
  50% { transform: rotate(1deg); }
}

.sketch-hover:hover {
  animation: sketchWiggle 0.3s ease-in-out;
}
```

### 7.4 触摸目标大小

确保手绘风格的按钮和交互元素仍有足够的触摸区域：

```css
.sketch-button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 20px;
}
```

### 7.5 语义化 HTML

即使外观手绘，仍需保持正确的 HTML 结构：

```html
<!-- 正确 -->
<button class="btn-sketch">点击我</button>

<!-- 错误 -->
<div class="btn-sketch" onclick="...">点击我</div>
```

---

## 8. 设计令牌（Design Tokens）

### 8.1 完整令牌列表

见 `tokens.json` 文件获取完整的设计令牌定义。

### 8.2 使用方式

```css
/* CSS 变量 */
.element {
  color: var(--sketch-color-ink-black);
  font-family: var(--sketch-font-heading);
  border-radius: var(--sketch-radius-organic);
}
```

```javascript
// JavaScript
import tokens from './tokens.json';

const primaryColor = tokens.color.crayon.blue;
```

```jsx
// React + Tailwind
<div className="bg-sketch-paper text-sketch-ink font-sketch-heading">
  手绘风格内容
</div>
```

---

## 9. 实施检查清单

### 9.1 视觉质量

- [ ] 背景使用纸张色而非纯白
- [ ] 文字使用铅笔灰/墨迹黑而非纯黑
- [ ] 边框使用不规则圆角
- [ ] 元素有轻微旋转和错位
- [ ] 阴影使用多层偏移模拟手绘感

### 9.2 交互

- [ ] 所有可点击元素有 `cursor-pointer`
- [ ] Hover 状态有视觉反馈
- [ ] Focus 状态清晰可见
- [ ] 过渡动画平滑（150-300ms）

### 9.3 可访问性

- [ ] 文字对比度符合 WCAG AA 标准
- [ ] 焦点环清晰可见
- [ ] 支持 `prefers-reduced-motion`
- [ ] 触摸目标最小 44x44px
- [ ] 使用语义化 HTML 标签

### 9.4 性能

- [ ] 纹理图片已优化
- [ ] 字体使用 `font-display: swap`
- [ ] 动画使用 `transform` 和 `opacity`

---

## 10. 示例代码

### 10.1 手绘按钮

```jsx
<button className="
  relative px-6 py-3
  bg-sketch-cream border-2 border-sketch-ink
  rounded-sketch font-sketch-body text-lg
  transform -rotate-1
  hover:rotate-0 hover:-translate-y-0.5
  hover:shadow-sketch
  active:translate-y-0 active:shadow-none
  focus:outline-none focus:ring-2 focus:ring-sketch-blue focus:ring-offset-2
  transition-all duration-200
">
  点击我
</button>
```

### 10.2 手绘卡片

```jsx
<div className="
  relative p-6
  bg-sketch-paper border-2 border-sketch-pencil
  rounded-organic
  transform rotate-0.5
  hover:rotate-0 hover:-translate-y-1
  hover:shadow-sketch-lg
  transition-all duration-300
">
  {/* 胶带装饰 */}
  <div className="
    absolute -top-3 left-1/2 -translate-x-1/2
    w-20 h-6
    bg-white/60 border border-black/10
    transform -rotate-2
    shadow-sm
  "/>
  
  <h3 className="font-sketch-heading text-2xl mb-3">卡片标题</h3>
  <p className="font-sketch-body text-sketch-charcoal">卡片内容...</p>
</div>
```

### 10.3 手绘输入框

```jsx
<input
  type="text"
  className="
    w-full px-4 py-3
    bg-sketch-paper border-2 border-sketch-pencil-light
    rounded-organic-sm
    font-sketch-body text-base
    placeholder:text-sketch-pencil-light
    focus:border-sketch-blue focus:border-[3px]
    focus:outline-none
    transition-colors duration-200
  "
  placeholder="请输入..."
/>
```

---

## 附录

### A. 推荐资源

- **纹理**: [Transparent Textures](https://www.transparenttextures.com/)
- **SVG 边框**: [Squircle](https://squircley.app/)
- **字体**: [Google Fonts](https://fonts.google.com/)
- **配色**: [Coolors](https://coolors.co/)

### B. 灵感来源

- [PaperCSS](https://www.getpapercss.com/)
- [Rough.js](https://roughjs.com/)
- [Wired Elements](https://wiredjs.com/)

---

*版本: 1.0 | 最后更新: 2026-03-02*

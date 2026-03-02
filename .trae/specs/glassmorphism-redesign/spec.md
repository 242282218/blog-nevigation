# Glassmorphism 美学重设计 Spec

## Why
当前 VitePress 博客采用终端风格设计，视觉效果较为传统。参考 `saas.sin.fan` 的现代 SaaS 设计风格，通过引入玻璃拟态、紫罗兰渐变色彩系统、动态网格背景等美学元素，以及滚动触发动画、悬停微交互等交互设计，提升网站的整体视觉品质和用户体验。

## What Changes
- **视觉风格迁移**: 从终端风格迁移到现代 Glassmorphism 玻璃拟态风格
- **色彩系统升级**: 引入紫罗兰(Violet)到品红(Fuchsia)渐变色彩系统
- **背景效果增强**: 添加动态网格背景、噪点纹理、光晕效果
- **交互动画**: 实现滚动触发动画、悬停微交互、按钮动效
- **组件美化**: 导航栏、Hero区域、特性卡片、工具卡片全面重设计
- **响应式优化**: 确保新设计在各设备上的完美呈现

## Impact
- **Affected specs**: 前端视觉设计、交互动效
- **Affected code**: 
  - `docs/.vitepress/theme/styles/terminal.css` → 重命名为 `modern.css`
  - `docs/.vitepress/theme/components/ToolCard.vue`
  - `docs/.vitepress/theme/components/ToolGrid.vue`
  - `docs/.vitepress/theme/index.ts`
  - `docs/index.md` (Hero 配置)
  - 新增动画工具函数和 composables

## ADDED Requirements

### Requirement: Glassmorphism 视觉系统
The system SHALL provide a complete glassmorphism visual design system.

#### Scenario: 深色主题背景
- **GIVEN** 用户访问网站
- **THEN** 背景显示为深黑色 `#050505`
- **AND** 背景叠加紫罗兰/品红色光晕效果
- **AND** 背景包含动态网格和噪点纹理

#### Scenario: 玻璃拟态卡片
- **GIVEN** 用户查看特性卡片或工具卡片
- **THEN** 卡片背景使用 `bg-black/20 backdrop-blur-sm`
- **AND** 卡片边框使用 `border-white/5`
- **AND** 悬停时显示径向渐变光晕效果

### Requirement: 紫罗兰渐变色彩系统
The system SHALL use violet-to-fuchsia gradient color system.

#### Scenario: 品牌色应用
- **GIVEN** 品牌元素需要着色
- **THEN** 主渐变为 `from-violet-300 via-purple-400 to-fuchsia-400`
- **AND** 文字渐变使用 `bg-clip-text text-transparent`
- **AND** 按钮使用旋转锥形渐变边框动画

### Requirement: 滚动触发动画
The system SHALL provide scroll-triggered animations.

#### Scenario: 元素进入视口
- **GIVEN** 用户向下滚动页面
- **WHEN** 元素进入视口
- **THEN** 元素执行淡入上移动画
- **AND** 动画使用 `transform: translateY(40px)` → `translateY(0)`
- **AND** 动画持续时间 0.6s，缓动函数 ease-out

### Requirement: 悬停微交互
The system SHALL provide hover micro-interactions.

#### Scenario: 特性卡片悬停
- **GIVEN** 用户悬停在特性卡片上
- **THEN** 卡片显示径向渐变光晕跟随鼠标位置
- **AND** 左侧出现竖条指示器
- **AND** 文字颜色从 zinc-400 过渡到 zinc-300
- **AND** 过渡时间 300ms

#### Scenario: 工具卡片悬停
- **GIVEN** 用户悬停在工具卡片上
- **THEN** 卡片上浮 `transform: translateY(-4px)`
- **AND** 边框颜色变为紫罗兰色
- **AND** 显示外部链接图标
- **AND** 添加发光阴影效果

### Requirement: 按钮交互效果
The system SHALL provide animated button interactions.

#### Scenario: 主 CTA 按钮
- **GIVEN** 用户查看主按钮
- **THEN** 按钮边框有旋转锥形渐变动画
- **AND** 动画周期 2s，线性无限循环
- **AND** 悬停时背景渐变加深

### Requirement: 3D 透视网格背景
The system SHALL provide 3D perspective grid background.

#### Scenario: Hero 区域背景
- **GIVEN** 用户查看 Hero 区域
- **THEN** 背景显示 3D 透视网格
- **AND** 网格使用 `perspective: 200px` 和 `rotateX(65deg)`
- **AND** 网格有无限滚动动画
- **AND** 底部有渐变遮罩淡出

### Requirement: 响应式布局
The system SHALL maintain responsive design across all devices.

#### Scenario: 移动端适配
- **GIVEN** 用户在移动设备访问
- **THEN** 网格布局自动调整为单列
- **AND** 动画效果适当简化
- **AND** 触摸交互替代悬停交互

## MODIFIED Requirements

### Requirement: 导航栏样式
**原设计**: 终端风格，方括号装饰
**新设计**: 
- 固定顶部，圆角胶囊形状
- `bg-black/50 backdrop-blur-xl` 玻璃效果
- 边框 `border-white/10`
- 悬停时 `bg-white/5` 过渡

### Requirement: Hero 区域
**原设计**: 终端命令行风格，光标闪烁
**新设计**:
- 居中大标题，渐变文字效果
- 副标题淡入动画
- 3D 透视网格背景
- 发光预览图区域

### Requirement: 特性卡片
**原设计**: 简单边框，$ 前缀标题
**新设计**:
- 玻璃拟态背景
- 图标 + 标题 + 描述布局
- 悬停光晕效果
- 左侧竖条指示器动画

## REMOVED Requirements

### Requirement: 终端风格元素
**Reason**: 与新的 Glassmorphism 风格不兼容
**Migration**: 
- 移除 `$` 前缀标题装饰
- 移除 `[ ]` 方括号导航装饰
- 移除光标闪烁动画
- 保留等宽字体作为可选样式

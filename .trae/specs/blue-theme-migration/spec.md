# 蓝色主题色彩迁移 Spec

## Why
当前 VitePress 博客采用紫罗兰(Violet)到品红(Fuchsia)渐变色彩系统，用户希望将整体色调改为蓝色系，以呈现更专业、冷静、科技感的视觉风格。

## What Changes
- **色彩系统迁移**: 从紫罗兰/品红色系迁移到蓝色系
- **渐变调整**: 主渐变从 violet-fuchsia 改为 blue-cyan/sky
- **光晕效果**: 所有光晕颜色从紫色改为蓝色
- **CSS 变量**: 重命名并调整所有相关色彩变量
- **组件样式**: 更新导航栏、按钮、卡片等组件的强调色

## Impact
- **Affected specs**: glassmorphism-redesign (色彩部分)
- **Affected code**: 
  - `docs/.vitepress/theme/styles/modern.css` - 主要修改文件
  - 可能涉及的组件样式引用

## ADDED Requirements

### Requirement: 蓝色渐变色彩系统
The system SHALL use blue-to-cyan/sky gradient color system.

#### Scenario: 品牌色应用
- **GIVEN** 品牌元素需要着色
- **THEN** 主渐变为 `from-blue-400 via-sky-500 to-cyan-400`
- **AND** 文字渐变使用 `bg-clip-text text-transparent`
- **AND** 按钮使用蓝色系旋转锥形渐变边框动画

#### Scenario: 深色模式色彩
- **GIVEN** 用户切换到深色模式
- **THEN** 使用较亮的蓝色变体 (blue-300, sky-400)
- **AND** 光晕效果使用蓝色透明度

#### Scenario: 浅色模式色彩
- **GIVEN** 用户使用浅色模式
- **THEN** 使用较深的蓝色变体 (blue-600, sky-600)
- **AND** 保持足够的对比度

### Requirement: 蓝色光晕效果
The system SHALL provide blue-tinted glow effects.

#### Scenario: 卡片悬停光晕
- **GIVEN** 用户悬停在卡片上
- **THEN** 显示蓝色径向渐变光晕
- **AND** 光晕颜色为 `rgba(59, 130, 246, 0.15)` (blue-500)

#### Scenario: 文字光晕
- **GIVEN** 渐变文字需要发光效果
- **THEN** 使用蓝色阴影 `rgba(59, 130, 246, 0.5)`

### Requirement: 网格背景色彩
The system SHALL use blue-tinted grid background.

#### Scenario: Hero 网格背景
- **GIVEN** Hero 区域显示 3D 网格
- **THEN** 网格颜色使用 `rgba(59, 130, 246, 0.15)`

## MODIFIED Requirements

### Requirement: CSS 变量重定义
**原设计**: 紫罗兰/品红色系变量
**新设计**:
- `--vp-c-violet-*` → `--vp-c-blue-*`
- `--vp-c-fuchsia-*` → `--vp-c-cyan-*`
- `--vp-c-purple-*` → `--vp-c-sky-*`
- `--vp-gradient-violet` → `--vp-gradient-blue`
- `--glow-violet` → `--glow-blue`
- `--grid-color` 使用蓝色

### Requirement: 玻璃按钮样式
**原设计**: 紫罗兰色强调
**新设计**:
- 默认文字颜色 `--vp-c-blue-500`
- 悬停边框颜色 `--vp-c-blue-500`
- 悬停文字颜色 `--vp-c-blue-400`

### Requirement: 导航栏样式
**原设计**: 紫罗兰色标题和激活状态
**新设计**:
- 标题颜色 `--vp-c-blue-500`
- 激活背景 `rgba(59, 130, 246, 0.15)`
- 悬停颜色 `--vp-c-blue-500`

### Requirement: CTA 按钮旋转边框
**原设计**: violet-fuchsia 锥形渐变
**新设计**:
- 锥形渐变使用 `blue-500 → cyan-500 → blue-500`

## REMOVED Requirements

### Requirement: 紫罗兰色彩变量
**Reason**: 完全迁移到蓝色系
**Migration**: 
- 所有 `--vp-c-violet-*` 变量值改为对应蓝色
- 所有 `--vp-c-fuchsia-*` 变量值改为对应青色
- 所有 `--vp-c-purple-*` 变量值改为对应天蓝色

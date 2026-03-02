# 修复前端显示错误 Spec

## Why
博客前端存在多个显示错误，包括 404 资源加载失败、样式覆盖问题、组件渲染异常等，需要系统性修复以确保用户体验。

## What Changes
- 修复 404 资源加载错误（favicon.ico、logo.svg）
- 修复 VitePress 默认主题变量覆盖问题
- 修复导航栏方括号样式显示异常
- 修复工具卡片组件路径引用问题
- 修复首页英雄区域样式冲突
- 优化响应式布局

## Impact
- 受影响文件：
  - docs/.vitepress/theme/styles/terminal.css
  - docs/.vitepress/theme/index.ts
  - docs/.vitepress/config.ts
  - docs/navigation/index.md
  - docs/index.md
  - docs/public/ 目录资源文件

## ADDED Requirements

### Requirement: 修复 404 资源错误
The system SHALL provide fallback for missing static resources.

#### Scenario: Favicon 404
- **WHEN** browser requests /favicon.ico
- **THEN** server SHALL return valid favicon or 204 response

#### Scenario: Logo 404
- **WHEN** browser requests /logo.svg
- **THEN** server SHALL return valid SVG logo

### Requirement: 修复样式覆盖
The system SHALL properly override VitePress default theme variables.

#### Scenario: CSS Variable Override
- **WHEN** page loads
- **THEN** custom terminal theme variables SHALL take precedence over defaults

### Requirement: 修复组件路径
The system SHALL correctly resolve Vue component imports.

#### Scenario: ToolGrid Component Import
- **WHEN** navigation page loads
- **THEN** ToolGrid and ToolCard components SHALL render without errors

## MODIFIED Requirements

### Requirement: Navigation Bar Styling
**Current**: Uses ::before/::after pseudo-elements for brackets
**Modified**: Use actual bracket characters in nav config or safer CSS selectors

### Requirement: Hero Section Styling
**Current**: Gradient text effect may conflict with terminal theme
**Modified**: Ensure consistent terminal aesthetic across all hero elements

## REMOVED Requirements
None

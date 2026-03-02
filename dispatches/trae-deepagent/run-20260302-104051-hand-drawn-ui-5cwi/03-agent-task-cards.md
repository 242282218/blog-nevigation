# 03-agent-task-cards.md

## Task Index

| card_id | agent | priority | status | depends_on | handoff_to |
|---------|-------|----------|--------|------------|------------|
| DESIGN-001 | ui-designer | high | completed | - | frontend-design |
| DESIGN-002 | ui-designer | high | completed | - | frontend-design |
| CODE-001 | frontend-design | high | completed | DESIGN-001 | - |
| CODE-002 | frontend-design | high | completed | DESIGN-002 | - |

## Task Cards

### CARD: DESIGN-001
- **card_id**: DESIGN-001
- **agent**: ui-designer
- **objective**: 生成手绘风格设计系统规范文档
- **inputs**: 
  - 手绘风格需求文档
  - Tailwind CSS 框架规范
- **steps**:
  1. 定义颜色系统（纸张色、铅笔色、蜡笔色、墨迹色）
  2. 定义字体系统（5种手写字体及其使用场景）
  3. 定义间距和布局规范（不规则间距策略）
  4. 定义效果规范（纹理、阴影、边框、瑕疵）
  5. 定义组件状态规范（hover、focus、active）
  6. 输出设计令牌 JSON 文件
- **outputs**:
  - `design-system/sketch-design-system.md`
  - `design-system/tokens.json`
  - `design-system/sketch-variables.css`
  - `design-system/tailwind.sketch.config.js`
- **depends_on**: -
- **blocks**: CODE-001
- **acceptance**:
  - 所有颜色对比度符合 WCAG AA 标准
  - 字体层级清晰可读
  - 设计令牌完整可解析
  - CSS 变量命名规范统一
- **evidence**: 设计文档文件 + 颜色对比度测试报告
- **fallback**: 使用简化颜色方案，减少蜡笔色彩数量
- **handoff_to**: frontend-design

### CARD: DESIGN-002
- **card_id**: DESIGN-002
- **agent**: ui-designer
- **objective**: 生成设计系统使用文档和 README
- **inputs**: 
  - DESIGN-001 输出的设计令牌
  - 手绘风格组件清单
- **steps**:
  1. 编写快速开始指南
  2. 编写组件使用示例
  3. 编写可访问性说明
  4. 编写自定义主题指南
- **outputs**:
  - `design-system/README.md`
- **depends_on**: DESIGN-001
- **blocks**: -
- **acceptance**:
  - 文档包含完整的使用示例
  - 安装步骤清晰
  - 包含故障排除指南
- **evidence**: README.md 文件
- **fallback**: 简化文档，优先保证核心内容
- **handoff_to**: -

### CARD: CODE-001
- **card_id**: CODE-001
- **agent**: frontend-design
- **objective**: 实现手绘风格 React 组件库
- **inputs**: 
  - DESIGN-001 设计系统规范
  - React + TypeScript + Tailwind 技术栈
- **steps**:
  1. 创建 HandDrawnBorder 组件（手绘边框效果）
  2. 创建 PaperTexture 组件（纸张纹理背景）
  3. 创建 WashiTape 组件（和纸胶带装饰）
  4. 创建 PolaroidFrame 组件（Polaroid 照片框）
  5. 创建 HandwrittenText 组件（手写风格排版）
  6. 创建 InkSplatter 组件（墨迹喷溅装饰）
  7. 创建 ScribbleButton 组件（涂鸦风格按钮）
  8. 创建 Sticker 组件（贴纸效果）
  9. 创建 DoodleDivider 组件（涂鸦分隔线）
  10. 创建组件库入口 index.ts
- **outputs**:
  - `app/components/hand-drawn/*.tsx` (9个组件文件)
  - `app/components/hand-drawn/index.ts`
- **depends_on**: DESIGN-001
- **blocks**: CODE-002
- **acceptance**:
  - 所有组件 TypeScript 类型完整
  - 组件支持所有设计令牌中的变体
  - 动画流畅 60fps
  - 响应式适配良好
  - 通过基础功能测试
- **evidence**: 组件代码文件 + 类型检查通过
- **fallback**: 减少组件数量，优先实现核心组件
- **handoff_to**: CODE-002

### CARD: CODE-002
- **card_id**: CODE-002
- **agent**: frontend-design
- **objective**: 创建手绘风格示例展示页面
- **inputs**: 
  - CODE-001 组件库
  - 设计系统规范
- **steps**:
  1. 设计示例页面布局
  2. 实现组件展示区域
  3. 实现交互演示区域
  4. 添加代码示例展示
  5. 优化移动端适配
- **outputs**:
  - `app/hand-drawn-demo/page.tsx`
- **depends_on**: CODE-001
- **blocks**: -
- **acceptance**:
  - 页面展示所有 9 个组件
  - 包含组件变体展示
  - 包含交互效果演示
  - 页面加载性能良好
- **evidence**: 示例页面文件 + Lighthouse 性能评分
- **fallback**: 简化页面，分开展示组件
- **handoff_to**: -

## Agent 执行摘要

### ui-designer
- **任务数**: 2
- **核心产出**: 完整设计系统（颜色、字体、间距、效果）
- **关键决策**: 
  - 采用 5 种手写字体组合
  - 定义 4 类纸张纹理
  - 建立不规则圆角系统

### frontend-design
- **任务数**: 2
- **核心产出**: 9 个 React 组件 + 示例页面
- **关键决策**:
  - 使用 CSS/SVG 实现手绘效果
  - Framer Motion 处理复杂动画
  - 组件支持完整变体系统

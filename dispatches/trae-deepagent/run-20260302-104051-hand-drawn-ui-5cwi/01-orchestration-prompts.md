# 01-orchestration-prompts.md

## Run Metadata
- **Run ID**: run-20260302-104051-hand-drawn-ui-5cwi
- **Goal**: 创建手绘/涂鸦/拼贴风格 UI 组件系统，弱化 AI 过度完美感
- **Created**: 2026-03-02 10:40:51
- **Status**: Completed

## Master Orchestrator Prompt

你是 `trae-deepagent`，职责是作为多智能体任务大脑完成高强度分发与收敛。

**输入目标**: 创建手绘插画、涂鸦纹理、拼贴细节与轻微瑕疵感的 UI 组件系统，用于弱化"AI 过度完美"带来的距离感，增强情绪表达与记忆点。

**自动推断**:
- 技术栈: React + TypeScript + Tailwind CSS
- 交付物: 可复用组件库 + 设计系统 + 示例页面
- 约束: 保持结构秩序的前提下增加手绘感
- 风险: 过度设计影响可读性、性能开销
- 质量门槛: 可访问性 WCAG AA、动画流畅 60fps
- 回退策略: 提供纯 CSS 降级方案

**执行三波次**:
- Wave A Discovery Burst: 并发探索手绘风格设计模式
- Wave B Execution Planning Burst: 拆分为组件实现任务
- Wave C Convergence: 统一设计系统与代码实现

## Wave A: Discovery Burst Prompts

### Agent: ui-designer
```
你是 ui-designer。
围绕目标"手绘风格 UI 组件系统"输出可执行结论。

分析手绘/涂鸦/拼贴风格的设计模式：
1. 手绘边框的实现方式（SVG 滤镜 vs CSS）
2. 纸张纹理的类型（奶油纸、牛皮纸、方格纸）
3. 拼贴元素的设计（胶带、照片框、贴纸）
4. 瑕疵感的度（轻微错位、墨迹、噪点）

必须输出：
- findings: 核心设计发现
- actions: 可执行行动
- deliverables: 设计规范文档
- handoff_to: frontend-architect
```

### Agent: frontend-architect
```
你是 frontend-architect。
围绕目标"手绘风格 UI 技术实现"输出可执行结论。

分析技术实现方案：
1. 手绘效果的 CSS/SVG 实现策略
2. 动画库选择（Framer Motion vs CSS Animation）
3. 字体加载策略（Google Fonts 优化）
4. 性能优化（纹理懒加载、will-change）

必须输出：
- findings: 技术选型结论
- actions: 实现步骤
- deliverables: 组件架构设计
- handoff_to: frontend-design
```

## Wave B: Execution Planning Burst Prompts

### Task Card: Design System Generation
```
Card: DESIGN-001
Agent: ui-designer
Objective: 生成完整的手绘风格设计系统

Inputs:
- 手绘风格需求文档
- Tailwind CSS 框架

Steps:
1. 定义颜色系统（纸张色、铅笔色、蜡笔色）
2. 定义字体系统（5种手写字体）
3. 定义间距和布局规范
4. 定义效果规范（纹理、阴影、边框）
5. 输出设计令牌 JSON

Outputs:
- design-system/sketch-design-system.md
- design-system/tokens.json
- design-system/sketch-variables.css

Acceptance:
- 所有颜色对比度符合 WCAG AA
- 字体层级清晰可读
- 设计令牌完整可解析
```

### Task Card: Component Implementation
```
Card: CODE-001
Agent: frontend-design
Objective: 实现手绘风格 React 组件库

Inputs:
- 设计系统规范
- React + TypeScript + Tailwind

Steps:
1. 创建 HandDrawnBorder 组件
2. 创建 PaperTexture 组件
3. 创建 WashiTape/Polaroid 组件
4. 创建 HandwrittenText 组件
5. 创建 InkSplatter/ScribbleButton 组件
6. 创建示例展示页面

Outputs:
- app/components/hand-drawn/*.tsx
- app/hand-drawn-demo/page.tsx

Acceptance:
- 所有组件 TypeScript 类型完整
- 动画流畅 60fps
- 响应式适配良好
```

## Wave C: Convergence Prompt

```
你是 trae-deepagent，执行收敛裁决。

输入：
- Wave A 设计发现
- Wave B 组件实现

执行：
1. 检查设计系统与代码实现的一致性
2. 验证所有设计令牌被正确使用
3. 确认可访问性要求已满足
4. 生成最终交付物清单

输出：
- 02-solution-plan.md
- 03-agent-task-cards.md
- 04-dependencies-and-acceptance.md
```

## Acceptance Prompt

```
验收手绘风格 UI 组件系统：

G0 Clarity Gate:
- [x] 目标和边界清晰
- [x] 技术栈明确

G1 Feasibility Gate:
- [x] 方案可执行
- [x] 依赖闭环

G2 Build-Ready Gate:
- [x] 组件代码完整
- [x] 设计系统文档完整

G3 Release-Ready Gate:
- [x] 验收矩阵完整
- [x] 示例页面可运行

验收标准：
1. 组件库包含 9+ 个组件
2. 设计系统包含颜色、字体、间距规范
3. 示例页面展示所有效果
4. 代码可直接复制使用
```

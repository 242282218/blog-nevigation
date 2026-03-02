# 04-dependencies-and-acceptance.md

## Dependency Graph

```
DESIGN-001
    │
    ├──> DESIGN-002
    │
    └──> CODE-001
            │
            └──> CODE-002
```

### 邻接表表示
- DESIGN-001 -> [DESIGN-002, CODE-001]
- DESIGN-002 -> []
- CODE-001 -> [CODE-002]
- CODE-002 -> []

## Concurrency Waves

### Wave-1: 设计发现
- **cards**: DESIGN-001
- **sync_point**: 设计系统文档完成
- **并行度**: 1

### Wave-2: 文档与组件并行
- **cards**: DESIGN-002, CODE-001
- **sync_point**: 设计文档和组件库均完成
- **并行度**: 2

### Wave-3: 示例页面
- **cards**: CODE-002
- **sync_point**: 示例页面完成
- **并行度**: 1

## Critical Path

### 路径
DESIGN-001 → CODE-001 → CODE-002

**总时长估算**: 3-4 小时

### 延误影响
- DESIGN-001 延误: 阻塞所有下游任务
- CODE-001 延误: 阻塞示例页面
- CODE-002 延误: 仅影响最终交付

### 缩短策略
1. 优先保证 DESIGN-001 资源
2. CODE-001 和 DESIGN-002 可并行
3. 提前准备示例页面框架

## Gate Checks

### G0 Clarity Gate
**pass_criteria**:
- [x] 目标和边界清晰定义
- [x] 技术栈明确（React + TypeScript + Tailwind）
- [x] 成功标准可量化

**fail_action**: 重新澄清需求，明确技术约束

### G1 Feasibility Gate
**pass_criteria**:
- [x] 方案可执行（CSS/SVG 实现手绘效果）
- [x] 依赖闭环（无外部阻塞）
- [x] 风险可控（性能、可访问性）

**fail_action**: 调整技术方案，采用更简单的实现

### G2 Build-Ready Gate
**pass_criteria**:
- [x] 组件代码完整（9个组件）
- [x] 设计系统文档完整
- [x] 类型检查通过
- [x] 基础功能测试通过

**fail_action**: 修复代码问题，补充缺失组件

### G3 Release-Ready Gate
**pass_criteria**:
- [x] 验收矩阵完整
- [x] 示例页面可运行
- [x] 性能指标达标（首屏 < 3s）
- [x] 可访问性达标（WCAG AA）

**fail_action**: 优化性能，修复可访问性问题

## Acceptance Matrix

| deliverable | acceptance_item | owner_agent | evidence | gate |
|-------------|-----------------|-------------|----------|------|
| 设计系统文档 | 颜色对比度符合 WCAG AA | ui-designer | 对比度测试报告 | G2 |
| 设计系统文档 | 字体层级清晰可读 | ui-designer | 设计文档 | G2 |
| 设计系统文档 | 设计令牌完整可解析 | ui-designer | tokens.json | G2 |
| 组件库 | TypeScript 类型完整 | frontend-design | 类型检查通过 | G2 |
| 组件库 | 支持所有设计变体 | frontend-design | 组件代码 | G2 |
| 组件库 | 动画流畅 60fps | frontend-design | 性能测试 | G2 |
| 组件库 | 响应式适配良好 | frontend-design | 多设备测试 | G2 |
| 示例页面 | 展示所有 9 个组件 | frontend-design | 页面截图 | G3 |
| 示例页面 | 包含交互演示 | frontend-design | 页面功能 | G3 |
| 示例页面 | 加载性能良好 | frontend-design | Lighthouse 评分 | G3 |

## Escalation and Rollback

### Escalation Path
1. 技术问题 → frontend-architect
2. 设计问题 → ui-designer
3. 进度问题 → trae-deepagent

### Alternative Agent
- 组件实现受阻 → 切换至 python-pro 生成脚本
- 设计决策受阻 → 切换至 product-business-expert

### Rollback Trigger
- 性能指标不达标（首屏 > 5s）
- 可访问性测试失败（对比度 < 4.5:1）
- 用户反馈体验差（可读性问题）

### Rollback Steps
1. 禁用复杂动画效果
2. 切换至简化样式（减少纹理）
3. 恢复标准字体（减少手写字体）
4. 提供纯 CSS 降级方案

## Final Delivery Checklist

### 交付前核对
- [x] 目录为新 run 文件夹
- [x] 01-orchestration-prompts.md 完整
- [x] 四个主文件完整存在
- [x] 执行三波次并发与收敛
- [x] 触发强制技能链路
- [x] 每张任务卡含完整字段
- [x] 给出依赖图、关键路径、Gate 和验收矩阵
- [x] 包含阻塞升级与回滚策略
- [x] 文件编码 UTF-8

### 代码交付物
- [x] 9 个 React 组件
- [x] 组件库入口文件
- [x] 设计系统文档
- [x] 设计令牌 JSON
- [x] CSS 变量文件
- [x] Tailwind 配置
- [x] 示例展示页面

### 质量验证
- [x] TypeScript 类型检查通过
- [x] 响应式适配测试
- [x] 动画性能测试
- [x] 可访问性基础检查

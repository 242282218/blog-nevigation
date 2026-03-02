# AGENTS.md - Codex 项目说明

## 快速开始
1. 新成员按入场顺序阅读 [`.codex/core/AGENT.md#quick-start`](./.codex/core/AGENT.md#quick-start)。
2. 必读规则见 [`.codex/core/RULES.md`](./.codex/core/RULES.md)。
3. 工程约定见 [`.codex/core/CONVENTIONS.md`](./.codex/core/CONVENTIONS.md)。

## 规则链路
- 入口层：`AGENTS.md`（作用域与索引）。
- 执行层：`.codex/core/AGENT.md`（流程与决策框架）。
- 约束层：`.codex/core/RULES.md`（强制规则与触发矩阵）。
- 规范层：`.codex/core/CONVENTIONS.md`（工程实现标准）。

## 冲突裁决优先级
1. `RULES.md` 与 `CONVENTIONS.md` 冲突时，以 `RULES.md` 为准。
2. `AGENT.md` 仅定义执行流程，不得弱化 `RULES.md` 的强制约束。
3. `AGENTS.md` 作为入口索引，不新增与核心规则冲突的行为约束。
4. 未覆盖场景按 `CONVENTIONS.md` 与最小改动原则执行。

## 必要流程
- 执行前先给出方案，确认后再实施。
- 执行中小步推进，每步都验证。
- 遇到阻塞时切换策略并继续，不要静默中止。

## 结构策略（.codex 标准）
- Git 同步范围为 `./.codex/` 与本 `AGENTS.md`。
- 项目框架文件统一放在 `./.codex/`：`core/`、`skills/`、`snippets/`、`templates/`。
- 运行时技能目录位于用户级：`%USERPROFILE%\\.codex\\skills`。
- 本文件只使用相对链接，不要硬编码本地绝对路径。

## 参考
- 执行框架：[`.codex/core/AGENT.md`](./.codex/core/AGENT.md)
- 规则细则：[`.codex/core/RULES.md`](./.codex/core/RULES.md)
- 编码约定：[`.codex/core/CONVENTIONS.md`](./.codex/core/CONVENTIONS.md)

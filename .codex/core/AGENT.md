# AGENT.md — 执行框架

> **分级阅读路径（Onboarding Ladder）**:
> - **L1 基础执行**: 阅读 [快速开始](#quick-start)，掌握执行闭环（方案 → 确认 → 实施 → 验证）。
> - **L2 规则合规**: 阅读 [完整机制](#full-mechanisms) + [RULES.md](./RULES.md)，掌握强制触发与行为约束。
> - **L3 规范治理**: 通读 `AGENT.md`、[RULES.md](./RULES.md)、[CONVENTIONS.md](./CONVENTIONS.md)，形成可审计执行基线。

---

<a id="quick-start"></a>
## 快速开始（L1 基础执行）

<a id="core-principles"></a>
### 核心原则（必读）

1. **先想后做** — 任何任务先说方案，等确认再动手
2. **只问一个问题** — 有不确定的地方，给出选项 + 推荐，只问最关键的那一个
3. **做完就验证** — 每次改动后立刻确认结果，不要攒到最后
4. **卡住就切换** — 遇到阻塞不中止，立刻换策略继续推进
5. **智能体分工** — 不同领域任务必须调用对应的专业智能体处理

<a id="workflow"></a>
### 工作流程（必读）

```text
收到任务
  → 简单理解 (目标是什么 / 有什么约束)
  → 有不确定？给选项 + 问一个问题，没有就直接进入方案
  → 说方案 (步骤清单 + 智能体/工具分配)
  → 等用户确认
  → 执行，每步做完验证
  → 最后说：改了什么 / 在哪里 / 怎么验证
```

<a id="agents-cheatsheet"></a>
### 智能体速查表（必读）

| 场景 | 智能体 | 调用时机 |
|------|--------|---------|
| 前端开发 | `frontend-architect` | React/Vue/Angular |
| 后端开发 | `backend-architect` | API/数据库/服务器 |
| Python | `python-pro` | 代码重构/性能分析 |
| API测试 | `api-test-pro` | 测试/压力测试 |
| 安全审查 | `security-quality-expert` | OWASP/合规 |
| UI设计 | `ui-designer` | 组件/视觉设计 |
| DevOps | `devops-architect` | CI/CD/监控 |
| 错误分析 | `error-detective` | 日志/错误排查 |
| 性能优化 | `performance-expert` | 应用/数据库优化 |
| 数据/AI | `data-ai-expert` | 模型/预测/推荐 |

<a id="skills-cheatsheet"></a>
### 技能速查表（必读）

| 类型 | 技能 | 触发时机 |
|------|------|---------|
| 🔒 强制 | `brainstorming` | 创造性工作前 |
| 🔒 强制 | `test-driven-development` | 写代码前 |
| 🔒 强制 | `requesting-code-review` | 完成后 |
| 📌 按需 | `vercel-react-best-practices` | React 优化 |
| 📌 按需 | `ui-ux-pro-max` | UI/UX 设计 |
| 📌 按需 | `webapp-testing` | Playwright 测试 |

---

<a id="full-mechanisms"></a>
## 完整机制（L2/L3 规则与治理）

### 规则链路（Governance Chain）

1. `AGENTS.md`：项目入口与作用域声明（告诉 Agent 在哪里找规则）。
2. `AGENT.md`：执行流程与决策框架（定义如何推进任务）。
3. `RULES.md`：强制约束与触发矩阵（定义必须做/禁止做）。
4. `CONVENTIONS.md`：工程实现规范（定义应当怎么写）。

### 冲突裁决（Policy Precedence）

1. `RULES.md` 与 `CONVENTIONS.md` 冲突时，以 `RULES.md` 为准。
2. `AGENT.md` 仅定义流程，不得覆盖或弱化 `RULES.md`。
3. `AGENTS.md` 作为入口索引；若与核心文档不一致，以 `AGENT.md` + `RULES.md` 为准。
4. 无显式规则时，按 `CONVENTIONS.md` 与最小改动原则执行。

### 推荐阅读顺序

1. [RULES.md](./RULES.md): 强制规则、技能触发条件、个人约束
2. [CONVENTIONS.md](./CONVENTIONS.md): 编码约定、技术选型、安全红线

### Task vs Skill (高频决策)

| 维度 | Task (智能体) | Skill (技能) |
|------|---------------|--------------|
| 本质 | 专业子智能体 | 预定义流程 |
| 适用 | 复杂专业问题 | 标准化步骤 |
| 典型例子 | 分析生产错误 | 先测后写 (TDD) |

### 执行速记

```text
专业领域问题     → Task
标准化流程问题   → Skill
先方案后执行     → 每步验证
遇到阻塞         → 立刻切换策略
```

### 文档职责边界

- `AGENT.md`：执行方法论与任务推进框架
- `RULES.md`：强制规则、技能触发与约束优先级
- `CONVENTIONS.md`：代码风格、技术选型与工程实践边界

---

## 相关文档

- **规则细则**: [RULES.md](./RULES.md) - 个人规则细则
- **编码约定**: [CONVENTIONS.md](./CONVENTIONS.md) - 编码约定与技术选型

---

**最后更新**: 2026-03

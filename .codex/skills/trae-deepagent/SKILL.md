---
name: trae-deepagent
description: 作为 Trae 多智能体任务大脑，基于 Task 与 Skill 机制执行 mixed-burst 高强度调度，自动把“仅目标输入”扩展为可直接复制执行的调度提示词、方案文件、按 agent 任务卡、依赖顺序与验收标准。用户需要跨角色协作、复杂研发分发、全栈交付治理、安全性能与发布收敛时触发。
---

# Trae Deep Agent Orchestrator

## Execution Contract

1. 读取 `../../core/TRAEE-MECHANISMS.md` 作为 Trae 机制单一权威来源。若与其他说明冲突，以该文档为准。
2. 接收极简输入。默认只接收 `goal`，其余内容自动推断。
3. 执行 mixed-burst 编排。先并发扩展，再并发拆分，最后收敛裁决。
4. 最大化调度密度。默认调度尽可能多的可用 agent，优先全量参与 discovery。
5. 最大化输出深度。默认详细展开，避免压缩式总结。
6. 固定产出四份文件，不得减少。
7. 每次执行新建独立 run 文件夹，禁止覆盖历史文件。
8. 输出必须可执行。禁止 `TBD`、`TODO`、空洞建议、无验收标准的描述。

## Input Model (Goal-Only)

仅要求用户提供一句目标，例如：
- `构建一个可上线的多租户后台`
- `修复支付偶发失败并建立回归机制`

在收到目标后，立即自动推断并显式写入方案：
- 技术栈与边界假设
- 交付物范围与非目标
- 约束条件与风险分级
- 质量门槛与回退策略
- 关键依赖与优先级

如果存在阻塞级不确定项，提出最少问题。否则继续推进，不中止分发。

## Output Contract (4 Files)

始终生成以下 4 个文件：
- `01-orchestration-prompts.md`
- `02-solution-plan.md`
- `03-agent-task-cards.md`
- `04-dependencies-and-acceptance.md`

## Prompt-First Mandatory Rule

1. 每次执行必须先生成 `01-orchestration-prompts.md`，再生成其余文件。
2. `01-orchestration-prompts.md` 必须包含：
- Run Metadata
- Master Prompt（总控提示词）
- Wave A/B/C 执行提示词
- Acceptance Prompt（验收提示词）
3. 若缺失 `01-orchestration-prompts.md` 或缺失上述任一块，立即判定本次运行失败，并在同一 run 目录内先补全后再继续。
4. 禁止将“仅方案文件”作为完成状态；没有可复制运行提示词一律视为未完成。

## Run Folder Policy

1. 设定根目录为 `dispatches/trae-deepagent/`。
2. 每次执行创建新目录，格式为 `run-YYYYMMDD-HHmmss-<goal-slug>-<rand4>`。
3. 规范 `goal-slug` 为小写字母、数字、连字符，长度不超过 48 字符。
4. 使用 `rand4`（base36）避免同秒冲突。
5. 禁止写回旧 run 目录。

## Mixed-Burst Orchestration

### Phase 0: Pre-Discovery (Parallel Preparation)

**目标**: 在 Wave A 前并发收集上下文，最大化后续 agent 的信息完整度

**并发执行组**（单个消息内发送所有调用）:
```python
# 代码库结构扫描
Glob(pattern="**/*.py")
Glob(pattern="**/*.tsx")
Glob(pattern="**/*.ts")
Glob(pattern="**/package.json")
Glob(pattern="**/requirements.txt")

# 关键文件读取
Read(file_path="./package.json")
Read(file_path="./README.md")
Read(file_path="./.env.example")

# 语义搜索（根据 goal 动态生成）
SearchCodebase(information_request="认证与授权逻辑")
SearchCodebase(information_request="数据库模型定义")
SearchCodebase(information_request="API 路由与端点")
```

**输出**: 代码库上下文快照，供 Wave A 使用

**耗时**: ~10-15 秒（并发）

---

### Wave A: Discovery Burst (3-Tier Parallel)

**目标**: 并发调度 15 个 agent 扩展问题空间

**Tier 1 - 基础层（立即并发）**:
```python
# 在单个消息中调用
Task(
  subagent_type="product-business-expert",
  query="分析目标 '{{GOAL}}' 的业务边界、优先级和里程碑",
  description="业务分析",
  response_language="zh"
)
Task(
  subagent_type="search",
  query="定位与 '{{GOAL}}' 相关的关键文件和概念",
  description="代码定位",
  response_language="zh"
)
```

**Tier 2 - 架构层（0.5 秒后并发）**:
```python
# 在单个消息中调用
Task(subagent_type="frontend-architect", query="...", description="前端架构", response_language="zh")
Task(subagent_type="backend-architect", query="...", description="后端架构", response_language="zh")
Task(subagent_type="ui-designer", query="...", description="UI 设计", response_language="zh")
Task(subagent_type="data-ai-expert", query="...", description="数据分析", response_language="zh")
Task(subagent_type="python-pro", query="...", description="自动化", response_language="zh")
```

**Tier 3 - 质量与运维层（1 秒后并发）**:
```python
# 在单个消息中调用
Task(subagent_type="api-test-pro", query="...", description="API 测试", response_language="zh")
Task(subagent_type="performance-expert", query="...", description="性能分析", response_language="zh")
Task(subagent_type="security-quality-expert", query="...", description="安全审查", response_language="zh")
Task(subagent_type="compliance-checker", query="...", description="合规检查", response_language="zh")
Task(subagent_type="devops-architect", query="...", description="DevOps", response_language="zh")
Task(subagent_type="cloud-devops-expert", query="...", description="云架构", response_language="zh")
Task(subagent_type="ai-integration-engineer", query="...", description="AI 集成", response_language="zh")
Task(subagent_type="error-detective", query="...", description="错误分析", response_language="zh")
```

**每个 agent 必须输出**:
- 核心假设（含置信度 0-100%）
- 主要风险（含触发条件）
- 2-3 条可行路线（含取舍对比表）
- 下游任务建议（具体到 agent 和输入）
- 可验证证据定义（文件/测试/日志/指标）

**耗时**: Tier 1 (10s) + Tier 2 (10s) + Tier 3 (10s) = ~30 秒

---

### Wave B: Execution Planning Burst (Domain Parallel)

**目标**: 并发把 Wave A 结论拆为可执行任务卡

**并发域组**（4 组同时执行）:

**域组 1 - 前端域**:
```python
Task(
  subagent_type="frontend-architect",
  query="基于 Wave A 结论，拆分前端任务卡，每卡包含 card_id/objective/steps/outputs/depends_on/acceptance/evidence/fallback",
  description="前端任务拆分",
  response_language="zh"
)
Task(
  subagent_type="ui-designer",
  query="基于 Wave A 结论，拆分 UI 设计任务卡",
  description="UI 任务拆分",
  response_language="zh"
)
```

**域组 2 - 后端域**:
```python
Task(subagent_type="backend-architect", query="...", description="后端任务拆分", response_language="zh")
Task(subagent_type="api-test-pro", query="...", description="API 测试拆分", response_language="zh")
```

**域组 3 - 基础设施域**:
```python
Task(subagent_type="devops-architect", query="...", description="DevOps 拆分", response_language="zh")
Task(subagent_type="cloud-devops-expert", query="...", description="云架构拆分", response_language="zh")
```

**域组 4 - 质量与安全域**:
```python
Task(subagent_type="security-quality-expert", query="...", description="安全任务拆分", response_language="zh")
Task(subagent_type="compliance-checker", query="...", description="合规任务拆分", response_language="zh")
Task(subagent_type="performance-expert", query="...", description="性能任务拆分", response_language="zh")
```

**任务卡要求**:
- 单卡单目标
- 卡片可独立执行与验收
- 每卡有依赖、回退、交接
- 高风险域任务加倍细化（安全/性能/发布至少 6 张卡）

**耗时**: ~10-15 秒（4 组并发）

---

### Wave C: Convergence (Sequential with Parallel Collection)

**步骤 1: 并发收集所有输出**（并发）:
```python
# 读取所有 agent 的输出结果
# 系统自动完成，无需显式调用
```

**步骤 2: 冲突检测与裁决**（串行）:
- 检测冲突类型：技术栈冲突、依赖冲突、优先级冲突、资源冲突
- 应用裁决规则：`安全 > 正确性 > 可用性 > 性能 > 体验 > 成本`
- 记录裁决理由和被放弃的方案

**步骤 3: 依赖图构建**（串行）:
- 构建任务卡依赖邻接表
- 识别关键路径（最长依赖链）
- 计算并发波次（拓扑排序）

**步骤 4: 验收矩阵生成**（串行）:
- 为每个交付物定义验收项
- 绑定 owner agent 和证据类型
- 分配 Gate 级别（G0/G1/G2/G3）

**步骤 5: 并发生成文件**（并发）:
```python
# 在单个消息中调用
Write(file_path="dispatches/trae-deepagent/run-xxx/02-solution-plan.md", content="...")
Write(file_path="dispatches/trae-deepagent/run-xxx/03-agent-task-cards.md", content="...")
Write(file_path="dispatches/trae-deepagent/run-xxx/04-dependencies-and-acceptance.md", content="...")
```

**耗时**: 收集 (即时) + 裁决 (5s) + 依赖图 (3s) + 验收矩阵 (2s) + 文件生成 (5s) = ~15 秒

## Full Agent Dispatch Matrix (15 Agents)

| Agent | 主要职责 | 必需输出 | 默认交接 |
|---|---|---|---|
| `product-business-expert` | 目标分解、业务边界、优先级 | 业务约束与里程碑 | `frontend-architect`, `backend-architect` |
| `search` | 代码库与文档定位 | 关键路径文件和概念映射 | 全部开发与测试 agent |
| `frontend-architect` | 前端架构、状态流、渲染策略 | 前端实现包与风险 | `ui-designer`, `performance-expert` |
| `backend-architect` | API、数据模型、服务边界 | 后端实现包与一致性策略 | `api-test-pro`, `devops-architect` |
| `ui-designer` | 关键流程 UI、可访问性基线 | 交互与视觉约束 | `frontend-architect` |
| `performance-expert` | 容量模型、瓶颈与压测路径 | 性能门槛与优化序列 | `api-test-pro`, `devops-architect` |
| `security-quality-expert` | 威胁建模、安全基线 | 安全红线与检查清单 | `compliance-checker` |
| `compliance-checker` | 合规要求、审计证据链 | 合规清单与证据要求 | `security-quality-expert`, `backend-architect` |
| `devops-architect` | CI/CD、发布、回滚 | 发布与回滚链路 | `cloud-devops-expert`, `error-detective` |
| `cloud-devops-expert` | 云架构、成本、弹性 | 云资源方案与成本边界 | `devops-architect`, `performance-expert` |
| `error-detective` | 故障模式、告警与排障 | 故障画像与观测指标 | `devops-architect`, `backend-architect` |
| `data-ai-expert` | 数据资产与 AI 可行性 | 数据路径与评估标准 | `ai-integration-engineer` |
| `ai-integration-engineer` | 模型接入与推理链路 | AI 集成策略与守护线 | `backend-architect`, `performance-expert` |
| `api-test-pro` | 契约、集成、负载测试 | 测试矩阵与执行序列 | `backend-architect`, `security-quality-expert` |
| `python-pro` | 自动化脚本与效率链路 | 脚本化任务与工具化建议 | `devops-architect`, `api-test-pro` |

默认策略：
- Wave A 中上述 15 个 agent 全量并发。
- Wave B 中核心 agent 至少 3 张任务卡/agent。
- 安全、性能、发布域至少双倍细化任务卡。

## Skill Injection Policy

### 固定技能链路（不可省略）

**触发时机与调用方式**:

1. **brainstorming** - 在 Wave A 前触发
```python
# 在 Phase 0 完成后立即调用
Skill(name="brainstorming")
# 等待完成后，将输出作为 Wave A 的输入上下文
```

2. **test-driven-development** - 在生成任务卡时并发注入
```python
# 在 Wave B 的后端域和前端域并发触发
Task(
  subagent_type="backend-architect",
  query="基于 TDD 原则拆分任务卡，先测试后实现",
  description="后端 TDD 拆分",
  response_language="zh"
)
# 同时触发 Skill
Skill(name="test-driven-development")
```

3. **requesting-code-review** - 在 Wave C 后触发
```python
# 在所有文件生成完成后调用
Skill(name="requesting-code-review")
# 审查生成的 4 个文件的质量和完整性
```

### 按需技能（域并发注入）

**前端域技能组**（在 Wave B 前端域并发触发）:
```python
# 如果 goal 涉及 UI/前端，在单个消息中调用
Skill(name="frontend-design")
Skill(name="web-design-guidelines")
Skill(name="vercel-react-best-practices")
```

**测试域技能组**（在 Wave B 测试域并发触发）:
```python
# 如果 goal 涉及 Web 测试，在单个消息中调用
Skill(name="webapp-testing")
Skill(name="browser-use")
```

**全栈技能**（在 Wave B 跨域任务时触发）:
```python
# 如果 goal 需要全栈协同
Skill(name="fullstack-developer")
```

### Skill 触发决策树

```
收到 goal
  ↓
Phase 0: 并发扫描代码库
  ↓
触发 Skill(brainstorming) ← 强制
  ↓
Wave A: 15 agent 并发 discovery
  ↓
判断 goal 类型
  ├─ 涉及前端? → 并发触发前端技能组
  ├─ 涉及测试? → 并发触发测试技能组
  └─ 涉及全栈? → 触发全栈技能
  ↓
Wave B: 域并发拆分 + 并发触发 Skill(test-driven-development) ← 强制
  ↓
Wave C: 收敛裁决
  ↓
触发 Skill(requesting-code-review) ← 强制
  ↓
完成
```

## Tool Invocation Heuristics

遵循 `TRAEE-MECHANISMS.md` 决策树，使用以下触发规则：

### 并发调用规则（性能优先）

**规则 1: 文件操作批量化**
```python
# ❌ 错误：串行读取
Read(file_path="./package.json")
# 等待完成
Read(file_path="./README.md")

# ✅ 正确：并发读取（单个消息）
Read(file_path="./package.json")
Read(file_path="./README.md")
Read(file_path="./.env.example")
Read(file_path="./tsconfig.json")
```

**规则 2: 搜索批量化**
```python
# ❌ 错误：串行搜索
SearchCodebase(information_request="认证逻辑")
# 等待完成
Glob(pattern="**/*.py")

# ✅ 正确：并发搜索（单个消息）
SearchCodebase(information_request="认证逻辑")
SearchCodebase(information_request="数据库模型")
Glob(pattern="**/*.py")
Glob(pattern="**/*.tsx")
Grep(pattern="class.*Model", type="py", output_mode="files_with_matches")
```

**规则 3: Agent 调度批量化**
```python
# ❌ 错误：串行调度
Task(subagent_type="frontend-architect", query="...", description="...", response_language="zh")
# 等待完成
Task(subagent_type="backend-architect", query="...", description="...", response_language="zh")

# ✅ 正确：并发调度（单个消息）
Task(subagent_type="frontend-architect", query="...", description="前端架构", response_language="zh")
Task(subagent_type="backend-architect", query="...", description="后端架构", response_language="zh")
Task(subagent_type="ui-designer", query="...", description="UI 设计", response_language="zh")
```

**规则 4: Skill 触发批量化**
```python
# ✅ 正确：域内并发触发（单个消息）
Skill(name="frontend-design")
Skill(name="web-design-guidelines")
Skill(name="vercel-react-best-practices")
```

**规则 5: 验证批量化**
```python
# ✅ 正确：并发验证（单个消息）
RunCommand(command="pnpm test:unit", blocking=True)
RunCommand(command="pnpm lint", blocking=True)
RunCommand(command="pnpm type-check", blocking=True)
GetDiagnostics(uri="file:///src/app.py")
GetDiagnostics(uri="file:///frontend/src/App.tsx")
```

### 工具选择决策树

```
需要专业判断/跨域推理？
  ├─ 是 → Task(subagent_type="...", query="...", description="...", response_language="zh")
  └─ 否 → 继续

需要标准化流程约束？
  ├─ 是 → Skill(name="...")
  └─ 否 → 继续

需要代码和上下文检索？
  ├─ 语义搜索 → SearchCodebase(information_request="...", target_directories=[...])
  ├─ 按文件名 → Glob(pattern="**/*.ext", path="...")
  ├─ 按内容 → Grep(pattern="...", type="...", output_mode="content", -n=True)
  └─ 看目录 → LS(path="...", ignore=[...])

需要文件级读写？
  ├─ 读取 → Read(file_path="...", limit=2000, offset=0)
  ├─ 精确修改 → SearchReplace(file_path="...", old_str="...", new_str="...")
  ├─ 创建/覆盖 → Write(file_path="...", content="...")
  └─ 删除 → DeleteFile(file_paths=[...])

需要执行命令？
  ├─ 运行 → RunCommand(command="...", blocking=True/False, cwd="...")
  ├─ 检查 → CheckCommandStatus(command_id="...", output_priority="bottom")
  └─ 停止 → StopCommand(command_id="...")

需要网页交互/API 测试？
  └─ Playwright 工具集（mcp_Playwright_playwright_*）

需要查询文档？
  └─ mcp_context7_query-docs(libraryId="...", query="...")

需要外部信息？
  ├─ 搜索 → WebSearch(query="...", num=5, lr="lang_zh")
  └─ 抓取 → WebFetch(url="...")
```

### 文件写入分块策略

**问题**: Write 工具单次写入不应超过 50 行

**解决方案**:
```python
# 对于大文件（>50 行），分块写入
# 步骤 1: 写入前 50 行
Write(
  file_path="dispatches/trae-deepagent/run-xxx/01-orchestration-prompts.md",
  content="前 50 行内容..."
)

# 步骤 2: 追加剩余内容（使用 SearchReplace）
SearchReplace(
  file_path="dispatches/trae-deepagent/run-xxx/01-orchestration-prompts.md",
  old_str="[最后一行内容]",
  new_str="[最后一行内容]\n\n[追加的内容...]"
)
```

**自动分块规则**:
- 估算内容行数
- 如果 ≤ 50 行：直接 Write
- 如果 > 50 行：Write 前 50 行 + SearchReplace 追加剩余

### Context7 文档查询示例

```python
# 步骤 1: 解析库 ID
mcp_context7_resolve-library-id(
  libraryName="react",
  query="hooks useEffect"
)

# 步骤 2: 查询文档
mcp_context7_query-docs(
  libraryId="/vercel/next.js",
  query="SSR 配置与性能优化"
)
```

## No-Source Fallback Rule

当任务是“审查/优化 UI 一致性”但仓库中缺少可审计前端源码（如 `.tsx/.jsx/.css/.html`）时，必须执行以下兜底输出：
1. 在不一致点列表中显式写明“不可审计原因”和已扫描文件类型。
2. 仍然产出完整可运行提示词（`01-orchestration-prompts.md`）。
3. 仍然产出完整 design token 方案与可复用全局样式文件。
4. 在结论中给出“待接入真实项目后的二次审计入口”。

## Encoding and Copyability Rule

1. 所有生成文件使用 UTF-8 编码，避免中文乱码。
2. 所有提示词块放在 fenced code block（```text）中，确保可直接复制。
3. 输出中不得出现截断提示词、半结构化短句或只给关键词不成稿的情况。
4. 对关键提示词（Master/Wave/Acceptance）必须提供完整段落，不可省略。

## Task Card Specification

为 `03-agent-task-cards.md` 的每张卡片强制使用以下字段：
- `card_id`
- `agent`
- `objective`
- `inputs`
- `steps`
- `outputs`
- `depends_on`
- `blocks`
- `acceptance`
- `evidence`
- `fallback`
- `handoff_to`

卡片粒度规则：
1. 只承载一个清晰目标。
2. 可独立执行和独立验收。
3. 必须绑定证据类型（文件、测试、日志、截图、诊断）。
4. 必须声明阻塞与回退策略。

## Dependency and Acceptance Specification

在 `04-dependencies-and-acceptance.md` 中固定输出：
- 依赖图（邻接表）
- 并发波次（可并发组 + 同步点）
- 关键路径（延误影响 + 缩短策略）
- Gate 检查（G0/G1/G2/G3）
- 验收矩阵（交付物 -> 验收项 -> owner agent -> evidence）
- 升级和回滚策略

## Conflict Resolution and Convergence

### 冲突检测算法

**步骤 1: 收集所有 agent 输出**
```python
# 自动收集 Wave A 和 Wave B 的所有输出
agent_outputs = {
  “frontend-architect”: {...},
  “backend-architect”: {...},
  ...
}
```

**步骤 2: 按类型检测冲突**

**冲突类型 1: 技术栈冲突**
```python
# 检测逻辑
tech_stacks = {}
for agent, output in agent_outputs.items():
  if “技术栈” in output:
    tech_stacks[agent] = output[“技术栈”]

# 冲突判定
if len(set(tech_stacks.values())) > 1:
  conflict = {
    “type”: “技术栈冲突”,
    “sources”: tech_stacks,
    “example”: “frontend-architect 建议 React，ui-designer 建议 Vue”
  }
```

**冲突类型 2: 依赖冲突**
```python
# 检测逻辑：检查任务卡的 depends_on 是否形成循环
task_cards = [所有任务卡]
dependency_graph = build_graph(task_cards)

if has_cycle(dependency_graph):
  conflict = {
    “type”: “依赖循环”,
    “cycle”: detect_cycle(dependency_graph),
    “example”: “CARD-001 → CARD-002 → CARD-003 → CARD-001”
  }
```

**冲突类型 3: 优先级冲突**
```python
# 检测逻辑：检查同一资源的多个高优先级任务
resource_tasks = group_by_resource(task_cards)

for resource, tasks in resource_tasks.items():
  high_priority_tasks = [t for t in tasks if t[“priority”] == “high”]
  if len(high_priority_tasks) > 1:
    conflict = {
      “type”: “优先级冲突”,
      “resource”: resource,
      “tasks”: high_priority_tasks,
      “example”: “CARD-001 和 CARD-005 都需要前端工程师且都是高优先级”
    }
```

**冲突类型 4: 资源冲突**
```python
# 检测逻辑：检查并发任务是否超出资源限制
concurrent_waves = calculate_concurrent_waves(task_cards)

for wave in concurrent_waves:
  required_agents = count_required_agents(wave)
  if required_agents > available_agents:
    conflict = {
      “type”: “资源不足”,
      “wave”: wave,
      “required”: required_agents,
      “available”: available_agents
    }
```

### 冲突裁决规则

**裁决优先级**（从高到低）:
```
安全 > 正确性 > 可用性 > 性能 > 体验 > 成本
```

**裁决执行**:

**规则 1: 技术栈冲突裁决**
```python
# 裁决逻辑
if “安全” in conflict_reasons:
  # 选择安全性最高的方案
  winner = max(options, key=lambda x: x[“security_score”])
elif “正确性” in conflict_reasons:
  # 选择正确性最高的方案
  winner = max(options, key=lambda x: x[“correctness_score”])
else:
  # 选择证据最强的方案
  winner = max(options, key=lambda x: len(x[“evidence”]))

# 记录裁决
decision = {
  “conflict_id”: “CONF-001”,
  “type”: “技术栈冲突”,
  “options”: options,
  “winner”: winner,
  “reason”: “安全性最高（score: 95/100）”,
  “rejected”: [opt for opt in options if opt != winner],
  “arbiter_agent”: “security-quality-expert”
}
```

**规则 2: 依赖冲突裁决**
```python
# 裁决逻辑：打破循环
cycle = detect_cycle(dependency_graph)

# 找到循环中依赖最弱的边
weakest_edge = min(cycle, key=lambda edge: edge[“dependency_strength”])

# 移除该边
remove_dependency(weakest_edge)

# 记录裁决
decision = {
  “conflict_id”: “CONF-002”,
  “type”: “依赖循环”,
  “cycle”: cycle,
  “removed_edge”: weakest_edge,
  “reason”: “该依赖强度最低（strength: 0.3），可通过异步处理解耦”,
  “arbiter_agent”: “backend-architect”
}
```

**规则 3: 优先级冲突裁决**
```python
# 裁决逻辑：重新排序
conflicting_tasks = get_conflicting_tasks()

# 按关键路径影响排序
sorted_tasks = sorted(
  conflicting_tasks,
  key=lambda t: (
    t[“critical_path_impact”],  # 关键路径影响
    t[“risk_level”],            # 风险级别
    -t[“dependency_count”]      # 被依赖数（负数表示降序）
  ),
  reverse=True
)

# 重新分配优先级
for i, task in enumerate(sorted_tasks):
  task[“priority”] = [“high”, “medium”, “low”][min(i, 2)]

# 记录裁决
decision = {
  “conflict_id”: “CONF-003”,
  “type”: “优先级冲突”,
  “original_priorities”: {t[“card_id”]: t[“priority”] for t in conflicting_tasks},
  “new_priorities”: {t[“card_id”]: t[“priority”] for t in sorted_tasks},
  “reason”: “按关键路径影响重新排序”,
  “arbiter_agent”: “product-business-expert”
}
```

### 收敛输出

**步骤 3: 去重与合并**
```python
# 去重规则：保留”证据更强 + 依赖更短 + 回退更完整”的版本
def deduplicate_tasks(task_cards):
  grouped = group_by_objective(task_cards)

  for objective, tasks in grouped.items():
    if len(tasks) > 1:
      # 计算每个任务的质量分数
      scores = []
      for task in tasks:
        score = (
          len(task[“evidence”]) * 3 +      # 证据数量权重 3
          (10 - len(task[“depends_on”])) + # 依赖越少越好
          len(task[“fallback”]) * 2        # 回退方案权重 2
        )
        scores.append((task, score))

      # 保留分数最高的
      winner = max(scores, key=lambda x: x[1])[0]

      # 记录去重
      dedup_log.append({
        “objective”: objective,
        “duplicates”: len(tasks),
        “winner”: winner[“card_id”],
        “rejected”: [t[“card_id”] for t in tasks if t != winner]
      })

  return [winner for objective, tasks in grouped.items() for winner in [max(...)]]
```

**步骤 4: 生成最终方案**
```python
# 最终输出包含
final_solution = {
  “conflicts_detected”: [所有检测到的冲突],
  “decisions_made”: [所有裁决记录],
  “deduplication_log”: [去重日志],
  “final_task_cards”: [去重后的任务卡],
  “dependency_graph”: [最终依赖图],
  “critical_path”: [关键路径],
  “concurrent_waves”: [并发波次],
  “acceptance_matrix”: [验收矩阵]
}
```

## Quality Gates

定义四级门禁：
- `G0 Clarity Gate`：目标和边界清晰，假设透明。
- `G1 Feasibility Gate`：方案可执行、依赖闭环、风险可控。
- `G2 Build-Ready Gate`：任务卡与测试计划可直接执行。
- `G3 Release-Ready Gate`：验收矩阵、回滚预案和证据链完整。

任一 Gate 未通过时，回退到上一个波次修订。

## Failure Recovery Policy

### 阻塞类型检测

**检测 1: 信息缺失**
```python
# 检测逻辑
def detect_information_gap(agent_output):
  required_fields = ["假设", "风险", "可行路线", "下游任务", "证据定义"]
  missing_fields = [f for f in required_fields if f not in agent_output or not agent_output[f]]

  if missing_fields:
    return {
      "type": "信息缺失",
      "agent": agent_output["agent_name"],
      "missing_fields": missing_fields,
      "severity": "high" if len(missing_fields) > 2 else "medium"
    }
  return None

# 触发条件
if agent_output["假设"] == [] or agent_output["置信度"] < 30:
  trigger_recovery("信息缺失")
```

**检测 2: 依赖失败**
```python
# 检测逻辑
def detect_dependency_failure(task_card):
  for dep_id in task_card["depends_on"]:
    dep_task = find_task(dep_id)
    if dep_task["status"] == "failed" or dep_task["status"] == "blocked":
      return {
        "type": "依赖失败",
        "task": task_card["card_id"],
        "failed_dependency": dep_id,
        "failure_reason": dep_task.get("failure_reason", "未知")
      }
  return None

# 触发条件
if any(dep.status == "failed" for dep in dependencies):
  trigger_recovery("依赖失败")
```

**检测 3: 冲突未决**
```python
# 检测逻辑
def detect_unresolved_conflict(conflicts):
  unresolved = [c for c in conflicts if "winner" not in c or not c["winner"]]

  if unresolved:
    return {
      "type": "冲突未决",
      "count": len(unresolved),
      "conflicts": unresolved,
      "blocking_tasks": get_blocked_by_conflicts(unresolved)
    }
  return None

# 触发条件
if len(unresolved_conflicts) > 0 and time_elapsed > 60:
  trigger_recovery("冲突未决")
```

**检测 4: 资源不足**
```python
# 检测逻辑
def detect_resource_shortage(concurrent_wave):
  required_agents = count_required_agents(concurrent_wave)
  available_agents = get_available_agents()

  if required_agents > available_agents:
    return {
      "type": "资源不足",
      "required": required_agents,
      "available": available_agents,
      "shortage": required_agents - available_agents,
      "affected_tasks": get_tasks_in_wave(concurrent_wave)
    }
  return None

# 触发条件
if required_agents > available_agents:
  trigger_recovery("资源不足")
```

### 恢复策略执行

**策略 1: 信息缺失恢复**
```python
# 恢复步骤
def recover_from_information_gap(blockage):
  # 步骤 1: 启用替代 agent
  alternative_agents = {
    "frontend-architect": ["ui-designer", "fullstack-developer"],
    "backend-architect": ["python-pro", "fullstack-developer"],
    "security-quality-expert": ["compliance-checker", "backend-architect"]
  }

  original_agent = blockage["agent"]
  alternatives = alternative_agents.get(original_agent, [])

  # 步骤 2: 并发调用替代 agent
  for alt_agent in alternatives:
    Task(
      subagent_type=alt_agent,
      query=f"补充 {original_agent} 缺失的信息：{blockage['missing_fields']}",
      description=f"{alt_agent} 补充",
      response_language="zh"
    )

  # 步骤 3: 合并输出
  # 等待所有替代 agent 完成
  # 合并输出到原始 agent 的结果中

  # 步骤 4: 二次验证
  verify_completeness(merged_output)

  return {
    "recovery_type": "信息缺失恢复",
    "original_agent": original_agent,
    "alternative_agents": alternatives,
    "status": "recovered" if verify_completeness(merged_output) else "failed"
  }
```

**策略 2: 依赖失败恢复**
```python
# 恢复步骤
def recover_from_dependency_failure(blockage):
  failed_dep = blockage["failed_dependency"]
  blocked_task = blockage["task"]

  # 步骤 1: 检查是否有替代路径
  alternative_paths = find_alternative_paths(blocked_task, failed_dep)

  if alternative_paths:
    # 选择最短替代路径
    best_path = min(alternative_paths, key=lambda p: len(p))

    # 更新依赖
    update_dependency(blocked_task, failed_dep, best_path)

    return {
      "recovery_type": "依赖失败恢复",
      "strategy": "替代路径",
      "original_dependency": failed_dep,
      "new_path": best_path,
      "status": "recovered"
    }

  else:
    # 步骤 2: 降级任务范围
    degraded_task = degrade_task_scope(blocked_task, failed_dep)

    return {
      "recovery_type": "依赖失败恢复",
      "strategy": "降级范围",
      "original_task": blocked_task,
      "degraded_task": degraded_task,
      "removed_dependency": failed_dep,
      "status": "degraded"
    }
```

**策略 3: 冲突未决恢复**
```python
# 恢复步骤
def recover_from_unresolved_conflict(blockage):
  unresolved_conflicts = blockage["conflicts"]

  # 步骤 1: 启用仲裁 agent
  arbiter_map = {
    "技术栈冲突": "backend-architect",
    "依赖冲突": "product-business-expert",
    "优先级冲突": "product-business-expert",
    "资源冲突": "devops-architect"
  }

  for conflict in unresolved_conflicts:
    arbiter = arbiter_map.get(conflict["type"], "product-business-expert")

    # 调用仲裁 agent
    Task(
      subagent_type=arbiter,
      query=f"裁决冲突：{conflict}，应用优先级规则：安全 > 正确性 > 可用性 > 性能 > 体验 > 成本",
      description=f"冲突裁决",
      response_language="zh"
    )

  # 步骤 2: 应用裁决结果
  # 等待仲裁完成
  # 更新冲突状态

  return {
    "recovery_type": "冲突未决恢复",
    "conflicts_resolved": len(unresolved_conflicts),
    "arbiters_used": list(set(arbiter_map.values())),
    "status": "recovered"
  }
```

**策略 4: 资源不足恢复**
```python
# 恢复步骤
def recover_from_resource_shortage(blockage):
  affected_tasks = blockage["affected_tasks"]

  # 步骤 1: 重新调度（拆分并发波次）
  # 将一个大波次拆分为多个小波次
  original_wave = get_wave(affected_tasks)
  sub_waves = split_wave(original_wave, max_concurrent=blockage["available"])

  # 步骤 2: 更新并发计划
  update_concurrent_plan(sub_waves)

  return {
    "recovery_type": "资源不足恢复",
    "strategy": "拆分波次",
    "original_wave_size": len(original_wave),
    "new_waves_count": len(sub_waves),
    "new_waves": sub_waves,
    "status": "recovered"
  }
```

### 恢复决策树

```
检测到阻塞
  ↓
判断阻塞类型
  ├─ 信息缺失
  │   ├─ severity == "high" → 启用 2 个替代 agent
  │   └─ severity == "medium" → 启用 1 个替代 agent
  │
  ├─ 依赖失败
  │   ├─ 存在替代路径 → 更新依赖
  │   └─ 无替代路径 → 降级任务范围
  │
  ├─ 冲突未决
  │   ├─ 冲突数 ≤ 3 → 启用仲裁 agent
  │   └─ 冲突数 > 3 → 应用默认裁决规则（安全优先）
  │
  └─ 资源不足
      ├─ 可拆分 → 拆分并发波次
      └─ 不可拆分 → 串行执行
  ↓
执行恢复策略
  ↓
二次验证
  ├─ 成功 → 继续执行
  └─ 失败 → 记录失败原因，输出回滚方案
```

### 防止无限循环

**规则 1: 恢复次数限制**
```python
MAX_RECOVERY_ATTEMPTS = 3

recovery_count = {}

def trigger_recovery(blockage_type):
  key = f"{blockage_type}_{blockage_id}"

  if key not in recovery_count:
    recovery_count[key] = 0

  recovery_count[key] += 1

  if recovery_count[key] > MAX_RECOVERY_ATTEMPTS:
    # 放弃恢复，输出失败报告
    return {
      "status": "abandoned",
      "reason": f"超过最大恢复次数（{MAX_RECOVERY_ATTEMPTS}）",
      "blockage": blockage,
      "recovery_history": get_recovery_history(key)
    }

  # 执行恢复
  return execute_recovery(blockage_type)
```

**规则 2: 恢复超时**
```python
RECOVERY_TIMEOUT = 120  # 秒

def execute_recovery_with_timeout(blockage):
  start_time = time.now()

  while time.now() - start_time < RECOVERY_TIMEOUT:
    result = execute_recovery(blockage)

    if result["status"] == "recovered":
      return result

  # 超时
  return {
    "status": "timeout",
    "reason": f"恢复超时（{RECOVERY_TIMEOUT}s）",
    "blockage": blockage
  }
```

## Anti-Patterns (Hard Blockers)

以下情况视为失败，必须返工：
- 缺失 `01-orchestration-prompts.md` 或其内容不完整。
- 缺失任一主文件。
- 任务卡没有依赖、验收或证据。
- 未生成依赖图、关键路径、Gate 与验收矩阵。
- 未触发强制技能链路。
- 输出过薄、仅观点无执行动作。
- 复用旧 run 目录或覆盖历史文件。
- 输出文件出现明显编码乱码，导致提示词不可复制执行。

## Template A: Master Orchestrator Prompt

复制以下模板到 `01-orchestration-prompts.md`：

```md
## Master Orchestrator Prompt
你是 `trae-deepagent`，职责是作为多智能体任务大脑完成高强度分发与收敛。

输入只有一行目标：`{{GOAL}}`。
你必须先自动推断：技术栈、交付物、约束、风险、质量门槛、回退策略。
你必须执行 mixed-burst 三波次：
- Wave A Discovery Burst：并发探索问题空间并给可执行结论。
- Wave B Execution Planning Burst：并发拆分为可执行任务卡。
- Wave C Convergence：统一冲突、依赖、关键路径、验收矩阵。

你必须调度尽可能多的可用 agent，默认覆盖 15 agent discovery。
你必须生成并写入 4 个固定文件：
1) 01-orchestration-prompts.md
2) 02-solution-plan.md
3) 03-agent-task-cards.md
4) 04-dependencies-and-acceptance.md

你必须确保每个结论都有可验证证据类型，禁止输出空泛建议。
```

## Template B: Per-Agent Prompt

复制以下模板到 `01-orchestration-prompts.md` 的 `Per-Agent Prompt Deck`：

```md
### {{AGENT_NAME}}
你是 `{{AGENT_NAME}}`。
围绕目标 `{{GOAL}}` 输出可执行结论，禁止泛化建议。

必须输出：
1. 假设（含置信度）
2. 风险（含触发条件）
3. 2-3 条可行路径（含取舍）
4. 下游任务建议
5. 可验证证据定义

输出格式：
- findings:
- actions:
- deliverables:
- handoff_to:
```

## Template C: Solution Plan Skeleton

复制以下模板到 `02-solution-plan.md`：

```md
# 02-solution-plan.md

## Goal Expansion
- 原始目标:
- 推断目标树:
- 非目标:
- 成功定义:

## Auto Assumptions
- 技术栈假设:
- 约束假设:
- 风险假设:
- 置信度:

## Architecture Options
### Option A
- 摘要:
- 优点:
- 风险:

### Option B
- 摘要:
- 优点:
- 风险:

### Option C
- 摘要:
- 优点:
- 风险:

## Recommendation
- 推荐方案:
- 推荐理由:
- 放弃理由:

## Mixed-Burst Plan
### Wave A
- 输入:
- 输出:
- 完成定义:

### Wave B
- 输入:
- 输出:
- 完成定义:

### Wave C
- 输入:
- 输出:
- 完成定义:

## Quality Bars
- 正确性:
- 安全性:
- 性能:
- 可回滚:

## Recovery Strategy
- 回退触发:
- 回退步骤:
- 二次验证:
```

## Template D: Agent Task Card Skeleton

复制以下模板到 `03-agent-task-cards.md`：

```md
# 03-agent-task-cards.md

## Task Index
| card_id | agent | priority | status | depends_on | handoff_to |
|---|---|---|---|---|---|

## Task Cards
### CARD-001
- card_id:
- agent:
- objective:
- inputs:
- steps:
- outputs:
- depends_on:
- blocks:
- acceptance:
- evidence:
- fallback:
- handoff_to:
```

## Template E: Dependency and Acceptance Skeleton

复制以下模板到 `04-dependencies-and-acceptance.md`：

```md
# 04-dependencies-and-acceptance.md

## Dependency Graph
- CARD-001 -> [CARD-004, CARD-006]

## Concurrency Waves
### Wave-1
- cards:
- sync_point:

### Wave-2
- cards:
- sync_point:

## Critical Path
- path:
- delay_impact:
- shorten_actions:

## Gate Checks
### G0 Clarity Gate
- pass_criteria:
- fail_action:

### G1 Feasibility Gate
- pass_criteria:
- fail_action:

### G2 Build-Ready Gate
- pass_criteria:
- fail_action:

### G3 Release-Ready Gate
- pass_criteria:
- fail_action:

## Acceptance Matrix
| deliverable | acceptance_item | owner_agent | evidence | gate |
|---|---|---|---|---|

## Escalation and Rollback
- escalation_path:
- alternative_agent:
- rollback_trigger:
- rollback_steps:
```

## Performance Optimization (Concurrency-First)

### 核心原则

**最大化并发，最小化等待**

在包时间计费模式下，优先考虑速度而非 token 消耗。所有无依赖的操作必须并发执行。

### 性能指标

**目标性能**:
- Phase 0（扫描）: ≤ 15 秒
- Wave A（15 agents）: ≤ 30 秒（3 层并发）
- Wave B（4 域）: ≤ 15 秒（域并发）
- Wave C（收敛）: ≤ 15 秒
- 文件生成: ≤ 5 秒（3 文件并发）
- **总计: ≤ 80 秒**（vs 串行 260 秒，提升 3.25 倍）

### 并发策略矩阵

| 阶段 | 并发方式 | 并发度 | 预期耗时 |
|------|---------|--------|---------|
| Phase 0 | 单消息多工具 | 8-12 个工具 | 10-15s |
| Wave A Tier 1 | 单消息多 Task | 2 agents | 10s |
| Wave A Tier 2 | 单消息多 Task | 5 agents | 10s |
| Wave A Tier 3 | 单消息多 Task | 8 agents | 10s |
| Wave B | 单消息多 Task | 4 域 × 2-3 agents | 10-15s |
| Wave C 收集 | 自动 | N/A | 即时 |
| Wave C 文件 | 单消息多 Write | 3 文件 | 5s |
| 验证 | 单消息多 RunCommand | 3-5 命令 | 10s |

### Anti-Pattern（性能杀手）

**❌ 禁止的串行模式**:
```python
# 错误示例 1: 串行读取文件
Read(file_path="./package.json")
# 等待...
Read(file_path="./README.md")
# 等待...
Read(file_path="./.env.example")

# 错误示例 2: 串行调用 agent
Task(subagent_type="frontend-architect", ...)
# 等待...
Task(subagent_type="backend-architect", ...)

# 错误示例 3: 串行搜索
SearchCodebase(information_request="认证")
# 等待...
SearchCodebase(information_request="数据库")
```

**✅ 正确的并发模式**:
```python
# 正确示例: 单消息并发
Read(file_path="./package.json")
Read(file_path="./README.md")
Read(file_path="./.env.example")
SearchCodebase(information_request="认证")
SearchCodebase(information_request="数据库")
Glob(pattern="**/*.py")
Glob(pattern="**/*.tsx")
Task(subagent_type="frontend-architect", ...)
Task(subagent_type="backend-architect", ...)
```

### 并发实现检查清单

执行前检查：
- [ ] Phase 0 的所有工具调用是否在单个消息中？
- [ ] Wave A 的每个 Tier 是否在单个消息中调用所有 agent？
- [ ] Wave B 的 4 个域是否在单个消息中并发？
- [ ] Wave C 的 3 个文件是否在单个消息中生成？
- [ ] 验证命令是否在单个消息中并发执行？

---

## Complete End-to-End Example

### 示例目标

```
构建一个支持多租户的 SaaS 后台管理系统
```

### 执行流程

**Phase 0: Pre-Discovery（10 秒）**

```python
# 单个消息中并发执行
Glob(pattern="**/*.py")
Glob(pattern="**/*.tsx")
Glob(pattern="**/package.json")
Read(file_path="./package.json")
Read(file_path="./README.md")
SearchCodebase(information_request="认证授权")
SearchCodebase(information_request="租户隔离")
SearchCodebase(information_request="数据库模型")
```

**输出**:
```
- 发现 Python 文件 45 个
- 发现 TypeScript 文件 78 个
- 技术栈: React + FastAPI + PostgreSQL
- 已有认证模块: JWT
- 缺少租户隔离机制
```

**Skill: brainstorming（5 秒）**

```python
Skill(name="brainstorming")
```

**输出**:
```
- 核心需求: 租户隔离、权限管理、数据隔离
- 技术方案: Row-Level Security (RLS) + 租户上下文中间件
- 风险: 数据泄露、性能瓶颈
```

**Wave A Tier 1（10 秒）**

```python
# 单个消息
Task(
  subagent_type="product-business-expert",
  query="分析多租户 SaaS 后台的业务边界、优先级和里程碑",
  description="业务分析",
  response_language="zh"
)
Task(
  subagent_type="search",
  query="定位现有认证、数据库、API 相关代码",
  description="代码定位",
  response_language="zh"
)
```

**输出**:
```
product-business-expert:
- 假设: 每个租户独立数据库 schema（置信度 80%）
- 风险: 租户数量增长导致连接池耗尽（触发条件: >100 租户）
- 可行路线:
  1. Schema-per-tenant（隔离性强，成本高）
  2. Row-Level Security（成本低，复杂度中）
  3. Database-per-tenant（隔离性最强，成本最高）
- 推荐: Row-Level Security
- 下游任务: backend-architect 设计 RLS 策略

search:
- 关键文件:
  - /backend/auth/jwt.py（JWT 认证）
  - /backend/models/user.py（用户模型）
  - /backend/db/session.py（数据库会话）
- 缺失: 租户模型、租户中间件
```

**Wave A Tier 2（10 秒）**

```python
# 单个消息
Task(subagent_type="frontend-architect", query="设计多租户前端架构", description="前端架构", response_language="zh")
Task(subagent_type="backend-architect", query="设计多租户后端架构和 RLS 策略", description="后端架构", response_language="zh")
Task(subagent_type="ui-designer", query="设计租户切换和管理 UI", description="UI 设计", response_language="zh")
Task(subagent_type="data-ai-expert", query="分析租户数据隔离和查询性能", description="数据分析", response_language="zh")
Task(subagent_type="python-pro", query="设计租户上下文管理和中间件", description="Python 优化", response_language="zh")
```

**输出**（部分）:
```
backend-architect:
- 假设: 使用 PostgreSQL RLS（置信度 90%）
- 架构:
  1. 租户模型（Tenant）
  2. 租户上下文中间件（TenantMiddleware）
  3. RLS 策略（CREATE POLICY）
  4. 租户 ID 注入（set_config）
- 风险: RLS 策略配置错误导致数据泄露（高风险）
- 下游任务: security-quality-expert 审查 RLS 策略
```

**Wave A Tier 3（10 秒）**

```python
# 单个消息
Task(subagent_type="api-test-pro", query="设计多租户 API 测试策略", description="API 测试", response_language="zh")
Task(subagent_type="performance-expert", query="分析多租户性能瓶颈", description="性能分析", response_language="zh")
Task(subagent_type="security-quality-expert", query="审查多租户安全风险", description="安全审查", response_language="zh")
Task(subagent_type="compliance-checker", query="检查多租户合规要求", description="合规检查", response_language="zh")
Task(subagent_type="devops-architect", query="设计多租户部署策略", description="DevOps", response_language="zh")
Task(subagent_type="cloud-devops-expert", query="设计多租户云架构", description="云架构", response_language="zh")
Task(subagent_type="ai-integration-engineer", query="评估 AI 功能在多租户场景", description="AI 集成", response_language="zh")
Task(subagent_type="error-detective", query="分析多租户错误模式", description="错误分析", response_language="zh")
```

**Wave B: 域并发拆分（15 秒）**

```python
# 单个消息，4 域并发
# 前端域
Task(subagent_type="frontend-architect", query="拆分前端任务卡", description="前端拆分", response_language="zh")
Task(subagent_type="ui-designer", query="拆分 UI 任务卡", description="UI 拆分", response_language="zh")

# 后端域
Task(subagent_type="backend-architect", query="拆分后端任务卡", description="后端拆分", response_language="zh")
Task(subagent_type="api-test-pro", query="拆分测试任务卡", description="测试拆分", response_language="zh")

# 基础设施域
Task(subagent_type="devops-architect", query="拆分 DevOps 任务卡", description="DevOps 拆分", response_language="zh")
Task(subagent_type="cloud-devops-expert", query="拆分云架构任务卡", description="云拆分", response_language="zh")

# 质量域
Task(subagent_type="security-quality-expert", query="拆分安全任务卡", description="安全拆分", response_language="zh")
Task(subagent_type="performance-expert", query="拆分性能任务卡", description="性能拆分", response_language="zh")

# 同时触发 TDD Skill
Skill(name="test-driven-development")
```

**输出**（部分任务卡）:
```
CARD-001:
- agent: backend-architect
- objective: 创建租户模型和数据库迁移
- steps:
  1. 定义 Tenant 模型（id, name, slug, created_at）
  2. 创建数据库迁移文件
  3. 添加租户外键到 User 模型
- outputs: models/tenant.py, migrations/001_create_tenant.py
- depends_on: []
- acceptance: 迁移成功执行，租户表创建
- evidence: 数据库 schema 截图，迁移日志
- fallback: 回滚迁移，删除租户表

CARD-002:
- agent: backend-architect
- objective: 实现租户上下文中间件
- steps:
  1. 创建 TenantMiddleware
  2. 从请求头提取租户 ID
  3. 设置 PostgreSQL session 变量
- outputs: middleware/tenant.py
- depends_on: [CARD-001]
- acceptance: 中间件正确设置租户上下文
- evidence: 单元测试通过，日志显示租户 ID
- fallback: 禁用中间件，使用默认租户

CARD-003:
- agent: security-quality-expert
- objective: 配置 PostgreSQL RLS 策略
- steps:
  1. 为每个表启用 RLS
  2. 创建租户隔离策略
  3. 测试跨租户访问被阻止
- outputs: migrations/002_enable_rls.sql
- depends_on: [CARD-001, CARD-002]
- acceptance: RLS 策略阻止跨租户访问
- evidence: 安全测试报告，SQL 审计日志
- fallback: 禁用 RLS，使用应用层过滤
```

**Wave C: 收敛（15 秒）**

```python
# 步骤 1: 自动收集所有输出（即时）

# 步骤 2: 冲突检测（2 秒）
# 检测到冲突:
# - frontend-architect 建议使用 Context API
# - ui-designer 建议使用 Redux
# 裁决: Context API（体验优先，成本更低）

# 步骤 3: 依赖图构建（3 秒）
# CARD-001 -> [CARD-002, CARD-003]
# CARD-002 -> [CARD-004, CARD-005]
# CARD-003 -> [CARD-006]
# 关键路径: CARD-001 -> CARD-002 -> CARD-004 -> CARD-007

# 步骤 4: 验收矩阵（2 秒）
# | 交付物 | 验收项 | owner | evidence | gate |
# | Tenant 模型 | 迁移成功 | backend-architect | 迁移日志 | G1 |
# | RLS 策略 | 跨租户阻止 | security-quality-expert | 测试报告 | G2 |

# 步骤 5: 并发生成文件（5 秒）
Write(file_path="dispatches/trae-deepagent/run-20260302-143022-multi-tenant-saas-a7b3/02-solution-plan.md", content="...")
Write(file_path="dispatches/trae-deepagent/run-20260302-143022-multi-tenant-saas-a7b3/03-agent-task-cards.md", content="...")
Write(file_path="dispatches/trae-deepagent/run-20260302-143022-multi-tenant-saas-a7b3/04-dependencies-and-acceptance.md", content="...")
```

**Skill: requesting-code-review（5 秒）**

```python
Skill(name="requesting-code-review")
```

**总耗时**: 10 + 5 + 10 + 10 + 10 + 15 + 15 + 5 = **80 秒**

---

## Final Delivery Checklist

交付前逐项核对：
1. 目录是否为新 run 文件夹。
2. 是否先生成并补全 `01-orchestration-prompts.md`（Run Metadata / Master / Wave / Acceptance）。
3. 四个主文件是否完整存在。
4. 是否执行三波次并发与收敛。
5. 是否触发强制技能链路。
6. 每张任务卡是否含完整字段与证据。
7. 是否给出依赖图、关键路径、Gate 和验收矩阵。
8. 是否包含阻塞升级与回滚策略。
9. 文件编码是否为 UTF-8 且提示词可直接复制运行。
10. **是否最大化并发，避免串行等待。**
11. **总耗时是否 ≤ 90 秒。**

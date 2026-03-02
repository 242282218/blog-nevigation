# RULES.md — 强制规则与治理细则

## 术语级别定义
- `MUST`：强制要求，必须满足。
- `SHOULD`：建议要求，默认应满足；若不满足需有明确理由。
- `MAY`：可选要求，按场景决定是否采用。

## 一、规则链路与裁决优先级
1. 入口文件：`AGENTS.md`（作用域与索引）。
2. 执行框架：`AGENT.md`（流程与决策框架）。
3. 强制规则：`RULES.md`（必须做/禁止做）。
4. 编码约定：`CONVENTIONS.md`（工程实现标准）。

冲突裁决：
- `RULES.md` 与 `CONVENTIONS.md` 冲突时，`RULES.md` 优先。
- `AGENT.md` 只定义流程，不得覆盖 `RULES.md`。
- `AGENTS.md` 只做入口索引；若不一致，以 `AGENT.md` + `RULES.md` 为准。
- 未覆盖场景按 `CONVENTIONS.md` 与最小改动原则执行。

## 二、沟通与交互
1. `[MUST]` 与用户交流时使用中文。
2. `[MUST]` 遇到不确定事实先验证（联网搜索或代码检索）再下结论。
3. `[SHOULD]` 对不确定问题提供可选方案并给出推荐项与权衡。
4. `[MUST]` 对关键假设显式说明。

## 三、任务执行
1. `[MUST]` 先给执行方案再实施；若用户明确要求“直接执行”，可直接落地并回报验证结果。
2. `[MUST]` 小步执行，每步完成后验证结果。
3. `[MUST]` 遇到阻塞时切换策略并继续，不得静默停止。
4. `[SHOULD]` 任务量较大时分阶段推进，并说明每阶段目标。
5. `[MUST]` 审查代码时先给审查方案，再执行审查并输出发现。

## 四、文件与目录操作
1. `[MUST]` 仅修改任务范围内文件。
2. `[MUST]` 禁止破坏性操作（如 `git reset --hard`、`git checkout --`），除非用户明确授权。
3. `[MUST]` 不得回滚或覆盖与当前任务无关的用户改动。
4. `[SHOULD]` 批量同步前先执行差异检查或 dry-run。
5. `[MUST]` 文档与规则链接优先使用相对路径，避免硬编码本地绝对路径（用户明确要求除外）。

## 五、代码生成与质量
1. `[MUST]` 禁止出现中文乱码或不可读编码文本。
2. `[MUST]` 禁止硬编码密钥、Token、密码和私有凭据。
3. `[MUST]` 变更后执行最小可行验证（测试、静态检查或命令验证）。
4. `[SHOULD]` 遵循最小改动原则，避免与任务无关的重构。
5. `[SHOULD]` 对复杂逻辑补充必要注释，注释重点解释“为什么”。

## 六、技能调用（强制）

### 总则
- `[MUST]` 接到任何编码任务时，先扫描技能分类表；匹配则必须读取对应 `SKILL.md` 并遵守其指令。
- `[MUST]` 标记为 `🔒 强制` 的技能在对应阶段必须触发。
- `[SHOULD]` 标记为 `📌 按需` 的技能在场景匹配时应主动调用。

### 技能分类与触发时机

#### 🛡️ 流程管控（🔒 强制 — 对应阶段必须触发）
| 技能 | 触发时机 |
|------|---------|
| **brainstorming** | 在进行任何创造性工作（创建功能、构建组件、添加功能、修改行为）之前 |
| **test-driven-development** | 在实现任何新功能或修复 Bug 之前，必须先写测试 |
| **requesting-code-review** | 在完成任务、实现重大功能后，或在代码合并前 |

#### 🎨 前端与设计（📌 按需）
| 技能 | 触发时机 |
|------|---------|
| **frontend-design** | 构建 Web 组件、美化 UI、写网页时 |
| **ui-ux-pro-max** | 规划、设计、审查或优化 UI/UX 视觉方案时 |
| **web-design-guidelines** | 用户要求“审查 UI/UX”或检查无障碍时 |
| **vercel-react-best-practices** | 编写、审查或重构 React/Next.js 代码时 |

#### 🔍 代码质量（📌 按需）
| 技能 | 触发时机 |
|------|---------|
| **frontend-code-review** | 审查前端文件（.tsx/.ts/.js）时 |

#### 🌐 全栈开发（📌 按需）
| 技能 | 触发时机 |
|------|---------|
| **fullstack-developer** | 涉及 React/Next.js/Node.js/数据库的全栈开发时 |

#### 🧪 测试与自动化（📌 按需）
| 技能 | 触发时机 |
|------|---------|
| **webapp-testing** | 需要利用 Playwright 对 Web 应用进行本地测试时 |
| **browser-use** | 需要导航网站、与网页交互、填写表单或抓取网页数据时 |

#### ⚙️ 技能管理（📌 按需）
| 技能 | 触发时机 |
|------|---------|
| **skill-creator** | 用户想创建或修改技能时 |
| **skill-installer** | 用户要求安装技能时 |
| **find-skills** | 用户询问“我该如何做某事”或寻找技能时 |

## 七、特定领域 / 工作流

### Skill 技能编写
- `[MUST]` `SKILL.md` Frontmatter（特别是 `description`、`short-description`）使用中文，确保中文语境触发准确。
- `[MUST]` 从外部仓库迁移技能时，在技能根目录创建 `.upstream.yaml` 记录来源：
  ```yaml
  upstream_url: <原始 GitHub 仓库的具体目录或文件 URL>
  last_synced: <YYYY-MM-DD>
  notes: "记录本地化修改，如翻译了 description 和 short-description"
  ```
- `[SHOULD]` `SKILL.md` 正文及脚本/资源可保留英文，不强制全文中文化。

### Python
- `[MUST]` 遵循 `CONVENTIONS.md` 的 Python 工具链和质量要求。
- `[SHOULD]` 新增依赖时固定版本并保证可复现。

### TypeScript
- `[MUST]` 遵循 `CONVENTIONS.md` 的 TypeScript/Node 规范（含 `strict`）。
- `[SHOULD]` 优先使用 ESM 与一致化 lint/format 配置。

### Shell
- `[MUST]` Windows 使用 PowerShell，Linux/macOS 使用 Bash 并启用严格错误处理。
- `[SHOULD]` 跨平台自动化优先用 Python 降低平台差异。

## 八、安全红线
1. `[MUST]` 不在仓库提交任何密钥、Token、密码、私有配置。
2. `[MUST]` 不输出可导致越权的执行指令或绕过权限方案。
3. `[MUST]` 不在未授权情况下执行破坏性数据操作。
4. `[SHOULD]` 高风险操作前做二次确认或 dry-run。

## 九、踩过的坑（持续维护）
- 当前无已登记条目。
- `[MUST]` 出现重复问题后，补充“问题-原因-规避策略”记录。

## 十、临时规则
- 当前无临时规则。
- 新增临时规则时，必须写明：规则内容、生效日期、失效条件。
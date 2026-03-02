# CONVENTIONS.md — 编码约定

> 技术选型和编码规范：以前沿工具链为标准，安全优先，便于长期维护。
> 本文件定义"**选什么**"和"**怎么写**"，执行约束见 `RULES.md`。

---

## 1. 语言与运行时

### Python
- **版本**：3.12+（优先 3.13），类型提示全覆盖
- **包管理**：`uv`（取代 pip / poetry / venv，速度快 100x，支持 lockfile）
- **Lint & 格式化**：`ruff`（取代 flake8 + black + isort，单工具全搞定）
- **类型检查**：`pyright`（严格模式）或 `mypy`
- **运行时校验**：`pydantic` v2（数据边界验证）
- **测试**：`pytest` + `pytest-cov`
- **项目结构**：`src/` layout + `pyproject.toml` 作唯一配置入口

```
my-project/
├── src/
│   └── myapp/
├── tests/
├── pyproject.toml   ← 所有工具配置都在这里
└── uv.lock          ← 提交到 Git，保证可复现
```

### TypeScript / Node.js
- **版本**：Node.js 22 LTS+，TypeScript 5.x（开启 `strict: true`）
- **原生 TS**：Node.js 22+ 支持 type stripping，无需 `ts-node`
- **运行时**：优先 ESM（`"type": "module"`），用 `node:` 前缀调用内置模块
- **包管理**：`pnpm`（速度、磁盘占用优于 npm/yarn）
- **Lint & 格式化**：`ESLint` v9 (flat config) + `Prettier`
- **测试**：`Vitest`（比 Jest 快，原生 ESM/TS 支持）

### Shell / 脚本
- **Windows**：PowerShell 7+（跨平台，避免 cmd）
- **Linux/macOS**：Bash with `set -euo pipefail`
- **跨平台脚本**：优先考虑用 Python 替代 shell，避免平台差异

---

## 2. 架构模式

### 优先选型
| 场景 | 模式 | 理由 |
|------|------|------|
| 一般项目 | **模块化单体**（Modular Monolith） | 比微服务易维护，比大泥球好拆分 |
| API 服务 | **Clean Architecture** / 六边形架构 | 业务逻辑与框架解耦，便于测试 |
| 数据流 | **Stream / Pipeline** 模式 | 处理大文件/日志，节省内存 |
| AI 相关 | **Agent + Tool** 模式 | 单一职责，工具可测试可替换 |

### 设计原则（SOLID 精简版）
- **单一职责**：一个函数 / 类只做一件事
- **依赖注入**：依赖从外部传入，不在函数内部硬编码
- **接口优先**：先定义类型/接口，再写实现
- **纯函数优先**：无副作用，输入确定则输出确定，天然可测试

### 异步编程
- Python：全面使用 `async/await`，异步 IO 用 `asyncio`
- Node.js：`async/await` + 合理使用 `Promise.all()`，**绝不阻塞事件循环**
- CPU 密集型任务：Python 用 `ProcessPoolExecutor`，Node.js 用 `Worker Threads`

---

## 3. 安全规范（强制）

### 输入 / 输出
- **所有外部输入都是不可信的**：API 参数、文件内容、环境变量 — 全部验证
- 使用 allowlist 而非 denylist 进行输入验证
- 输出前进行编码（防 XSS、命令注入）
- 使用参数化查询（禁止字符串拼接 SQL）

### 密钥与配置
- **禁止硬编码**任何密钥、Token、密码、私有 URL 到代码或配置文件
- 使用环境变量 + `.env`（`.env` 必须加入 `.gitignore`）
- 生产环境使用专用 Secret Manager（如 Vault、云厂商的 KMS）
- 定期轮换密钥，日志中**脱敏**敏感字段

### 依赖安全（供应链）
- Python：`uv lock` 固定依赖版本，定期运行 `pip-audit`
- Node.js：`pnpm audit`，锁定 `package-lock.json` / `pnpm-lock.yaml`
- CI 中集成 **SCA（软件组成分析）** 扫描（如 Dependabot / Renovate）
- 不引入无人维护或下载量极低的依赖

### 认证 / 授权
- 密码存储：`bcrypt` 或 `argon2`，**禁止 MD5/SHA1**
- Token：JWT 使用 `RS256`（非对称），设置合理过期时间
- 遵循**最小权限原则**：API、数据库、CI Job 只给必要权限

### 错误处理
- 用户侧返回**通用错误信息**，详细信息写入内部日志
- 禁止在响应中暴露堆栈信息、数据库结构、文件路径
- 实现全局异常捕获，防止进程异常退出泄露上下文

### OWASP 参考
优先防御当前 OWASP Top 10（2025/2026 版本关注）：
- A01 Broken Access Control
- A03 Software Supply Chain Failures（新）
- A07 Injection
- A10 Mishandling of Exceptional Conditions（新）

---

## 4. 代码风格

### 通用原则
- 可读性 > 聪明程度 — 代码是写给人看的
- 函数长度：≤ 40 行（超出考虑拆分）
- 嵌套层数：≤ 3 层（用早返回 / Guard Clause 减少嵌套）
- 魔法数字：全部提取为具名常量

### 命名
| 类型 | Python | TypeScript |
|------|--------|-----------|
| 变量/函数 | `snake_case` | `camelCase` |
| 类 | `PascalCase` | `PascalCase` |
| 常量 | `UPPER_SNAKE` | `UPPER_SNAKE` |
| 文件 | `snake_case.py` | `kebab-case.ts` |

### 注释
- 注释解释"**为什么**"，不解释"做什么"（代码本身说做什么）
- 复杂算法 / 非直觉行为必须注释
- TODO 格式：`# TODO(作者): 描述 — 关联 issue`，不留无主 TODO

---

## 5. 测试规范

- **测试覆盖率目标**：核心业务逻辑 ≥ 80%
- **测试命名**：`test_<行为>_when_<条件>_then_<预期>`
- **测试分类**：
  - Unit：纯逻辑，毫秒级，无 IO
  - Integration：跨模块、含外部依赖（用 mock/stub）
  - E2E：只覆盖关键路径
- 禁止测试中使用 `time.sleep()`，用事件 / 条件等待替代

---

## 6. Git 规范

### Commit 消息（Conventional Commits）
```
<type>(<scope>): <描述>

类型：feat / fix / chore / docs / refactor / test / perf / ci
```

示例：
```
feat(auth): 添加 JWT 刷新 Token 机制
fix(api): 修复空指针导致的 500 错误
chore(deps): 升级 pydantic 到 v2.7
```

### 分支策略（个人项目简化版）
- `main`：稳定分支，只接受 PR / merge
- `feat/<功能名>`：功能开发
- `fix/<问题描述>`：bug 修复
- 完成后 squash merge，保持 main 历史干净

### 禁止提交
- `.env` / 任何含密钥的文件
- 构建产物（`dist/`、`__pycache__/`、`.pyc`）
- 个人 IDE 配置（`.idea/`、`.vscode/` 等，除非团队共享）

---

## 7. 工具链速查

| 用途 | Python | TypeScript |
|------|--------|-----------|
| 依赖管理 | `uv` | `pnpm` |
| Lint | `ruff` | `ESLint` v9 |
| 格式化 | `ruff format` | `Prettier` |
| 类型检查 | `pyright` | `tsc --noEmit` |
| 测试 | `pytest` | `Vitest` |
| 安全扫描 | `pip-audit` | `pnpm audit` |
| Pre-commit | `pre-commit` | `husky` + `lint-staged` |

---

> 最后更新：2026-02
> 下次复查建议：每 6 个月检查工具链版本是否需要更新

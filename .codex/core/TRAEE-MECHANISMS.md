# Trae 机制全景图

**版本**: 2026-02  
**适用**: Trae IDE 用户与开发者

> **权威源声明**: 本文档是完整机制的单一权威来源；`AGENT.md` 仅保留新手引导与摘要。若两者冲突，以本文档为准，并回写同步 `AGENT.md`。

---

## 📖 目录

1. [核心执行机制](#一核心执行机制)
2. [智能体调度机制 (Task)](#二智能体调度机制-task)
3. [技能机制 (Skill)](#三技能机制-skill)
4. [代码搜索机制](#四代码搜索机制)
5. [文件操作机制](#五文件操作机制)
6. [命令执行机制](#六命令执行机制)
7. [浏览器自动化机制 (Playwright)](#七浏览器自动化机制-playwright)
8. [上下文与记忆机制](#八上下文与记忆机制)
9. [外部工具机制](#九外部工具机制)
10. [用户交互机制](#十用户交互机制)
11. [诊断机制](#十一诊断机制)
12. [机制使用决策树](#十二机制使用决策树)

---

## 一、核心执行机制

### Agent Mode（智能体模式）

**定义**: Trae 的默认工作模式，AI 作为自主智能体执行任务

**特点**:
- ✅ **自主决策**: 独立分析任务、制定方案、执行验证
- ✅ **工具驱动**: 通过调用各种工具完成实际工作
- ✅ **持续迭代**: 遇到问题自动切换策略，不轻易中止
- ✅ **多步骤执行**: 可处理复杂的 multi-step 任务

**工作流程**:
```
用户提出需求
    ↓
Agent 理解分析
    ↓
制定方案 (可能调用 brainstorming)
    ↓
选择合适工具/智能体
    ↓
执行并验证
    ↓
交付结果
```

**适用场景**:
- 复杂编程任务
- 需要多步骤协作的工作
- 需要专业领域知识的任务

---

## 二、智能体调度机制 (Task)

### Task 工具 - 核心机制

**作用**: 启动专业子智能体处理特定领域任务

**调用格式**:
```python
Task(
  subagent_type="backend-architect",  # 选择专业智能体
  query="设计 REST API",               # 任务描述 (30 字以内)
  description="API 设计",              # 简短标签 (3-5 字)
  response_language="zh"              # 响应语言
)
```

### 可用智能体类型 (15 种)

#### 开发类
| 智能体 | 专长领域 | 典型场景 |
|--------|---------|---------|
| `frontend-architect` | 前端架构、React/Vue/Angular、状态管理、前端性能优化 | 构建 dashboard、优化 React 渲染 |
| `backend-architect` | API 设计、数据库、服务器端逻辑、后端架构、微服务 | REST API 设计、数据库优化 |
| `python-pro` | Python 高级特性、并发编程、性能优化、设计模式、类型提示 | Python 代码重构、性能分析 |

#### 测试与质量类
| 智能体 | 专长领域 | 典型场景 |
|--------|---------|---------|
| `api-test-pro` | API 测试、性能测试、负载测试、契约测试、压力测试 | 测试新 endpoint、压力测试 |
| `security-quality-expert` | 安全测试 (SAST/DAST)、代码质量、合规性 (OWASP/GDPR/HIPAA) | OWASP 检查、HIPAA 合规 |

#### 设计类
| 智能体 | 专长领域 | 典型场景 |
|--------|---------|---------|
| `ui-designer` | UI 设计、组件设计、设计系统、视觉美学、无障碍设计 | 设计按钮组件、改进视觉层次 |

#### 运维与云类
| 智能体 | 专长领域 | 典型场景 |
|--------|---------|---------|
| `cloud-devops-expert` | 云架构、DevOps、IaC、CI/CD、成本优化、Kubernetes | AWS 迁移、K8s 优化 |
| `devops-architect` | CI/CD 流水线、监控、部署自动化、基础设施管理 | 设置 GitHub Actions、监控配置 |

#### 数据与 AI 类
| 智能体 | 专长领域 | 典型场景 |
|--------|---------|---------|
| `data-ai-expert` | 数据分析、机器学习、深度学习、NLP、计算机视觉、MLOps | 构建预测模型、推荐系统 |
| `ai-integration-engineer` | AI/ML 功能集成、LLM 接入、推荐系统、智能自动化 | 集成 GPT-4、动态定价 |

#### 分析类
| 智能体 | 专长领域 | 典型场景 |
|--------|---------|---------|
| `error-detective` | 生产错误分析、日志分析、错误模式识别、分布式系统错误关联 | 分析 500 错误、日志模式 |
| `performance-expert` | 性能测试、性能分析、瓶颈识别、数据库优化、代码优化 | 应用性能分析、数据库优化 |
| `search` | 代码库探索、概念搜索、跨文件查找 | 查找认证逻辑、错误处理 |

#### 业务与合规类
| 智能体 | 专长领域 | 典型场景 |
|--------|---------|---------|
| `product-business-expert` | 产品规划、市场分析、技术文档、产品生命周期、UX 设计 | SaaS 产品设计、API 文档 |
| `compliance-checker` | 法律合规、隐私政策、服务条款审查、监管要求 | GDPR 合规检查 |

### 多智能体协作示例

**示例 1: 全栈代码审查**
```
步骤 1: frontend-architect → 审查前端代码
步骤 2: backend-architect  → 审查后端代码
步骤 3: api-test-pro       → 测试 API 接口
步骤 4: security-quality-expert → 安全检查
```

**示例 2: 生产错误排查**
```
步骤 1: error-detective    → 分析日志、识别模式
步骤 2: backend-architect  → 修复后端问题
步骤 3: api-test-pro       → 验证 API 稳定性
```

**示例 3: 新产品开发**
```
步骤 1: product-business-expert → 产品规划
步骤 2: ui-designer             → UI/UX 设计
步骤 3: frontend-architect + backend-architect → 全栈开发
步骤 4: api-test-pro + security-quality-expert → 测试与安全检查
```

---

## 三、技能机制 (Skill)

### Skill 工具 - 标准化工作流

**作用**: 执行预定义的标准化工作流程

**调用格式**:
```python
Skill(name="test-driven-development")
# 触发后，Agent 会读取对应 SKILL.md 并按指令执行
```

### Task vs Skill 对比

| 特性 | Task (智能体) | Skill (技能) |
|------|--------------|-------------|
| **本质** | 独立的 AI 子代理 | 预定义的指令集 |
| **能力** | 自主决策、调用工具 | 遵循固定流程 |
| **适用** | 复杂专业任务 | 标准化流程 |
| **示例** | "分析这个错误" | "先写测试再实现功能" |

### 技能分类

#### 🔒 强制技能 (流程管控)
| 技能 | 触发时机 |
|------|---------|
| **brainstorming** | 创造性工作前，梳理需求和设计方案 |
| **test-driven-development** | 实现功能或修复 Bug 前，先写测试 |
| **requesting-code-review** | 完成任务或重大功能后，代码审查 |

#### 📌 按需技能

**前端与设计**:
- `frontend-design` - 构建 Web 组件、美化 UI
- `ui-ux-pro-max` - UI/UX 视觉方案设计
- `web-design-guidelines` - UI 规范性审查、无障碍检查
- `vercel-react-best-practices` - React/Next.js 性能优化

**代码质量**:
- `frontend-code-review` - 前端代码审查 (.tsx/.ts/.js)

**全栈开发**:
- `fullstack-developer` - React/Next.js/Node.js/数据库全栈开发

**测试与自动化**:
- `webapp-testing` - Playwright Web 应用测试
- `browser-use` - 浏览器自动化交互

**技能管理**:
- `skill-creator` - 创建或修改技能
- `skill-installer` - 安装技能
- `find-skills` - 发现和搜索技能

### 智能体与技能配合

| 智能体 | 配合 Skill | 场景 |
|-------|-----------|------|
| `frontend-architect` | `frontend-code-review` | 前端代码审查 |
| `frontend-architect` | `vercel-react-best-practices` | React 性能优化 |
| `backend-architect` | `test-driven-development` | 后端 TDD |
| `api-test-pro` | `webapp-testing` | API 测试 |
| `ui-designer` | `ui-ux-pro-max` | UI 设计 |
| `ui-designer` | `web-design-guidelines` | UI 规范性审查 |
| `security-quality-expert` | `requesting-code-review` | 安全审查 |
| `product-business-expert` | `brainstorming` | 产品规划 |

---

## 四、代码搜索机制

### 4.1 SearchCodebase - 语义搜索

**特点**: 基于嵌入向量的语义搜索，理解概念而非仅关键词

**调用示例**:
```python
SearchCodebase(
  information_request="如何检查用户认证",
  target_directories=["/src/auth"]
)
```

**适用场景**:
- 查找代码概念、模式
- 跨文件搜索逻辑
- 理解代码库架构

### 4.2 Glob - 文件名匹配

**特点**: 类似 `find` 命令，快速定位文件

**调用示例**:
```python
Glob(pattern="**/*.py", path="/src")
Glob(pattern="*.tsx", path="/frontend/src/components")
```

**适用场景**:
- 按文件名查找
- 批量查找特定类型文件

### 4.3 Grep - 内容搜索

**特点**: 正则表达式匹配，精确搜索内容

**调用示例**:
```python
Grep(
  pattern="def authenticate",
  type="py",
  output_mode="content",
  -n=True
)
```

**参数说明**:
- `pattern`: 正则表达式
- `type`: 文件类型 (py, ts, js 等)
- `output_mode`: "content" | "files_with_matches" | "count"
- `-n`: 显示行号

**适用场景**:
- 精确查找代码内容
- 正则匹配模式

### 4.4 LS - 目录列表

**调用示例**:
```python
LS(path="/src", ignore=["__pycache__", "*.pyc"])
```

---

## 五、文件操作机制

### 5.1 Read - 读取文件

**调用示例**:
```python
Read(
  file_path="/src/app.py",
  limit=200,    # 最多读取行数
  offset=0      # 起始行号
)
```

**特点**:
- 支持大文件分块读取
- 带行号显示
- 最多读取 2000 行/次

### 5.2 Write - 写入文件

**调用示例**:
```python
Write(
  file_path="/src/new.py",
  content="def hello():\n    return 'world'"
)
```

**注意**: 会覆盖现有文件，需谨慎使用

### 5.3 SearchReplace - 精准替换

**调用示例**:
```python
SearchReplace(
  file_path="/src/app.py",
  old_str="def old():\n    pass",
  new_str="def new():\n    return True"
)
```

**特点**:
- 安全编辑，只修改目标代码
- 保持其他内容不变
- 支持多行替换

**规则**:
- `old_str` 必须唯一匹配
- `new_str` 必须与 `old_str` 不同

### 5.4 DeleteFile - 删除文件

**调用示例**:
```python
DeleteFile(file_paths=["/tmp/old.py", "/tmp/test.txt"])
```

---

## 六、命令执行机制

### 6.1 RunCommand - 执行命令

**调用示例**:
```python
RunCommand(
  command="pnpm test",
  blocking=True,           # 是否阻塞等待完成
  requires_approval=False, # 是否需要用户确认
  cwd="/project",          # 工作目录
  target_terminal="new"    # 目标终端
)
```

**blocking 参数**:
- `True`: 等待命令完成 (适合短命令)
- `False`: 后台运行 (适合服务器、监控进程)

**command_type 分类**:
- `web_server`: Web 服务器
- `long_running_process`: 长运行进程
- `short_running_process`: 短运行进程
- `other`: 其他

### 6.2 CheckCommandStatus - 检查状态

**调用示例**:
```python
CheckCommandStatus(
  command_id="xxx",
  output_priority="bottom",  # "top" | "bottom" | "split"
  output_character_count=2000,
  skip_character_count=0
)
```

### 6.3 StopCommand - 停止命令

**调用示例**:
```python
StopCommand(command_id="xxx")
```

---

## 七、浏览器自动化机制 (Playwright)

完整的浏览器自动化工具集，支持 Chromium、Firefox、WebKit

### 7.1 导航与截图

```python
# 导航到 URL
mcp_Playwright_playwright_navigate(
  url="https://example.com",
  browserType="chromium",
  headless=False,
  width=1280,
  height=720
)

# 截图
mcp_Playwright_playwright_screenshot(
  name="page_screenshot",
  fullPage=True,
  savePng=True,
  storeBase64=True
)
```

### 7.2 页面交互

```python
# 点击元素
mcp_Playwright_playwright_click(selector="#btn")

# 填充表单
mcp_Playwright_playwright_fill(selector="#input", value="text")

# 选择下拉框
mcp_Playwright_playwright_select(selector="#select", value="option1")

# 悬停
mcp_Playwright_playwright_hover(selector="#menu")

# 上传文件
mcp_Playwright_playwright_upload_file(
  selector="#upload",
  filePath="/path/to/file"
)

# iframe 内操作
mcp_Playwright_playwright_iframe_click(
  iframeSelector="#iframe",
  selector="#btn"
)
```

### 7.3 API 测试

```python
# HTTP GET
mcp_Playwright_playwright_get(
  url="/api/users",
  headers={"Authorization": "Bearer token"},
  token="xxx"
)

# HTTP POST
mcp_Playwright_playwright_post(
  url="/api/users",
  value='{"name":"test"}',
  headers={"Content-Type": "application/json"}
)

# 等待并验证响应
mcp_Playwright_playwright_expect_response(
  id="1",
  url="/api/users"
)
mcp_Playwright_playwright_assert_response(
  id="1",
  value="success"
)
```

### 7.4 调试工具

```python
# 执行 JavaScript
mcp_Playwright_playwright_evaluate(
  script="return document.title"
)

# 获取控制台日志
mcp_Playwright_playwright_console_logs(
  type="error",  # "all" | "error" | "warning" | "log" | "info" | "debug"
  limit=10,
  search="keyword",
  clear=False
)

# 获取页面内容
mcp_Playwright_playwright_get_visible_text()
mcp_Playwright_playwright_get_visible_html(
  cleanHtml=True,
  removeScripts=True,
  maxLength=20000
)
```

### 7.5 浏览器控制

```python
# 调整视口
mcp_Playwright_playwright_resize(
  width=1920,
  height=1080
)
# 或使用设备预设
mcp_Playwright_playwright_resize(device="iPhone 13")

# 自定义 User Agent
mcp_Playwright_playwright_custom_user_agent(
  userAgent="Mozilla/5.0 ..."
)

# 关闭浏览器
mcp_Playwright_playwright_close()
```

---

## 八、上下文与记忆机制

### 8.1 Memory - 知识图谱

**作用**: 存储和检索长期记忆，构建知识关联

```python
# 创建实体
mcp_Memory_create_entities(
  entities=[
    {
      "name": "用户认证系统",
      "entityType": "模块",
      "observations": ["使用 JWT", "支持刷新 Token"]
    }
  ]
)

# 添加观察
mcp_Memory_add_observations(
  observations=[
    {
      "entityName": "用户认证系统",
      "contents": ["Token 过期时间 30 分钟"]
    }
  ]
)

# 创建关系
mcp_Memory_create_relations(
  relations=[
    {
      "from": "用户认证系统",
      "to": "数据库",
      "relationType": "存储于"
    }
  ]
)

# 搜索节点
mcp_Memory_search_nodes(query="认证")

# 读取图谱
mcp_Memory_read_graph()
```

### 8.2 Context7 - 文档查询

**作用**: 查询最新库文档，获取代码示例

```python
# 解析库 ID
mcp_context7_resolve-library-id(
  libraryName="react",
  query="hooks useEffect"
)

# 查询文档
mcp_context7_query-docs(
  libraryId="/vercel/next.js",
  query="SSR 配置"
)
```

### 8.3 Figma AI Bridge - 设计导入

```python
# 获取 Figma 数据
mcp_Figma_AI_Bridge_get_figma_data(
  fileKey="abc123",
  nodeId="1234:5678",
  depth=2
)

# 下载图片资源
mcp_Figma_AI_Bridge_download_figma_images(
  fileKey="abc123",
  nodes=[
    {
      "nodeId": "1234:5678",
      "fileName": "logo.svg",
      "imageRef": "xxx"
    }
  ],
  localPath="/src/assets"
)
```

---

## 九、外部工具机制

### 9.1 WebSearch - 互联网搜索

```python
WebSearch(
  query="React 19 新特性 2025",
  num=5,          # 结果数量
  lr="lang_zh"    # 语言限制
)
```

### 9.2 WebFetch - 网页抓取

```python
WebFetch(url="https://example.com/docs")
```

**特点**:
- 自动转换 HTML 为 Markdown
- 支持 HTTPS
- 内容可能被截断

---

## 十、用户交互机制

### 10.1 AskUserQuestion - 向用户提问

**调用示例**:
```python
AskUserQuestion(questions=[
  {
    "question": "使用哪个认证方案？",
    "header": "认证方式",
    "options": [
      {
        "label": "JWT",
        "description": "无状态，适合 API"
      },
      {
        "label": "Session",
        "description": "有状态，适合传统 Web"
      }
    ],
    "multiSelect": False
  }
])
```

**参数说明**:
- `question`: 完整问题
- `header`: 简短标签 (最多 12 字符)
- `options`: 选项列表 (2-4 个)
- `multiSelect`: 是否多选

### 10.2 TodoWrite - 任务管理

**调用示例**:
```python
TodoWrite(todos=[
  {
    "id": "1",
    "content": "设计数据库 schema",
    "status": "pending",
    "priority": "high"
  },
  {
    "id": "2",
    "content": "实现用户 API",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "id": "3",
    "content": "编写单元测试",
    "status": "completed",
    "priority": "medium"
  }
], summary="完成数据库设计和 API 实现")
```

**状态**:
- `pending`: 未开始
- `in_progress`: 进行中
- `completed`: 已完成

### 10.3 OpenPreview - 打开预览

```python
OpenPreview(
  command_id="xxx",
  preview_url="http://localhost:3000"
)
```

---

## 十一、诊断机制

### GetDiagnostics - 代码检查

```python
GetDiagnostics(uri="file:///src/app.py")
```

**作用**: 获取 VS Code 语言服务器诊断信息

**返回**:
- 类型错误
- 语法错误
- 警告信息

---

## 十二、机制使用决策树

```
接到任务后的决策流程:

1. 需要专业领域知识？
   ├─ 是 → Task(调用对应智能体)
   └─ 否 → 继续

2. 需要执行标准流程？
   ├─ 是 → Skill(触发对应技能)
   └─ 否 → 继续

3. 需要查找代码？
   ├─ 语义搜索 → SearchCodebase
   ├─ 按文件名 → Glob
   ├─ 按内容 → Grep
   └─ 看目录 → LS

4. 需要修改文件？
   ├─ 读取 → Read
   ├─ 编辑 → SearchReplace
   ├─ 创建 → Write
   └─ 删除 → DeleteFile

5. 需要运行命令？
   └─ RunCommand → CheckCommandStatus → StopCommand

6. 需要测试网页/API？
   └─ Playwright 工具集

7. 需要用户确认？
   └─ AskUserQuestion

8. 需要跟踪进度？
   └─ TodoWrite

9. 需要查询文档？
   └─ mcp_context7_query-docs

10. 需要外部信息？
    ├─ 搜索 → WebSearch
    └─ 抓取 → WebFetch
```

---

## 附录 A: 工具全景图

```
┌─────────────────────────────────────────────────┐
│              用户交互层                          │
│  AskUserQuestion | TodoWrite | OpenPreview     │
├─────────────────────────────────────────────────┤
│              智能调度层                          │
│  Task (智能体) | Skill (技能)                   │
├─────────────────────────────────────────────────┤
│              核心操作层                          │
│  搜索 | 文件 | 命令 | 诊断                       │
├─────────────────────────────────────────────────┤
│              外部集成层                          │
│  Playwright | Web | Memory | Context7 | Figma  │
└─────────────────────────────────────────────────┘
```

---

## 附录 B: 快速参考表

### 智能体速查
| 场景 | 智能体 |
|------|--------|
| 前端开发 | `frontend-architect` |
| 后端开发 | `backend-architect` |
| API 测试 | `api-test-pro` |
| 错误分析 | `error-detective` |
| 性能优化 | `performance-expert` |
| 安全审查 | `security-quality-expert` |
| UI 设计 | `ui-designer` |
| DevOps | `devops-architect` |

### 技能速查
| 场景 | 技能 |
|------|------|
| 需求梳理 | `brainstorming` |
| 先写测试 | `test-driven-development` |
| 代码审查 | `requesting-code-review` |
| UI 设计 | `ui-ux-pro-max` |
| Web 测试 | `webapp-testing` |

### 工具速查
| 需求 | 工具 |
|------|------|
| 找代码 | `SearchCodebase` / `Grep` |
| 读文件 | `Read` |
| 改文件 | `SearchReplace` |
| 运行命令 | `RunCommand` |
| 测试 API | `Playwright` |
| 问用户 | `AskUserQuestion` |

---

**文档维护**: 最后更新 2026-02  
**反馈建议**: 提交至项目 issue

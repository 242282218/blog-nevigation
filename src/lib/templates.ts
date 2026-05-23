import { ArticleTemplate } from '@/app/types/article';

export const articleTemplates: ArticleTemplate[] = [
  {
    id: 'tutorial',
    name: '技术教程',
    category: 'Guide',
    description: '从问题、环境、步骤到验证，适合写可复现的实践文章。',
    icon: 'BookOpen',
    estimatedMinutes: 25,
    highlights: ['环境准备', '步骤拆解', '结果验证'],
    frontmatter: {
      title: '从零实现一个功能',
      description: '记录一个功能从背景、方案到落地验证的完整过程。',
      tags: ['技术', '教程'],
    },
    content: `# 从零实现一个功能

## 背景

说明要解决的具体问题、影响范围，以及为什么现在要处理它。

## 目标

- 目标 1：
- 目标 2：
- 非目标：

## 环境准备

| 项目 | 版本 | 说明 |
| --- | --- | --- |
| Node.js | 20.x | 本地运行环境 |
| pnpm | 9.x | 包管理器 |

## 实现步骤

### 步骤 1：建立最小闭环

先完成可以运行、可以验证的最小实现。

\`\`\`typescript
type Result<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export function normalizeTitle(title: string): Result<string> {
  const trimmed = title.trim();

  if (!trimmed) {
    return { ok: false, error: 'title_required' };
  }

  return { ok: true, data: trimmed };
}
\`\`\`

### 步骤 2：补齐边界

说明错误路径、空状态、权限或数据迁移等边界。

## 验证

- [ ] 单元测试通过
- [ ] 构建通过
- [ ] 主路径手动验证

## 总结

收束关键经验，以及下次可以复用的判断。
`,
  },
  {
    id: 'deep-dive',
    name: '源码解析',
    category: 'Deep Dive',
    description: '适合拆解框架、库或项目内部机制，保留清晰调用链。',
    icon: 'Brain',
    estimatedMinutes: 35,
    highlights: ['调用链', '关键源码', '设计取舍'],
    frontmatter: {
      title: '一次源码阅读记录',
      description: '从入口、核心流程和边界条件拆解一段源码。',
      tags: ['源码', '架构'],
    },
    content: `# 一次源码阅读记录

## 阅读目的

这次阅读要回答的问题：

- 问题 1：
- 问题 2：

## 入口定位

从调用方开始，记录第一个稳定入口。

\`\`\`text
user action
  -> public API
  -> coordinator
  -> storage boundary
\`\`\`

## 核心流程

### 1. 输入规范化

说明输入如何被收敛成内部模型。

### 2. 状态变更

说明状态在哪里变化、谁负责提交副作用。

### 3. 输出生成

说明输出如何回到调用方。

## 关键代码

\`\`\`typescript
export function selectVisibleItems(items: Item[], keyword: string): Item[] {
  const query = keyword.trim().toLowerCase();

  if (!query) {
    return items;
  }

  return items.filter((item) => item.title.toLowerCase().includes(query));
}
\`\`\`

## 设计取舍

| 方案 | 收益 | 成本 |
| --- | --- | --- |
| 当前实现 |  |  |
| 替代方案 |  |  |

## 结论

用 3-5 句话沉淀这段源码真正值得带走的部分。
`,
  },
  {
    id: 'debugging',
    name: '排障复盘',
    category: 'Debug',
    description: '记录现象、假设、验证和根因，适合沉淀问题处理过程。',
    icon: 'Bug',
    estimatedMinutes: 20,
    highlights: ['时间线', '根因', '预防措施'],
    frontmatter: {
      title: '一次问题排查复盘',
      description: '记录问题现象、定位过程、根因和后续防护。',
      tags: ['排障', '复盘'],
    },
    content: `# 一次问题排查复盘

## 现象

描述用户看到的异常、影响范围和首次发现时间。

## 时间线

| 时间 | 动作 | 结论 |
| --- | --- | --- |
| 10:00 | 收到反馈 |  |
| 10:15 | 检查日志 |  |
| 10:40 | 验证修复 |  |

## 假设

- 假设 1：
- 假设 2：
- 假设 3：

## 验证过程

\`\`\`bash
pnpm test -- --runInBand
pnpm run lint
pnpm run build
\`\`\`

## 根因

把根因写成可以被验证的一句话。

## 修复

说明最终改动，以及为什么它解决的是根因。

## 预防

- [ ] 增加回归测试
- [ ] 增加日志或监控
- [ ] 更新运行手册
`,
  },
  {
    id: 'project',
    name: '项目总结',
    category: 'Review',
    description: '适合项目阶段性总结，覆盖目标、产出、风险和经验。',
    icon: 'FolderGit2',
    estimatedMinutes: 30,
    highlights: ['目标回顾', '成果指标', '经验沉淀'],
    frontmatter: {
      title: '项目阶段总结',
      description: '回顾项目目标、关键产出、问题和下一步计划。',
      tags: ['项目', '总结'],
    },
    content: `# 项目阶段总结

## 项目背景

写清楚项目为什么存在，以及它服务谁。

## 目标与结果

| 目标 | 结果 | 备注 |
| --- | --- | --- |
| 目标 1 |  |  |
| 目标 2 |  |  |

## 技术方案

说明架构边界、关键依赖和主要数据流。

\`\`\`mermaid
flowchart LR
  Client --> API
  API --> Storage
  API --> Backup
\`\`\`

## 关键决策

### 决策 1

为什么选它，放弃了什么。

## 风险与遗留

- 风险 1：
- 遗留 1：

## 下一步

- [ ] 计划 1
- [ ] 计划 2
`,
  },
  {
    id: 'notes',
    name: '学习笔记',
    category: 'Notes',
    description: '适合整理概念、例子和待深入问题，轻量但结构完整。',
    icon: 'NotebookPen',
    estimatedMinutes: 15,
    highlights: ['概念卡片', '例子', '待深入'],
    frontmatter: {
      title: '学习笔记',
      description: '记录一个主题的核心概念、示例和延伸问题。',
      tags: ['学习', '笔记'],
    },
    content: `# 学习笔记

## 今天要掌握

- 概念 1：
- 概念 2：
- 概念 3：

## 核心概念

### 概念 1

用自己的话解释。

### 概念 2

补一个最小例子。

\`\`\`typescript
interface Note {
  title: string;
  tags: string[];
  updatedAt: number;
}

const note: Note = {
  title: 'Composition API',
  tags: ['vue', 'notes'],
  updatedAt: Date.now(),
};
\`\`\`

## 易错点

- 易错点 1：
- 易错点 2：

## 待深入

- [ ] 问题 1
- [ ] 问题 2
`,
  },
  {
    id: 'release',
    name: '版本记录',
    category: 'Release',
    description: '适合记录一次发布，保留用户影响、改动和验证结果。',
    icon: 'Rocket',
    estimatedMinutes: 15,
    highlights: ['变更摘要', '影响范围', '验证清单'],
    frontmatter: {
      title: '版本发布记录',
      description: '记录一次版本发布的主要改动、风险和验证结论。',
      tags: ['发布', '记录'],
    },
    content: `# 版本发布记录

## 摘要

一句话说明这次发布给用户带来的变化。

## 主要改动

- 改动 1：
- 改动 2：
- 改动 3：

## 用户影响

| 范围 | 影响 | 处理 |
| --- | --- | --- |
| 页面/API |  |  |

## 验证记录

\`\`\`bash
pnpm run lint
pnpm test
pnpm run build
\`\`\`

## 回滚方案

说明最小回滚路径和需要保留的数据。

## 后续观察

- [ ] 指标 1
- [ ] 日志 1
`,
  },
  {
    id: 'blank',
    name: '空白文章',
    category: 'Blank',
    description: '只有标题和一个起笔位置，适合快速记录灵感。',
    icon: 'FileText',
    estimatedMinutes: 5,
    highlights: ['自由写作', '最少结构', '快速开始'],
    frontmatter: {
      title: '',
      description: '',
      tags: [],
    },
    content: `# 标题

写下第一段。
`,
  },
];

export function getTemplateById(id: string): ArticleTemplate | undefined {
  return articleTemplates.find((template) => template.id === id);
}

export function getDefaultTemplate(): ArticleTemplate {
  return articleTemplates.find((template) => template.id === 'blank') || articleTemplates[0];
}

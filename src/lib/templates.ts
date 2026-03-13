import { ArticleTemplate } from '@/app/types/article';

export const articleTemplates: ArticleTemplate[] = [
  {
    id: 'tutorial',
    name: '技术教程',
    description: '适合编写技术教程、使用指南类文章',
    icon: 'BookOpen',
    frontmatter: {
      title: '文章标题',
      description: '文章描述',
      tags: ['技术', '教程'],
    },
    content: `# 文章标题

## 前言

简要介绍本文的背景和目的。

## 环境准备

列出所需的工具和环境。

## 核心内容

### 步骤 1：xxx

详细说明...

\`\`\`javascript
// 代码示例 - 粘贴时会显示浅色背景
const example = "Hello World";
console.log(example);
\`\`\`

### 步骤 2：xxx

详细说明...

## 常见问题

### Q1: xxx
A: xxx

## 总结

总结本文的要点。

## 参考链接

- [链接 1](url)
- [链接 2](url)
`,
  },
  {
    id: 'notes',
    name: '学习笔记',
    description: '适合记录学习过程、知识点整理',
    icon: 'NotebookPen',
    frontmatter: {
      title: '学习笔记标题',
      description: '学习笔记描述',
      tags: ['学习', '笔记'],
    },
    content: `# 学习笔记标题

## 学习目标

- 目标 1
- 目标 2

## 核心概念

### 概念 1

解释说明...

### 概念 2

解释说明...

## 代码示例

\`\`\`typescript
// TypeScript 示例
interface User {
  name: string;
  age: number;
}

const user: User = {
  name: "张三",
  age: 25
};
\`\`\`

## 心得体会

记录学习过程中的感悟。

## 待深入

- [ ] 待研究的问题 1
- [ ] 待研究的问题 2
`,
  },
  {
    id: 'project',
    name: '项目总结',
    description: '适合项目复盘、技术总结类文章',
    icon: 'FolderGit2',
    frontmatter: {
      title: '项目总结',
      description: '项目复盘与总结',
      tags: ['项目', '总结'],
    },
    content: `# 项目名称

## 项目背景

介绍项目的背景和目标。

## 技术栈

- 前端：xxx
- 后端：xxx
- 数据库：xxx

## 核心功能

### 功能 1

描述和实现思路...

\`\`\`jsx
// React 组件示例
function Component() {
  return <div>Hello World</div>;
}
\`\`\`

### 功能 2

描述和实现思路...

## 遇到的问题

### 问题 1
**现象**：xxx
**解决**：xxx

## 项目成果

- 成果 1
- 成果 2

## 反思与改进

- 做得好的地方
- 可以改进的地方
`,
  },
  {
    id: 'blank',
    name: '空白模板',
    description: '从零开始，自由创作',
    icon: 'FileText',
    frontmatter: {
      title: '',
      description: '',
      tags: [],
    },
    content: `# 标题

开始写作...
`,
  },
];

export function getTemplateById(id: string): ArticleTemplate | undefined {
  return articleTemplates.find((t) => t.id === id);
}

export function getDefaultTemplate(): ArticleTemplate {
  return articleTemplates[0];
}

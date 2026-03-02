# 博客书写与导航标签编辑器 - 完整设计方案

## 需求理解
用户希望：
1. **在前端直接写博客** - 提供博客编辑器，支持 Markdown 书写
2. **修改导航标签** - 管理导航分类和工具链接
3. **有模板可以参考** - 提供博客模板，方便快速开始写作
4. **代码块粘贴优化** - 代码块不要显示为黑色背景，使用浅色主题

## 现状分析
- 博客数据：Markdown 文件存储在 `content/posts/`
- 导航数据：JSON 文件存储在 `content/posts/navigation/data/tools.json`
- 技术栈：Next.js 14 + TypeScript + Tailwind CSS + Framer Motion
- 当前：纯静态读取，无编辑功能

---

## 设计方案

### 核心方案：LocalStorage + 客户端编辑器

**博客书写**：创建所见即所得的 Markdown 编辑器，数据保存在 LocalStorage，支持导出为 Markdown 文件
**导航编辑**：在前端直接增删改导航分类和工具链接
**模板系统**：提供多种博客模板供参考和使用
**代码块样式**：使用浅色主题代码块，与整体设计风格一致

---

## 功能模块

### 模块一：博客编辑器（Blog Editor）

#### 功能清单
- [ ] **Markdown 编辑器**
  - 左侧编辑区 + 右侧实时预览
  - 支持语法高亮
  - 支持 Frontmatter 编辑（标题、日期、描述、标签）
  
- [ ] **工具栏**
  - 快速插入 Markdown 语法（标题、列表、代码块、链接、图片等）
  - 撤销/重做
  - 导入/导出 Markdown 文件
  
- [ ] **模板选择器**
  - 技术教程模板
  - 学习笔记模板
  - 项目总结模板
  - 空白模板
  
- [ ] **文章管理**
  - 本地文章列表（LocalStorage）
  - 新建/编辑/删除文章
  - 导出为 .md 文件

#### 代码块样式设计（浅色主题）

```css
/* 代码块样式 - 浅色主题，与整体设计一致 */
.markdown-preview pre {
  background: #f8f9fa;                    /* 浅灰背景，不是黑色 */
  border: 1px solid #e9ecef;              /* 细边框 */
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
}

.markdown-preview code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

/* 行内代码 */
.markdown-preview p code,
.markdown-preview li code {
  background: #f1f3f5;                    /* 浅灰背景 */
  color: #e64980;                         /* 柔和的红色 */
  padding: 0.2em 0.4em;
  border-radius: 4px;
  font-size: 0.875em;
}

/* 代码高亮 - 使用 GitHub 风格的浅色主题 */
.hljs-keyword { color: #d73a49; }         /* 关键字 - 柔和红 */
.hljs-string { color: #032f62; }          /* 字符串 - 深蓝 */
.hljs-number { color: #005cc5; }          /* 数字 - 蓝色 */
.hljs-function { color: #6f42c1; }        /* 函数 - 紫色 */
.hljs-comment { color: #6a737d; }         /* 注释 - 灰色 */
.hljs-operator { color: #d73a49; }        /* 运算符 */
.hljs-punctuation { color: #24292e; }     /* 标点 */
```

#### 博客模板设计

**模板 1：技术教程模板**
```markdown
---
title: 文章标题
date: 2025-03-02
description: 文章描述
tags: [技术, 教程]
---

# 文章标题

## 前言

简要介绍本文的背景和目的。

## 环境准备

列出所需的工具和环境。

## 核心内容

### 步骤 1：xxx

详细说明...

```javascript
// 代码示例 - 粘贴时会显示浅色背景
const example = "Hello World";
console.log(example);
```

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
```

**模板 2：学习笔记模板**
```markdown
---
title: 学习笔记标题
date: 2025-03-02
description: 学习笔记描述
tags: [学习, 笔记]
---

# 学习笔记标题

## 学习目标

- 目标 1
- 目标 2

## 核心概念

### 概念 1

解释说明...

### 概念 2

解释说明...

## 代码示例

```typescript
// TypeScript 示例
interface User {
  name: string;
  age: number;
}

const user: User = {
  name: "张三",
  age: 25
};
```

## 心得体会

记录学习过程中的感悟。

## 待深入

- [ ] 待研究的问题 1
- [ ] 待研究的问题 2
```

**模板 3：项目总结模板**
```markdown
---
title: 项目总结
date: 2025-03-02
description: 项目复盘与总结
tags: [项目, 总结]
---

# 项目名称

## 项目背景

介绍项目的背景和目标。

## 技术栈

- 前端：xxx
- 后端：xxx
- 数据库：xxx

## 核心功能

### 功能 1

描述和实现思路...

```jsx
// React 组件示例
function Component() {
  return <div>Hello World</div>;
}
```

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
```

---

### 模块二：导航标签编辑器（Navigation Editor）

#### 功能清单
- [ ] **分类管理**
  - 添加新分类
  - 编辑分类名称/图标
  - 删除分类
  - 拖拽排序
  
- [ ] **工具管理**
  - 添加新工具到分类
  - 编辑工具信息（标题、描述、URL、标签）
  - 删除工具
  - 拖拽排序
  
- [ ] **数据操作**
  - 自动保存到 LocalStorage
  - 导入/导出 JSON
  - 重置为默认数据

---

## 页面结构

### 新增页面：/editor（写作中心）

```
/editor                    # 写作中心首页
├── /editor/blog          # 博客编辑器
│   ├── 模板选择区
│   ├── 文章列表
│   └── 新建文章按钮
├── /editor/blog/new      # 新建/编辑文章页面
│   ├── 工具栏
│   ├── Markdown 编辑器
│   ├── 实时预览（代码块浅色主题）
│   └── 文章设置（Frontmatter）
└── /editor/navigation    # 导航编辑器
    ├── 编辑工具栏
    ├── 分类列表（可编辑）
    └── 工具卡片（可编辑）
```

### 集成到现有导航页

在 `/navigation` 页面添加：
- "编辑导航" 按钮 → 跳转到 `/editor/navigation`
- "写文章" 按钮 → 跳转到 `/editor/blog`

---

## 组件设计

### 博客编辑器组件

```
app/
├── editor/
│   ├── page.tsx                    # 写作中心首页
│   ├── layout.tsx                  # 编辑器布局
│   ├── blog/
│   │   ├── page.tsx                # 博客管理页
│   │   ├── new/
│   │   │   └── page.tsx            # 新建/编辑文章
│   │   └── components/
│   │       ├── MarkdownEditor.tsx  # Markdown 编辑器
│   │       ├── PreviewPane.tsx     # 预览面板（代码块浅色主题）
│   │       ├── EditorToolbar.tsx   # 工具栏
│   │       ├── TemplateSelector.tsx # 模板选择器
│   │       ├── ArticleList.tsx     # 文章列表
│   │       └── FrontmatterForm.tsx # Frontmatter 表单
│   └── navigation/
│       ├── page.tsx                # 导航编辑器页
│       └── components/
│           ├── NavigationEditor.tsx
│           ├── EditableCategory.tsx
│           ├── EditableTool.tsx
│           └── EditToolbar.tsx
├── hooks/
│   ├── useLocalArticles.ts         # 本地文章管理
│   └── useNavigationData.ts        # 导航数据管理
├── types/
│   ├── article.ts                  # 文章类型
│   └── navigation.ts               # 导航类型
├── lib/
│   ├── templates.ts                # 博客模板
│   └── code-highlight.ts           # 代码高亮配置（浅色主题）
└── styles/
    └── markdown-preview.css        # Markdown 预览样式（代码块浅色）
```

---

## 数据结构

### 文章类型

```typescript
interface Article {
  id: string;           // 唯一标识
  title: string;        // 标题
  date: string;         // 日期
  description: string;  // 描述
  tags: string[];       // 标签
  content: string;      // Markdown 内容
  createdAt: number;    // 创建时间戳
  updatedAt: number;    // 更新时间戳
}

interface ArticleTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  frontmatter: {
    title: string;
    description: string;
    tags: string[];
  };
  content: string;
}
```

### 导航类型

```typescript
interface Tool {
  icon: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
}

interface Category {
  name: string;
  icon: string;
  slug: string;
  tools: Tool[];
}
```

---

## 实施步骤

### 第一阶段：博客编辑器基础
1. 创建类型定义 (`types/article.ts`)
2. 创建博客模板 (`lib/templates.ts`) - 包含浅色代码块示例
3. 创建代码高亮配置 (`lib/code-highlight.ts`) - 浅色主题
4. 创建 Markdown 预览样式 (`styles/markdown-preview.css`)
5. 创建 `useLocalArticles` Hook
6. 创建 Markdown 编辑器组件
7. 创建预览组件（代码块浅色主题）
8. 创建 `/editor/blog/new` 页面

### 第二阶段：模板系统
1. 创建模板选择器组件
2. 实现模板应用功能
3. 创建 `/editor/blog` 管理页面
4. 实现文章列表展示

### 第三阶段：导航编辑器
1. 创建导航类型定义
2. 创建 `useNavigationData` Hook
3. 创建可编辑分类组件
4. 创建可编辑工具组件
5. 创建 `/editor/navigation` 页面

### 第四阶段：集成与优化
1. 在 `/navigation` 页面添加入口按钮
2. 添加导入/导出功能
3. 添加操作确认对话框
4. 优化移动端适配
5. 添加键盘快捷键

---

## UI/UX 设计规范

### 编辑器界面
- 采用分栏布局：左侧编辑，右侧预览
- 编辑器使用等宽字体（JetBrains Mono）
- 工具栏固定在顶部
- 编辑区背景使用浅灰色，预览区使用白色

### 代码块样式（重点）
```css
/* 核心原则：浅色背景，与整体风格一致 */
pre {
  background: #f8f9fa !important;     /* 强制浅色背景 */
  border: 1px solid #e9ecef;
}

/* 不使用黑色背景 */
/* background: #1e1e1e; ❌ 不使用深色主题 */
/* background: #282c34; ❌ 不使用深色主题 */
```

### 导航编辑器
- 编辑模式有明显的视觉区分（边框颜色变化）
- 悬停显示编辑/删除按钮
- 拖拽时有视觉反馈
- 空状态提示引导用户添加内容

### 通用规范
- 保持终端/代码风格设计
- 使用 Framer Motion 添加平滑动画
- 按钮使用 `text-link` 主色调
- 删除操作需要二次确认

---

## 交互流程

### 写博客流程
```
用户访问 /editor
    ↓
选择"新建文章"或选择模板
    ↓
进入编辑器页面
    ↓
编辑 Frontmatter（标题、日期等）
    ↓
编写 Markdown 内容
    ↓
实时预览效果（代码块显示浅色背景）
    ↓
点击保存 → 保存到 LocalStorage
    ↓
导出为 .md 文件（可选）
```

### 编辑导航流程
```
用户访问 /editor/navigation
    ↓
页面加载当前数据
    ↓
进入编辑模式
    ↓
用户可以：
    - 添加/编辑/删除分类
    - 添加/编辑/删除工具
    - 拖拽排序
    - 导入/导出 JSON
    ↓
自动保存到 LocalStorage
    ↓
在 /navigation 页面查看效果
```

---

## 注意事项
1. **代码块样式**：必须使用浅色背景（#f8f9fa 或类似），禁用深色主题
2. LocalStorage 有容量限制（约 5-10MB），需要监控数据大小
3. 提供数据导出功能，防止数据丢失
4. 编辑模式下添加明显的视觉区分
5. 删除操作需要二次确认
6. 考虑添加自动保存功能
7. 移动端需要优化编辑器体验

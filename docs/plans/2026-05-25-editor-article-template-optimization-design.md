# 编辑器与文章模板优化设计

日期：2026-05-25  
关联调研：[优秀个人博客深度调研](../research/excellent-personal-blogs-analysis-2026-05-25.md)  
适用范围：`/editor/blog`、`/editor/blog/new`、文章模板、文章元数据、公开文章页与归档页的配套展示。  
目标状态：把当前“能写 Markdown 的编辑器”升级为“能持续沉淀个人知识资产的写作系统”。

## 1. 背景

本项目当前已经具备一个可用的个人博客与导航站基础：

- 公开侧有首页、文章归档、文章详情和网址导航。
- 编辑侧有博客管理、模板选择、新建/编辑文章、frontmatter 表单、Markdown 编辑器、实时预览、本地草稿、导入导出、服务器同步和冲突提示。
- 文章数据既支持 seed Markdown，也支持运行时 JSON 数据，部署时可通过 `BLOG_DATA_ROOT` 持久化。

这说明项目已经跨过“能发布文章”的最低门槛。下一步真正要解决的问题不是再堆更多编辑按钮，而是让作者更容易写出具有长期价值、可被发现、可被信任、可被复用的文章。

优秀个人博客调研给出的核心结论是：个人博客不是“漂亮页面 + 随机文章”，而是一个长期运行的个人知识与信任系统。编辑器和模板应该围绕这个系统设计，帮助作者在写作时同时处理四件事：

- 这篇文章是什么类型。
- 它为什么值得读。
- 未来读者怎么再次找到它。
- 它的可信度和维护状态如何体现。

## 2. 当前实现诊断

### 2.1 当前编辑器能力

相关文件：

- `src/app/editor/blog/page.tsx`
- `src/app/editor/blog/new/NewArticleContent.tsx`
- `src/app/editor/blog/components/TemplateSelector.tsx`
- `src/app/editor/blog/components/FrontmatterForm.tsx`
- `src/app/editor/blog/components/MarkdownEditor.tsx`
- `src/app/editor/blog/components/PreviewPane.tsx`
- `src/lib/templates.ts`
- `src/app/types/article.ts`
- `src/app/hooks/useLocalArticles.ts`
- `src/lib/article-data.ts`
- `src/lib/frontmatter.ts`
- `src/lib/markdown.ts`

已有优点：

- 模板机制已存在，模板包含 `id`、`name`、`category`、`description`、`icon`、`estimatedMinutes`、`highlights`、`frontmatter` 和 `content`。
- 编辑器有写作、分栏、预览三种模式，桌面端适合长文编辑，移动端默认写作模式。
- `WritingInspector` 已有字数、预计阅读时间、保存状态和目录跳转。
- Markdown 工具栏覆盖常见写作块：标题、加粗、斜体、代码、链接、图片、列表、任务、表格、引用、分隔线。
- `frontmatter` 已支持标题、日期、描述、标签。
- 导入导出走 Markdown frontmatter，迁移能力清晰。
- 文章 slug 已经具备稳定化方向：运行时文章保存时生成 slug，读取时优先使用存储的 slug。
- 服务器同步有 revision 与冲突保护，不是单纯覆盖写入。

### 2.2 当前模板体系

当前模板：

- 技术教程：`tutorial`
- 源码解析：`deep-dive`
- 排障复盘：`debugging`
- 项目总结：`project`
- 学习笔记：`notes`
- 版本记录：`release`
- 空白文章：`blank`

这些模板偏工程记录，适合“我做了什么、怎么做、怎么验证”。它们解决了工程文章的基本结构，但还没有覆盖优秀个人博客常见的内容资产类型：

- 短笔记/TIL。
- 链接短评。
- 研究长文。
- 观点随笔。
- 资源清单。
- 作品/项目案例页。
- 从这里开始/精选入口。
- 可修订的 evergreen 文章。

### 2.3 当前主要缺口

#### 内容类型缺口

现在只有 `tags` 能表达文章主题，没有 `type` 或 `category` 表达内容形态。读者无法区分这是一篇教程、笔记、复盘、观点、资源清单还是短链接评论。归档页也只能按时间聚合，无法形成 Simon Willison、Julia Evans、Maggie Appleton 那种“按内容类型和主题进入旧内容”的结构。

#### 文章成熟度缺口

调研中 Maggie Appleton 的数字花园、Gwern 的长期修订、Dan Luu 的纠错机制都说明，优秀博客会表达文章状态。当前系统没有区分：

- 草稿。
- 已发布文章。
- 短笔记。
- 持续更新的 evergreen 文档。
- 已归档但不再维护的文章。

结果是所有 runtime article 一旦保存，都可能进入公开文章源；作者缺少发布前检查和状态控制。

#### 可信机制缺口

当前文章页展示日期、标题和描述，但没有展示：

- 更新时间。
- 标签。
- 阅读时间。
- 文章类型。
- 参考资料。
- 修订记录。
- 相关内容。

这会削弱长文和研究型文章的信任感。尤其技术文章需要明确版本、环境、验证方式和参考链接。

#### 写作引导缺口

当前模板提供结构，但编辑器没有基于模板的质量检查。比如技术教程模板里写了“验证”，但编辑器不会提醒：

- 标题是否为空。
- 描述是否太短。
- 是否缺少标签。
- 是否有二级标题。
- 是否有代码块语言。
- 是否有验证章节。
- 是否有参考资料。
- 是否有结论。

作者仍然要靠记忆保证质量。

#### 发现路径缺口

公开侧目前主要是时间归档。优秀博客通常同时提供：

- 最新内容。
- 主题入口。
- 精选入口。
- 类型入口。
- 系列入口。
- 搜索入口。
- 相关文章。

本项目已有导航页和文章归档，但文章模板没有驱动这些发现路径需要的元数据。

## 3. 从调研映射到本项目的设计原则

| 调研样本 | 可借鉴能力 | 对本项目的设计要求 |
| --- | --- | --- |
| Simon Willison | 博客、TIL、项目分层；短记录与长文并存 | 增加内容类型，模板覆盖短笔记、长文、项目、链接评论 |
| Julia Evans | 降低技术理解门槛；主题化组织 | 模板要引导“问题、例子、易错点、验证”，文章列表支持主题筛选 |
| Maggie Appleton | 数字花园；内容成熟度；视觉化表达 | 增加文章状态和成熟度，允许 seedling/evergreen 这类内容状态 |
| Dan Luu | 证据链、纠错和严肃长文 | 模板加入“证据、假设、验证、纠错/修订记录” |
| Gwern | 长文阅读基础设施、引用、交叉链接 | 文章页需要目录、参考资料、相关文章、更新时间 |
| Daring Fireball | 链接博客和作者判断 | 增加链接短评模板，支持外链、引用和观点摘要 |
| Paul Graham | 极简文章索引、稳定 URL、强标题 | slug 和标题质量要进入编辑器检查，归档页保留稳定入口 |
| Seth Godin | 高频短文、单点观点 | 增加短观点模板，不要求所有内容长文化 |
| Austin Kleon | 创意作品、个人宇宙入口 | 增加项目/作品页模板，强化作者身份与产出展示 |
| James Clear | 主题聚焦、可操作框架、内容产品化 | 模板要沉淀框架、清单和行动建议 |
| Wait But Why | 长文叙事、类比、图示 | 研究长文模板需要叙事线、概念拆解和视觉占位 |
| Bartosz Ciechanowski | 交互式解释，低频高质量 | 模板允许“互动/图示说明”块，但只在解释核心概念时使用 |

## 4. 成功标准

### 4.1 作者侧成功标准

- 作者能在 20 秒内选择合适模板，而不是在 7 个相似卡片里犹豫。
- 新建文章后，模板能清楚告诉作者这篇内容要完成什么，而不是只给空标题。
- 编辑器能提示文章是否达到最低发布质量，减少靠记忆检查。
- 作者可以区分短笔记、正式文章、项目总结、研究长文、链接短评等不同内容，不必把所有内容都塞进“文章”。
- 作者可以安全保存草稿，不会因为保存一次就被公开侧当成正式文章。

### 4.2 读者侧成功标准

- 读者进入归档页后，不只能按时间看，还能理解内容类型和主题。
- 读者进入文章页后，能看到日期、更新时间、标签、类型、阅读时间和文章状态。
- 长文有目录，读者可以快速跳转。
- 文章底部有相关内容或同主题入口，让旧内容能继续被发现。
- 研究、教程、复盘类文章能清楚展示来源、验证和修订痕迹。

### 4.3 技术侧成功标准

- 现有文章数据不丢失，旧 JSON 和 seed Markdown 能继续读取。
- slug 稳定，不因为标题修改导致旧链接失效。
- 新字段向后兼容，旧文章缺字段时使用合理默认值。
- 导入导出 Markdown frontmatter 能覆盖新增核心字段。
- 编辑器 UI 改造不破坏现有本地草稿、远程同步和冲突处理。
- 最小验证包括 lint、typecheck、模板数据单测、frontmatter 单测、编辑器 UI 测试和公开文章页测试。

## 5. 方案权衡

### 5.1 方案 A：只增强模板内容

做法：

- 只修改 `src/lib/templates.ts`。
- 增加或替换模板内容。
- 不改 Article 类型、不改编辑器 UI、不改公开展示。

收益：

- 改动最小。
- 风险最低。
- 可以快速改善新文章起笔质量。

成本：

- 不能区分草稿和发布状态。
- 不能驱动归档页、文章页和搜索筛选。
- 不能形成内容类型、成熟度、精选、系列等长期资产结构。
- 编辑器仍无法做质量检查。

适用场景：

- 只想短期补几个写作骨架。
- 不准备改变公开侧信息架构。

结论：

不推荐作为主方案。它能缓解起笔困难，但无法解决调研中最重要的“长期发现和信任机制”。

### 5.2 方案 B：模板体系 + 文章元数据 + 编辑器质量检查

做法：

- 保持当前 JSON/local-first 架构。
- 扩展 Article 可选字段，兼容旧数据。
- 重构模板体系，明确内容类型和写作目标。
- 扩展 frontmatter 表单，支持类型、状态、分类、精选、系列、slug、更新时间等关键字段。
- 增加基于模板的写作检查，不引入复杂 CMS。
- 公开侧配套展示类型、标签、阅读时间、更新时间、目录和相关文章。

收益：

- 直接解决优秀个人博客调研中的核心问题：分层、发现、信任、持续维护。
- 不需要引入数据库或富文本编辑器。
- 与现有运行时 JSON、导入导出、备份机制兼容。
- 可以分阶段实施，每个阶段都有可验证收益。

成本：

- 需要更新类型、解析、序列化、编辑器表单、公开页和测试。
- UI 会比当前复杂，需要控制信息密度。
- 需要设计字段默认值和旧数据迁移策略。

适用场景：

- 想把项目从简单博客管理器升级为长期个人知识站。
- 希望后续支持精选、系列、短笔记、项目页、资源页等结构。

结论：

推荐方案。它足够解决根因，同时没有过度工程化。

### 5.3 方案 C：完整 CMS 化

做法：

- 引入更完整的内容模型、富文本/块编辑器、媒体库、草稿发布流、版本历史、评论或 newsletter。
- 可能引入数据库、对象存储和后台权限体系。

收益：

- 能力最完整。
- 后续可扩展多作者、多内容集合、多发布渠道。

成本：

- 与当前个人站定位不匹配。
- 大幅增加维护成本。
- 容易把写作系统变成 CMS 产品，偏离项目的 KISS 原则。
- 会引入迁移、权限、媒体管理和复杂测试面。

适用场景：

- 多作者团队内容平台。
- 需要复杂审核流和媒体资产管理。

结论：

当前不推荐。个人博客的核心是持续写作和内容资产，不是后台系统复杂度。

## 6. 推荐方案

推荐采用方案 B：模板体系 + 文章元数据 + 编辑器质量检查。

设计核心是三层：

1. 内容模型层：让文章知道自己是什么、处于什么状态、属于哪个主题或系列。
2. 编辑体验层：让模板和检查器引导作者写出完整、可信、可复用的内容。
3. 公开发现层：让文章页和归档页使用这些元数据，帮助读者重新发现旧内容。

这不是做一个庞大 CMS，而是在当前编辑器上补齐个人博客最关键的“资产化能力”。

## 7. 内容模型设计

### 7.1 当前 Article

当前类型：

```typescript
export interface Article {
  id: string;
  slug?: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  content: string;
  createdAt: number;
  updatedAt: number;
}
```

这个模型足够发布普通文章，但无法表达文章类型、状态、系列、精选和修订信息。

### 7.2 推荐扩展字段

建议保持所有新增字段可选，旧文章读取时给默认值。

```typescript
export type ArticleKind =
  | 'essay'
  | 'guide'
  | 'deep-dive'
  | 'til'
  | 'debug'
  | 'project'
  | 'resource'
  | 'link'
  | 'review'
  | 'release';

export type ArticleStatus =
  | 'draft'
  | 'seedling'
  | 'published'
  | 'evergreen'
  | 'archived';

export interface ArticleSourceLink {
  title: string;
  url: string;
  note?: string;
}

export interface ArticleRevisionNote {
  date: string;
  note: string;
}

export interface Article {
  id: string;
  slug?: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  content: string;
  createdAt: number;
  updatedAt: number;

  kind?: ArticleKind;
  status?: ArticleStatus;
  category?: string;
  series?: string;
  featured?: boolean;
  updatedDate?: string;
  sourceLinks?: ArticleSourceLink[];
  revisionNotes?: ArticleRevisionNote[];
  templateId?: string;
}
```

### 7.3 字段解释

#### `kind`

表达文章形态，而不是主题。示例：

- `guide`：技术教程。
- `deep-dive`：源码/架构/原理深挖。
- `til`：短笔记。
- `debug`：排障复盘。
- `project`：项目/作品案例。
- `resource`：资源清单。
- `link`：链接短评。
- `essay`：观点随笔。
- `review`：读书/资料评注。
- `release`：版本记录。

价值：

- 归档页可按类型筛选。
- 模板选择可按类型分组。
- 文章页可展示类型徽标。
- 相关文章可优先匹配同类内容。

#### `status`

表达文章成熟度和公开策略。

建议语义：

- `draft`：草稿，不在公开页显示。
- `seedling`：公开但未完全定稿，适合数字花园式短笔记或探索中观点。
- `published`：正式发布。
- `evergreen`：持续维护的长期文档。
- `archived`：保留公开，但不再主动维护。

默认值：

- 旧文章默认 `published`。
- 新建文章默认 `draft`，点击“发布”后变为 `published`。

价值：

- 避免保存即发布。
- 支持 Maggie Appleton 式内容成熟度表达。
- 支持 Gwern 式 evergreen 长期维护。
- 支持旧文归档但不隐藏。

#### `category`

表达一级主题，例如：

- 工程实践。
- 架构设计。
- 工具与效率。
- 阅读与写作。
- 项目复盘。
- 资源导航。

`category` 与 `tags` 的区别：

- `category` 是单个主类目，用于导航和归档。
- `tags` 是多个关键词，用于搜索、关联和细分。

#### `series`

表达系列文章，例如：

- Next.js 部署笔记。
- 个人博客重构日志。
- 编辑器设计复盘。

价值：

- 允许单篇文章成为连续知识路径的一部分。
- 公开文章页可显示“同系列文章”。

#### `featured`

表达是否进入精选。

价值：

- 支持“从这里开始”页面和首页推荐。
- 作者主动告诉新读者先读什么。

#### `updatedDate`

表达内容层面的更新时间，与 `updatedAt` 区分：

- `updatedAt` 是数据记录最后保存时间，机器字段。
- `updatedDate` 是公开给读者看的修订日期，内容字段。

价值：

- 避免编辑器自动保存导致文章公开更新时间频繁变化。
- 支持文章页展示“最后修订于”。

#### `sourceLinks`

结构化存储参考来源。

价值：

- 强化 Dan Luu/Gwern 式可信机制。
- 支持文章页底部统一展示来源。
- 避免参考链接散落在正文中无法聚合。

#### `revisionNotes`

结构化存储重要修订。

价值：

- 支持纠错和更新透明度。
- 不必为每篇文章建立独立 corrections 页面，但可在文章底部展示修订记录。

#### `templateId`

记录文章来自哪个模板。

价值：

- 编辑器可以加载对应质量规则。
- 未来可统计哪些模板常用、哪些模板需要优化。

### 7.4 不建议现在加入的字段

暂不加入：

- `author`：当前项目是个人站，多作者不是近期需求。
- `coverImage`：会引入图片上传、存储和裁剪问题，当前文章设计不依赖封面。
- `commentsEnabled`：评论系统不是当前重点。
- `newsletterSentAt`：没有 newsletter 能力，不应提前建字段。
- `monetization`：商业化不是当前核心。
- `readingMinutes`：可以从内容派生，不需要存储。
- `wordCount`：可以从内容派生，不需要存储。

## 8. Frontmatter 设计

### 8.1 当前 frontmatter

当前导入导出支持：

```yaml
---
title: "文章标题"
date: "2026-05-25"
description: "文章描述"
tags: ["技术", "教程"]
---
```

### 8.2 推荐 frontmatter

建议导出为：

```yaml
---
title: "文章标题"
slug: "stable-article-slug"
date: "2026-05-25"
updatedDate: "2026-05-25"
description: "一句能说明读者为什么要读的摘要。"
kind: "guide"
status: "published"
category: "工程实践"
series: "个人博客建设"
featured: false
tags: ["Next.js", "编辑器", "模板"]
sourceLinks:
  - title: "Simon Willison's Weblog"
    url: "https://simonwillison.net/"
    note: "短笔记和项目入口的参考"
revisionNotes:
  - date: "2026-05-25"
    note: "首次发布"
---
```

### 8.3 解析策略

当前 `src/lib/frontmatter.ts` 是轻量手写解析器，只支持简单键值和数组。新增嵌套字段后有两个选择：

#### 选择 1：继续手写解析器，只支持扁平字段

做法：

- 只解析 `slug`、`updatedDate`、`kind`、`status`、`category`、`series`、`featured`。
- `sourceLinks` 和 `revisionNotes` 继续留在正文中，不做结构化 frontmatter。

收益：

- 改动较小。
- 不引入新的 YAML 解析依赖。

成本：

- 参考来源和修订记录无法结构化。
- 导入导出能力受限。
- 长期会让 frontmatter 解析器越来越脆弱。

#### 选择 2：统一使用 `gray-matter` 解析和序列化

做法：

- 项目已依赖 `gray-matter`，`src/lib/markdown.ts` 已在 seed Markdown 读取中使用。
- 将 `src/lib/frontmatter.ts` 改为基于 `gray-matter` 解析。
- 序列化时仍保持稳定字段顺序，避免导出内容抖动。

收益：

- 支持标准 YAML。
- 支持嵌套数组和布尔值。
- 与 seed Markdown 读取逻辑保持一致。
- 后续扩展字段更安全。

成本：

- 需要补充 frontmatter 单测。
- 需要确保导出格式稳定。
- 需要处理非法 YAML 的错误信息。

推荐：

选择 2。项目已经使用 `gray-matter`，没有必要维护两套 frontmatter 解析模型。

## 9. 模板体系设计

### 9.1 模板设计原则

模板不是填空题，而是写作策略。每个模板必须说明：

- 适合什么场景。
- 读者为什么需要这篇文章。
- 文章应该留下什么长期资产。
- 哪些章节是必填，哪些章节可删。
- 保存前应该检查什么。

模板内容应避免过度空泛，不能只写“背景、过程、总结”。不同模板要有明显差异。

### 9.2 模板分组

推荐按内容资产类型分为四组。

#### 快速沉淀

目标：保持更新频率，降低写作阻力。

- TIL/短笔记。
- 链接短评。
- 学习笔记。

#### 深度资产

目标：形成长期搜索价值和引用价值。

- 技术教程。
- 研究长文。
- 源码/架构深挖。

#### 经验复盘

目标：沉淀真实问题、取舍和验证。

- 排障复盘。
- 项目/作品案例。
- 版本记录。

#### 导航与入口

目标：帮助读者发现内容。

- 资源清单。
- 从这里开始。
- 系列索引。

### 9.3 推荐模板清单

#### 1. TIL/短笔记

对应调研：

- Simon Willison 的 TIL。
- Seth Godin 的高频短文。

适用场景：

- 今天学到一个命令、概念、错误处理方式。
- 不值得写成长教程，但未来可能会搜索。
- 想保持更新节奏。

默认元数据：

```typescript
{
  kind: 'til',
  status: 'seedling',
  category: '短笔记',
  tags: ['TIL']
}
```

内容骨架：

````markdown
# 今天学到的一件事

## 结论

用 1-3 句话写清楚以后要记住什么。

## 场景

当时遇到的问题或触发这个发现的上下文。

## 最小例子

```bash
command --flag value
```

## 易错点

- 易错点 1：
- 易错点 2：

## 延伸

- 以后可以继续查：
````

质量检查：

- 标题不为空。
- 有“结论”章节。
- 正文不少于 80 字。
- 至少 1 个标签。
- 如果包含代码块，代码块必须声明语言。

#### 2. 链接短评

对应调研：

- Daring Fireball 的链接博客模式。
- Simon Willison 的链接与短评。

适用场景：

- 记录一篇外部文章、工具、项目或观点。
- 不只是收藏链接，而是写出作者判断。
- 为导航站和文章之间建立桥。

默认元数据：

```typescript
{
  kind: 'link',
  status: 'published',
  category: '链接短评',
  tags: ['链接']
}
```

内容骨架：

````markdown
# 这篇内容为什么值得看

## 链接

- 标题：
- 地址：
- 作者/来源：

## 我为什么保存它

写清楚它解决了什么问题，或者提供了什么判断。

## 值得带走的观点

> 引用不超过必要长度，重点写自己的理解。

## 我的判断

- 适合谁：
- 不适合谁：
- 后续可能怎么用：
````

质量检查：

- 正文包含至少 1 个外链。
- 有“我的判断”章节。
- 描述不应只重复标题。
- 标签不少于 1 个。

#### 3. 技术教程

对应调研：

- Julia Evans 的低门槛技术解释。
- James Clear 的可操作框架。

适用场景：

- 可复现的实践文章。
- 帮读者从问题走到结果。
- 有环境、步骤、验证。

默认元数据：

```typescript
{
  kind: 'guide',
  status: 'published',
  category: '工程实践',
  tags: ['教程']
}
```

内容骨架：

````markdown
# 用最小路径解决一个具体问题

## 读完你会得到什么

- 结果 1：
- 结果 2：
- 不包含：

## 背景

说明真实问题、约束和为什么现在处理。

## 环境

| 项目 | 版本 | 说明 |
| --- | --- | --- |
| Node.js |  |  |

## 最小可运行版本

先给读者一个能跑通的闭环。

```typescript
export function example() {
  return true;
}
```

## 分步骤实现

### 步骤 1：

### 步骤 2：

### 步骤 3：

## 常见错误

| 现象 | 原因 | 处理 |
| --- | --- | --- |
|  |  |  |

## 验证

```bash
npm run lint
npm run typecheck
npm run test:run
```

## 总结

用 3-5 句话说明可复用经验。
````

质量检查：

- 有“环境”章节。
- 有“验证”章节。
- 至少一个代码块或命令块。
- 标题必须包含具体问题或产出。
- 描述说明读者收益，不只是“记录一下”。

#### 4. 研究长文

对应调研：

- Gwern 的引用体系和长文基础设施。
- Wait But Why 的叙事解释。
- Dan Luu 的证据链。

适用场景：

- 对一个复杂主题做系统梳理。
- 需要引用、论证、反例和结论。
- 文章希望长期被搜索、引用和修订。

默认元数据：

```typescript
{
  kind: 'essay',
  status: 'evergreen',
  category: '研究',
  tags: ['研究']
}
```

内容骨架：

````markdown
# 一个值得长期维护的问题

## 摘要

用 150 字以内说明问题、结论和适用边界。

## 问题定义

这篇文章真正要回答什么？不回答什么？

## 结论先行

1. 结论 1：
2. 结论 2：
3. 结论 3：

## 背景

解释为什么这个问题重要，以及读者需要知道的上下文。

## 关键概念

### 概念 1

用类比或例子解释。

### 概念 2

## 证据

| 证据 | 来源 | 支持什么 |
| --- | --- | --- |
|  |  |  |

## 反例与限制

哪些情况下结论不成立？

## 我的判断

把资料整理成作者自己的判断。

## 参考资料

- [来源标题](https://example.com)：

## 修订记录

- 2026-05-25：首次发布。
````

质量检查：

- 描述不少于 50 字。
- 有“问题定义”“结论先行”“参考资料”章节。
- 至少 2 个外链或 `sourceLinks`。
- 有“限制”或“反例”章节。
- 长文超过 1200 字时必须有目录。

#### 5. 源码/架构深挖

对应调研：

- Dan Luu 的系统性拆解。
- Gwern 的交叉链接。

适用场景：

- 拆解框架、库、项目模块或架构设计。
- 想保留调用链、数据流和取舍。

默认元数据：

```typescript
{
  kind: 'deep-dive',
  status: 'published',
  category: '架构设计',
  tags: ['源码', '架构']
}
```

内容骨架：

````markdown
# 一段机制为什么这样设计

## 阅读目的

这次阅读要回答的问题：

- 问题 1：
- 问题 2：

## 结论概览

先写最终理解，方便读者判断是否继续读。

## 入口

```text
user action
  -> public API
  -> coordinator
  -> storage boundary
```

## 核心数据结构

| 名称 | 职责 | 关键字段 |
| --- | --- | --- |
|  |  |  |

## 核心流程

### 1. 输入如何进入系统

### 2. 状态在哪里变化

### 3. 副作用在哪里提交

### 4. 输出如何返回

## 设计取舍

| 方案 | 收益 | 成本 | 为什么没有选 |
| --- | --- | --- | --- |
| 当前方案 |  |  |  |

## 可复用经验

这段源码对以后设计有什么启发？
````

质量检查：

- 有“入口”章节。
- 有“核心流程”章节。
- 有“设计取舍”章节。
- 至少一个代码块或流程块。

#### 6. 排障复盘

对应调研：

- Dan Luu 的根因分析和纠错意识。
- 技术博客的可复现价值。

适用场景：

- 线上问题。
- 本地排障。
- 部署、同步、构建失败。

默认元数据：

```typescript
{
  kind: 'debug',
  status: 'published',
  category: '排障复盘',
  tags: ['排障', '复盘']
}
```

内容骨架：

````markdown
# 一次问题排查复盘

## 影响

- 影响对象：
- 影响范围：
- 首次发现：

## 现象

用户或系统看到的异常是什么？

## 时间线

| 时间 | 动作 | 结论 |
| --- | --- | --- |
| 10:00 |  |  |

## 假设

| 假设 | 验证方式 | 结果 |
| --- | --- | --- |
|  |  |  |

## 根因

把根因写成一句可以被验证的话。

## 修复

说明最终改动，以及为什么它解决根因。

## 验证

```bash
npm run lint
npm run typecheck
npm run test:run
```

## 预防

- [ ] 增加回归测试
- [ ] 增加日志或提示
- [ ] 更新文档
````

质量检查：

- 有“根因”章节。
- 有“验证”章节。
- 有“预防”任务列表。
- 标题不应只写“bug 修复”，要写清问题。

#### 7. 项目/作品案例

对应调研：

- Austin Kleon 的作品与个人身份连接。
- Simon Willison 的项目入口。

适用场景：

- 总结一个项目、功能或作品。
- 展示产出、约束、关键决策和结果。

默认元数据：

```typescript
{
  kind: 'project',
  status: 'published',
  category: '项目',
  tags: ['项目']
}
```

内容骨架：

````markdown
# 一个项目如何从问题走到结果

## 项目一句话

这个项目服务谁，解决什么问题？

## 背景

为什么要做？原来的问题是什么？

## 目标与非目标

| 类型 | 内容 |
| --- | --- |
| 目标 |  |
| 非目标 |  |

## 最终产出

- 产出 1：
- 产出 2：

## 关键决策

### 决策 1：

为什么这么选，放弃了什么？

## 结果

| 指标 | 结果 | 备注 |
| --- | --- | --- |
|  |  |  |

## 经验

以后遇到类似项目，可以复用什么判断？
````

质量检查：

- 有“目标与非目标”章节。
- 有“关键决策”章节。
- 有“结果”章节。
- 描述必须说明项目价值。

#### 8. 资源清单

对应调研：

- James Clear 的资源库。
- Simon Willison 的项目/工具索引。
- 本项目已有导航页，可以形成文章与导航的互补。

适用场景：

- 整理某一主题下的工具、文章、库、服务。
- 不是简单收藏，而是带选择标准和推荐理由。

默认元数据：

```typescript
{
  kind: 'resource',
  status: 'evergreen',
  category: '资源导航',
  tags: ['资源']
}
```

内容骨架：

````markdown
# 一个主题的资源清单

## 适合谁

说明这个清单面向什么读者和场景。

## 选择标准

- 标准 1：
- 标准 2：
- 标准 3：

## 快速推荐

| 资源 | 适合场景 | 推荐理由 |
| --- | --- | --- |
|  |  |  |

## 分类整理

### 分类 1

- [资源名称](https://example.com)：为什么值得看。

### 分类 2

## 不推荐或谨慎使用

说明哪些资源看似相关但不适合当前场景。

## 更新记录

- 2026-05-25：首次整理。
````

质量检查：

- 至少 3 个外链。
- 有“选择标准”章节。
- 有“更新记录”章节。
- 建议状态为 `evergreen`。

#### 9. 观点随笔

对应调研：

- Paul Graham 的强观点文章。
- Seth Godin 的单点短文。

适用场景：

- 记录一个判断、原则、反直觉观察。
- 不一定是教程，但要有作者视角。

默认元数据：

```typescript
{
  kind: 'essay',
  status: 'published',
  category: '观点',
  tags: ['思考']
}
```

内容骨架：

````markdown
# 一个值得说清楚的判断

## 核心观点

用一句话写出这篇文章真正想说什么。

## 为什么现在想到它

具体场景，不要泛泛而谈。

## 我的观察

写出例子、经历或证据。

## 反面情况

这个观点什么时候不成立？

## 可以带走什么

给读者一个可转述、可行动或可继续思考的结论。
````

质量检查：

- 有“核心观点”章节。
- 有“反面情况”章节。
- 结尾要有明确 takeaway。
- 正文不能只有列表，应有连续论证。

#### 10. 读书/资料评注

对应调研：

- Austin Kleon 的读书和创意连接。
- James Clear 的框架化表达。

适用场景：

- 读完一本书、一篇论文、一份文档后的结构化笔记。
- 想保留摘录、判断和行动。

默认元数据：

```typescript
{
  kind: 'review',
  status: 'published',
  category: '阅读',
  tags: ['阅读']
}
```

内容骨架：

````markdown
# 一份资料带来的改变

## 资料信息

- 标题：
- 作者：
- 链接：
- 阅读日期：

## 一句话总结

这份资料最重要的价值是什么？

## 关键观点

### 观点 1

我的理解：

### 观点 2

我的理解：

## 值得摘录

> 控制引用长度，只保留必要片段。

## 我不同意或保留的地方

写出判断，不只做搬运。

## 下一步行动

- [ ] 行动 1：
````

质量检查：

- 有资料来源。
- 有“我不同意或保留的地方”章节。
- 有“下一步行动”或“可复用经验”。

#### 11. 版本记录

对应调研：

- 技术项目需要透明维护记录。
- 适合配合本项目的部署和功能迭代。

适用场景：

- 记录一次发布。
- 给未来自己查版本变更和验证记录。

默认元数据：

```typescript
{
  kind: 'release',
  status: 'published',
  category: '版本记录',
  tags: ['发布']
}
```

内容骨架：

````markdown
# 一次版本发布记录

## 摘要

一句话说明这次发布给用户带来的变化。

## 主要改动

- 改动 1：
- 改动 2：

## 用户影响

| 范围 | 影响 | 处理 |
| --- | --- | --- |
|  |  |  |

## 验证

```bash
npm run lint
npm run typecheck
npm run test:run
```

## 回滚

说明最小回滚路径和数据注意事项。

## 后续观察

- [ ] 指标或日志：
````

质量检查：

- 有“验证”章节。
- 有“回滚”章节。
- 有用户影响说明。

#### 12. 从这里开始

对应调研：

- Paul Graham 的稳定文章索引。
- Austin Kleon 的个人入口。
- 本项目已有 `content/seeds/posts/2026-05-25-getting-started.md`。

适用场景：

- 给新读者一个起点。
- 解释博客写什么、如何阅读、推荐先看哪些内容。

默认元数据：

```typescript
{
  kind: 'essay',
  status: 'evergreen',
  category: '站点入口',
  featured: true,
  tags: ['开始']
}
```

内容骨架：

````markdown
# 从这里开始

## 这里是什么

说明站点定位和持续写作主题。

## 适合怎么读

- 想快速了解我在做什么：
- 想找工具和资料：
- 想看深度复盘：

## 推荐先读

1. [文章标题](链接)：为什么推荐。
2. [文章标题](链接)：为什么推荐。
3. [文章标题](链接)：为什么推荐。

## 内容分类

| 类型 | 适合读什么 |
| --- | --- |
| 短笔记 |  |
| 技术教程 |  |
| 项目复盘 |  |

## 更新节奏

说明短笔记和深度文章的大致节奏。
````

质量检查：

- 必须 `featured: true`。
- 建议 `status: evergreen`。
- 至少包含 3 个推荐入口。

### 9.4 模板取舍

不建议保留太多相似模板。当前 `notes`、`tutorial`、`deep-dive` 的边界可以更清楚：

- `til`：短小发现，不追求完整教程。
- `guide`：可复现路径，重点是帮助读者完成任务。
- `deep-dive`：理解机制，重点是流程、结构和取舍。
- `research`/`essay`：回答复杂问题，重点是证据和论证。

模板卡片必须让作者快速知道差异，而不是只看名字。

## 10. 编辑器信息架构优化

### 10.1 `/editor/blog` 博客管理页

当前页面已有：

- 新建文章入口。
- 模板库展开。
- 最近文章。
- 文章列表。
- 搜索标题、描述、标签。
- 导入导出。

建议优化为三个区域：

#### 区域 A：写作入口

功能：

- 快速新建：短笔记、正式文章、资源清单、空白文章。
- 模板库：按分组展示全部模板。
- 最近草稿：优先显示 `status: draft` 且最近更新的文章。

原因：

- 高频动作应该更近。
- Simon Willison 式短笔记需要比正式长文更低的入口成本。

#### 区域 B：内容资产概览

显示：

- 总文章数。
- 草稿数。
- evergreen 数。
- 精选数。
- 最近 30 天更新数。

原因：

- 个人博客要长期维护，作者需要看到内容库状态。
- 这些指标比单纯文章总数更能反映资产健康度。

#### 区域 C：文章管理列表

增强筛选：

- 关键词。
- 类型 `kind`。
- 状态 `status`。
- 分类 `category`。
- 精选 `featured`。
- 标签。

文章卡片显示：

- 标题。
- 描述。
- 类型。
- 状态。
- 日期。
- 更新时间。
- 阅读时间。
- 标签。
- 是否精选。

操作：

- 编辑。
- 预览公开页。
- 导出。
- 删除。
- 快速发布/改为草稿。

### 10.2 模板选择器

当前卡片信息：

- 分类。
- 名称。
- 描述。
- 预计时间。
- highlights。

建议新增：

- 按模板分组展示。
- 每组有短标题，不需要长解释。
- 模板卡片显示“适合场景”和“产出结果”。
- 空白文章不和结构模板混在一起，放在固定快捷入口。
- `selectedId` 当前未在博客管理页使用，后续可用于从 URL 或草稿恢复时高亮。

模板卡片字段建议：

```typescript
interface ArticleTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  group: 'quick' | 'deep' | 'review' | 'entry';
  kind: ArticleKind;
  defaultStatus: ArticleStatus;
  category: string;
  estimatedMinutes: number;
  bestFor: string[];
  output: string;
  requiredSections: string[];
  qualityRules: ArticleQualityRule[];
  frontmatter: ArticleTemplateFrontmatter;
  content: string;
}
```

保留现有字段时，可以逐步演进：

- 第一阶段继续使用 `category`、`highlights`。
- 第二阶段新增 `group`、`kind`、`defaultStatus`、`requiredSections`、`qualityRules`。
- 第三阶段用新字段驱动 UI 分组和质量检查。

### 10.3 新建/编辑文章页

当前布局：

- 左侧 frontmatter。
- 左侧 writing inspector。
- 右侧编辑器/预览工作区。

推荐保留总体布局，但重新划分左侧面板。

#### 面板 1：发布信息

包含：

- 标题。
- slug。
- 描述。
- 日期。
- 更新时间。
- 类型。
- 状态。
- 分类。
- 系列。
- 精选。
- 标签。

交互原则：

- 标题、描述、状态、类型是高优先级。
- slug 默认自动生成，但允许手动编辑。
- 修改标题不应自动覆盖已有 slug，避免破坏稳定链接。
- 新文章初次保存时生成 slug。
- 状态默认为草稿，点击发布后才公开。

#### 面板 2：写作检查

由当前 `WritingInspector` 扩展。

显示：

- 字数。
- 阅读时间。
- 保存状态。
- 草稿保存时间。
- 模板名称。
- 质量分组。

检查项分组：

- 基础信息：标题、描述、标签、分类。
- 结构完整：必需章节、标题层级、目录。
- 可信机制：参考资料、验证、修订记录。
- 可读性：描述长度、段落长度、代码块语言、图片 alt。
- 发布状态：草稿、公开、精选、evergreen。

检查结果：

- 通过。
- 建议。
- 阻塞。

阻塞项只用于真正会导致坏数据的问题，例如标题为空、slug 冲突、非法日期。建议项不阻止保存。

#### 面板 3：目录

保留当前目录跳转，但增强：

- 支持 H2/H3/H4。
- 标出缺失的模板必填章节。
- 长文目录超过 12 项时可滚动，不截断信息。

#### 面板 4：参考与修订

可先设计为后续阶段：

- 管理 `sourceLinks`。
- 管理 `revisionNotes`。
- 支持从正文外链提取候选来源。

第一阶段可以不做完整表单，但要在数据模型和文档中预留。

### 10.4 Markdown 编辑器工具栏

当前工具栏已经覆盖基础 Markdown。建议补充但不急于实现：

- 插入摘要块。
- 插入参考资料章节。
- 插入修订记录章节。
- 插入 Mermaid 图。
- 插入 warning/note/tip callout。
- 插入外链短评块。

注意：

- 工具栏不应变得过长。
- 高频按钮保留图标。
- 低频结构块可放入“插入”菜单。

优先级：

1. 保留现有按钮。
2. 把 callout 从当前 `Pilcrow` 图标换成更语义化的图标，如 `MessageSquareWarning` 或 `Info`。
3. 新增“结构块”下拉菜单，而不是继续平铺按钮。

### 10.5 预览面板

当前预览只渲染正文。建议增强为“文章真实预览”：

- 显示标题。
- 显示描述。
- 显示日期、更新时间、类型、标签、阅读时间。
- 显示正文。

原因：

- 作者写描述和标签时，需要看到公开页实际效果。
- 优秀博客的文章页不是只有正文，元信息也是信任的一部分。

实现注意：

- 不要在 `PreviewPane` 内复制公开文章页全部逻辑。
- 可以抽一个 `ArticlePreviewShell` 或 `ArticleMetaBar` 共享组件。
- 如果为了控制范围，第一阶段仍只预览正文，文档里要明确第二阶段补齐。

## 11. 公开侧配套设计

编辑器和模板如果不影响公开侧，元数据价值会打折。公开侧至少要配套以下能力。

### 11.1 文章归档页 `/blog`

当前：

- 按年份分组。
- 显示日期、标题、描述。
- 过滤掉 navigation。

建议：

- 默认仍按时间展示，避免大改阅读习惯。
- 增加轻量筛选：类型、分类、标签。
- 精选文章独立区域，显示在归档页前部。
- 草稿不显示。
- `archived` 显示，但加状态。
- `seedling` 可显示轻量状态。

文章卡片新增：

- 类型。
- 分类。
- 标签。
- 阅读时间。
- 更新时间。
- 精选标记。

排序：

- 默认按 `date` 倒序。
- 如果是 `evergreen` 且 `updatedDate` 较新，可以在精选区域按 `updatedDate` 排序。

### 11.2 文章详情页 `/posts/[...slug]`

当前：

- 返回归档。
- Hero 显示日期、标题、描述。
- MarkdownContent 卡片展示正文。

建议：

#### 顶部信息

显示：

- 类型。
- 分类。
- 发布日期。
- 更新时间。
- 阅读时间。
- 标签。
- 状态。

#### 正文阅读

建议：

- 长文显示目录。
- 保持最大宽度适合阅读，当前 `max-w-3xl` 合理。
- Markdown 内容不一定需要卡片包裹；可以评估是否去掉过强边框，让阅读更像文章而不是后台预览。
- 代码块复制保留。

#### 底部区域

显示：

- 参考资料。
- 修订记录。
- 同系列文章。
- 相关文章。
- 返回归档。

相关文章匹配规则：

1. 同 series。
2. 同 category。
3. tag 交集最多。
4. 同 kind。
5. 排除当前文章。

### 11.3 首页配套

首页可以使用新增字段：

- 显示精选文章。
- 显示最近短笔记。
- 显示 evergreen 资源。
- 显示导航入口。

这对应调研中“首页不是宣传页，而是阅读入口”的结论。

## 12. 质量检查规则设计

### 12.1 规则分级

```typescript
type QualityRuleSeverity = 'blocking' | 'warning' | 'suggestion';
```

#### blocking

阻止发布，但不阻止保存草稿。

示例：

- 标题为空。
- slug 为空或冲突。
- 日期非法。
- 状态为 `published` 但描述为空。

#### warning

允许发布，但明显影响质量。

示例：

- 描述少于 30 字。
- 标签为空。
- 长文没有目录。
- 技术教程没有验证章节。
- 研究长文没有参考资料。

#### suggestion

写作建议。

示例：

- 标题过长。
- 段落过长。
- 代码块未标语言。
- 图片缺少 alt。
- 文章缺少结论。

### 12.2 基础规则

适用于所有模板：

- 标题必须存在。
- 描述建议 30-120 字。
- 至少 1 个标签。
- 有日期。
- H1 建议最多 1 个。
- 标题层级不要从 H2 跳到 H4。
- 外链建议使用有意义的链接文字。
- 代码块建议声明语言。

### 12.3 模板规则

每个模板定义 `requiredSections`：

```typescript
requiredSections: ['背景', '验证', '总结']
```

检查方式：

- 从 Markdown heading 中匹配。
- 支持同义词配置，例如“参考资料”也可接受“来源”“References”。
- 不要求完全按模板顺序，但可给建议。

### 12.4 发布前规则

保存草稿时：

- 只要求数据合法。

发布时：

- 要求 blocking 全通过。
- warning 可以存在，但需要提示。

精选时：

- 必须是 `published` 或 `evergreen`。
- 必须有描述。
- 建议有标签和分类。

evergreen 时：

- 建议有 `updatedDate`。
- 建议有修订记录。

## 13. 数据流设计

### 13.1 当前数据流

```text
TemplateSelector
  -> /editor/blog/new?template=...
  -> getTemplateById()
  -> NewArticleContent state
  -> FrontmatterForm + MarkdownEditor
  -> createArticle/updateArticleContent
  -> useSyncedResource
  -> localStorage + /api/data/articles
  -> data/articles/articles.json
  -> getPosts()/getPostBySlugArray()
  -> /blog + /posts/[...slug]
```

### 13.2 推荐数据流

```text
TemplateSelector
  -> selected template with kind/status/category/rules
  -> NewArticleContent initializes article draft
  -> Editor metadata panel edits structured fields
  -> QualityInspector derives checks from template + content
  -> Save Draft writes status=draft
  -> Publish validates blocking rules
  -> useSyncedResource persists Article[]
  -> API validates backward-compatible Article schema
  -> public markdown mapper filters status !== draft
  -> archive/detail render article metadata and related paths
```

### 13.3 保存与发布

当前只有“保存”。建议拆成：

- 保存草稿：保存当前状态，不改变公开状态。
- 发布：将 `status` 从 `draft` 改为 `published`，并执行发布前 blocking 检查。
- 取消发布：将 `status` 改回 `draft` 或 `archived`，具体交互需要谨慎。

为了控制第一阶段复杂度，可以先保留一个“保存”按钮，但状态字段默认草稿，并提供状态选择。第二阶段再拆按钮。

## 14. 兼容与迁移策略

### 14.1 旧 runtime JSON

旧文章没有新增字段。读取时：

- `kind` 默认 `essay` 或根据 tags 简单推断。
- `status` 默认 `published`。
- `category` 默认空字符串。
- `featured` 默认 `false`。
- `updatedDate` 默认空或 `date`。
- `sourceLinks` 默认 `[]`。
- `revisionNotes` 默认 `[]`。

不建议在读取时强行写回迁移，避免无意义数据 churn。只有文章被编辑保存时才写入新字段。

### 14.2 seed Markdown

当前 seed Markdown 可能有 `category`，但 `PostMeta` 忽略。建议：

- `src/lib/markdown.ts` 的 `PostMeta` 扩展可选字段。
- seed Markdown 使用标准 frontmatter。
- 未配置字段时使用默认值。

### 14.3 导入导出

导入：

- 支持旧 frontmatter。
- 支持新 frontmatter。
- 非法 `kind/status` 回退默认值并给编辑器提示。

导出：

- 输出新字段。
- 空字段可以省略，避免 Markdown 太臃肿。
- 字段顺序固定。

### 14.4 slug 稳定

规则：

- 新文章首次创建时根据标题生成 slug。
- 如果用户手动编辑 slug，以用户输入为准。
- 后续修改标题不自动改 slug。
- slug 冲突时发布阻塞。
- 导入文章如果有 slug，优先保留；若冲突则追加短后缀或提示。

## 15. 分阶段实施计划

### 阶段 1：模板内容升级

目标：

- 不改数据模型，不改公开页。
- 先让模板更接近优秀博客写作结构。

改动：

- 更新 `src/lib/templates.ts`。
- 保留当前 `ArticleTemplate` 类型。
- 新增或替换模板：TIL、链接短评、研究长文、资源清单、观点随笔、读书评注、从这里开始。
- 调整现有教程、源码、排障、项目、发布记录模板内容。

验证：

- 模板数组 id 唯一。
- 默认模板仍为 `blank`。
- 模板卡片可以正常渲染。
- 新建每个模板能进入编辑器。

风险：

- 模板变多后选择器拥挤。
- 需要配合阶段 2 做分组。

### 阶段 2：模板选择器分组和编辑器检查

目标：

- 作者能快速选择模板。
- 编辑器能给基本质量反馈。

改动：

- 扩展 `ArticleTemplate` 类型，新增 `group`、`kind`、`defaultStatus`、`requiredSections`、`qualityRules`。
- `TemplateSelector` 按 group 渲染。
- `NewArticleContent` 根据模板记录 `templateId`。
- `WritingInspector` 增加基础检查项。
- 新增纯函数：
  - `getMarkdownHeadings(content)`
  - `countMarkdownWords(content)`
  - `getArticleQualityChecks(articleDraft, template)`
  - `hasRequiredSection(headings, section)`

验证：

- 质量检查纯函数单测。
- UI 测试检查模板分组和检查项显示。
- 现有保存、草稿恢复、导出不回归。

风险：

- 如果检查项太多，会让写作变成填表。
- 第一版只显示最关键检查，避免压力过大。

### 阶段 3：文章元数据扩展

目标：

- 内容类型、状态、分类、精选、系列、slug 等进入正式数据模型。

改动：

- 扩展 `src/app/types/article.ts`。
- 更新 `src/lib/article-data.ts` 的解析与默认值。
- 更新 `src/lib/frontmatter.ts`，建议切到 `gray-matter`。
- 更新 `FrontmatterForm`，拆成更清晰的发布信息面板。
- 更新 `useLocalArticles` 的 create/update/import/export。
- API 继续使用 `parseArticlesData` 校验。

验证：

- 旧 Article JSON 可读取。
- 新 Article JSON 可读取。
- 导入旧 Markdown 可成功。
- 导入新 Markdown 可成功。
- 导出字段顺序稳定。
- slug 不因标题变化被覆盖。

风险：

- 数据模型扩展影响面较大，需要测试覆盖。
- frontmatter 切换 parser 要小心导出格式。

### 阶段 4：公开页使用元数据

目标：

- 公开侧体现编辑器新增字段价值。

改动：

- `src/lib/markdown.ts` 的 `PostMeta` 扩展字段。
- `/blog` 增加筛选和精选区域。
- `/posts/[...slug]` 增加 meta bar、标签、阅读时间、更新时间、状态、相关文章。
- 增加文章页目录组件。
- 草稿不进入公开列表。

验证：

- 草稿不会公开。
- 旧文章仍显示。
- 有标签/分类/类型的文章正确展示。
- 相关文章排除当前文章。
- 公开 smoke 测试通过。

风险：

- 归档页信息密度上升，需要保持克制。
- 文章页如果增加太多边框和徽标，会损害阅读体验。

### 阶段 5：参考资料与修订记录

目标：

- 补齐可信机制。

改动：

- 支持 `sourceLinks` 和 `revisionNotes` 的编辑。
- 文章页底部展示参考资料和修订记录。
- 质量检查识别研究长文/资源清单是否缺参考来源。

验证：

- sourceLinks/revisionNotes 导入导出。
- 非法 URL 或空 title 处理。
- 文章页展示顺序稳定。

风险：

- 表单复杂度增加。
- 可先支持 Markdown 正文章节，后续再结构化表单。

## 16. 测试与验证方案

### 16.1 单元测试

建议新增或扩展：

- `tests/lib/article-data.test.ts`
  - 旧文章兼容。
  - 新字段解析。
  - 非法 kind/status 回退或拒绝策略。
  - slug 冲突检测。

- `tests/lib/frontmatter.test.ts`
  - 旧 frontmatter 解析。
  - 新 frontmatter 解析。
  - 嵌套 sourceLinks/revisionNotes。
  - 导出字段顺序。
  - 非法 YAML 错误。

- `tests/lib/templates.test.ts`
  - 模板 id 唯一。
  - 默认模板存在。
  - 每个模板 kind/status 合法。
  - requiredSections 在 content 中能找到。

- `tests/lib/article-quality.test.ts`
  - 标题为空 blocking。
  - 教程缺验证 warning。
  - 研究长文缺参考资料 warning。
  - 代码块缺语言 suggestion。

### 16.2 UI 测试

建议扩展：

- `tests/app/editor-blog-page.test.tsx`
  - 模板分组显示。
  - 按类型/状态筛选。
  - 草稿数量显示。

- 新增 `tests/app/editor-new-article-page.test.tsx`
  - 选择模板后初始化 kind/status/category。
  - 保存草稿不要求所有 warning 通过。
  - 发布时 blocking 生效。
  - 修改标题不覆盖已有 slug。

- 扩展 `tests/app/markdown-content.test.tsx`
  - 新文章元信息渲染组件。
  - 参考资料和修订记录展示。

### 16.3 集成/烟雾测试

本项目已有：

- `npm run smoke:public`
- `npm run smoke:editor:blog`
- `npm run smoke:ui`

建议新增覆盖：

- 新建短笔记模板。
- 新建教程模板。
- 保存草稿。
- 发布文章。
- 公开页确认可见。
- 草稿公开页不可见。

### 16.4 必跑命令

按项目当前 `package.json`，建议执行：

```bash
npm run lint
npm run typecheck
npm run test:run
npm run smoke:editor:blog
npm run smoke:public
```

如果只改模板和纯函数，最小验证可缩小为：

```bash
npm run lint
npm run typecheck
npm run test:run -- tests/lib/templates.test.ts tests/lib/article-quality.test.ts
```

## 17. 风险与控制

### 17.1 UI 复杂度风险

风险：

- 元数据字段太多，编辑器像后台表单。

控制：

- 把字段分优先级。
- 默认只展开发布信息和写作检查。
- 参考资料、修订记录、系列等放到折叠区。
- 不把所有高级字段都做成首屏必填。

### 17.2 写作压力风险

风险：

- 质量检查太强，会让作者不愿写短笔记。

控制：

- 保存草稿不被 warning 阻塞。
- TIL 和链接短评规则更轻。
- 只在发布时检查 blocking。
- 检查文案用建议语气，不做道德审判式提示。

### 17.3 数据兼容风险

风险：

- 扩展 Article 类型导致旧 JSON 读写异常。

控制：

- 所有新增字段可选。
- parser 对旧数据默认兼容。
- 单测覆盖旧数据。
- 不做自动批量迁移。

### 17.4 slug 风险

风险：

- 手动修改 slug 导致旧链接失效。

控制：

- slug 字段加提示。
- 如果文章已发布，修改 slug 需要二次确认。
- 后续可支持 alias/redirects，但第一版不做。

### 17.5 公开页信息密度风险

风险：

- 类型、状态、标签、时间、目录、相关文章全部展示后，文章页变吵。

控制：

- 顶部 meta 使用一行或两行轻量信息。
- 状态仅在非普通 published 时显示。
- 相关文章放在正文底部。
- 目录仅长文显示，短文不显示。

## 18. 非目标

本轮优化不做：

- 富文本编辑器。
- 多作者权限。
- 评论系统。
- newsletter 发送。
- 图片上传和媒体库。
- AI 自动生成文章。
- 完整版本历史 diff。
- 数据库迁移。
- 复杂工作流审批。

这些能力可能有价值，但不是当前根因。当前根因是内容类型、写作引导、公开发现和可信机制不足。

## 19. 最终建议

优先级建议：

1. 先升级模板内容，让作者马上能写出更好的文章。
2. 再做模板分组和质量检查，降低选择与发布成本。
3. 然后扩展 Article 元数据，把内容资产结构沉淀到数据层。
4. 最后改公开页，让读者真正受益于这些元数据。

最小可交付版本：

- 新模板体系。
- 模板分组。
- `kind/status/category/featured/series/slug/updatedDate` 可选字段。
- 草稿不公开。
- 文章页显示类型、日期、更新时间、标签、阅读时间。
- 归档页支持类型和分类筛选。

长期理想状态：

- 作者可以用短笔记保持更新，用深度模板沉淀资产，用资源清单维护导航，用精选入口引导新读者。
- 读者可以按时间、类型、主题、系列和精选路径找到内容。
- 每篇重要文章都有清晰来源、验证和修订痕迹。
- 本项目从“个人博客导航站”升级为“个人知识资产工作台”。

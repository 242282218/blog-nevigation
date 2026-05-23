# 项目深度分析记录

## 当前事实

- 项目实际技术栈是 Next.js 14、React 18、TypeScript、Tailwind CSS、Vitest、Docker，不是 Vue 3。
- 代码已经迁入 `src/`，种子内容位于 `content/seeds/`，公共资源位于 `public/`。
- 编辑器运行时数据通过 `BLOG_DATA_ROOT` 写入服务器磁盘，文章文件为
  `articles/articles.json`，导航文件为 `navigation/tools.json`。
- 现有备份 API 已使用版本化 envelope，并可选择同步 Cloudflare R2。
- CI 会执行 lint、type check、Vitest、Docker build，并可手动触发服务器部署。

## 结构判断

现有 `src/app`、`src/lib`、`content/seeds`、`tests`、`deploy` 分层是合理的。
继续大规模搬动源码目录收益不高，反而会增加路由、测试和部署风险。

本轮结构优化集中在迁移边界：

- 服务器运行时数据收敛到单一 `data/` 目录。
- Compose 挂载整个数据根，而不是分别挂载 `articles/` 和 `navigation/`。
- 离线迁移通过脚本导出和导入同一套备份 envelope。
- `data/` 加入 `.gitignore`，避免把运行时数据提交到仓库。

## 数据流判断

推荐继续保持 local-first JSON：

- 个人站点是单写者模型，JSON 易检查、易复制、易手工修复。
- 本地磁盘读写不会让公开页面依赖 R2 可用性。
- R2 适合作为远端镜像和灾备，不适合作为当前主数据源。

需要后续升级到数据库的触发条件：

- 多用户同时编辑。
- 需要权限审计、历史版本、回滚 diff。
- 导航和文章规模增长到 JSON 全量读写成为瓶颈。

## 部署迁移判断

新的服务器迁移边界是：

```text
compose.prod.yaml
.env
data/
```

推荐迁移路径：

1. 停旧容器。
2. 复制旧服务器部署目录下的 `data/`。
3. 在新服务器放置同一份 `.env` 和 `compose.prod.yaml`。
4. `docker compose -f compose.prod.yaml up -d`。

备选迁移路径：

1. 旧服务器运行 `npm run data:export -- ./data ./output/blog-navigation-backup.json`。
2. 新服务器运行 `npm run data:import -- ./output/blog-navigation-backup.json ./data`。
3. 如启用 R2，也可在编辑中心执行云端恢复。

## UI 判断

参考 `D:\PROJECT_ZZZZZZZZZ\设计美学研究` 后，适合本项目的方向是：

- Claude / OpenAI / Notion 的温暖知识感。
- Vercel / shadcn 的结构纪律。
- 只把等宽字体用于命令、路径、计数和元信息。
- 内容标题、长文本和卡片主体回到无衬线，提高中文阅读质量。
- 卡片圆角收敛到 8px，减少模板化大圆角。

不采用的方向：

- 全暗色工程控制台：对长文阅读不友好。
- 全手绘拼贴：记忆点强，但会削弱导航和编辑器的工具效率。
- 大面积玻璃和渐变：和内容型个人站不匹配，且可读性风险高。

## 本轮增量执行

当前仓库没有 `.zread/wiki/current`，因此本轮以源码、既有计划文档和
`D:\PROJECT_ZZZZZZZZZ\设计美学研究\Web设计知识库` 作为事实来源继续审计。

架构优化集中在 UI shell 边界，而不是继续大规模搬目录：

- 根布局新增路由感知 `AppShell`，公开站点继续使用公共 Header 和受限内容宽度，
  `/editor/*` 则脱离公开站点容器，避免编辑工作台被公共导航和 `max-w-6xl`
  约束挤压。
- 编辑区新增 `EditorShell`，统一 TopBar、Main、Panel、Button、输入框和入口卡片，
  把 `/editor`、登录页、博客管理、导航管理和文章编辑页的重复样式收敛到同一处。
- 公共页移除“section 外壳卡片里再放列表卡片”的层级，最近文章、年份归档和导航分类改为章节标题 + 独立列表/网格。
- Markdown 工具栏移除 emoji，改用 lucide 图标；编辑区旧蓝/紫强调色收敛到暖色 accent 和语义状态色。
- 移动端编辑 TopBar 改为标题与操作区分行，避免操作按钮挤压标题不可见。
- 文章数据契约抽到纯共享模块 `article-data`，服务端存储、备份恢复、文章 API
  和客户端 hook 复用同一套 Article 校验，避免前后端数据契约漂移。
- 公开文章页和编辑预览抽到共享 `MarkdownContent`，统一 GFM、sanitize 和代码高亮路径；
  删除旧的未引用 `code-highlight` 模块，避免保留第二套高亮实现。
- 文章正文样式从 GitHub/mono 倾向调整为暖色阅读样式，标题回到 sans，
  代码块、引用、表格和行内代码使用同一套暖色 token。

## 本轮验证

- `npm run lint -- --fix`
- `npx tsc --noEmit --incremental false --pretty false`
- `npm run test:run`
- `npm run build`
- `scripts/test/verify-public-ui.py` 覆盖首页、博客、导航的桌面和移动视口。
- 额外 Playwright 检查 `/editor/login` 登录后进入 `/editor`、`/editor/blog`、
  `/editor/navigation` 的桌面和移动视口，无横向溢出和控制台错误。
- `scripts/test/verify-public-ui.py` 已扩展覆盖文章详情页
  `/posts/2025-02-28-react-performance-optimization`。

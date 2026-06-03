# Blog Navigation

[![Docker Build & Publish](https://github.com/242282218/blog-nevigation/actions/workflows/docker-deploy.yml/badge.svg?branch=main)](https://github.com/242282218/blog-nevigation/actions/workflows/docker-deploy.yml)
[![UI Smoke](https://github.com/242282218/blog-nevigation/actions/workflows/ui-smoke.yml/badge.svg?branch=main)](https://github.com/242282218/blog-nevigation/actions/workflows/ui-smoke.yml)

个人技术博客和工具导航站，基于 Next.js App Router 构建，内置受服务端口令保护的 `/editor` 内容编辑器。适合自托管个人主页、技术笔记和常用链接导航。

## 特性

- 公开博客、文章详情、导航目录和站点设置
- 服务端编辑器认证、CSRF、防暴力登录和搜索限流
- 种子内容与运行时数据分离，便于开源代码和私有内容共存
- 本地 JSON 数据、Cloudflare R2 备份、GitHub 加密备份
- Docker standalone 构建、GHCR 发布和服务器拉取式部署
- Vitest 单元测试、架构测试和 Playwright UI smoke

## 技术栈

Next.js 15、React 18、TypeScript strict mode、Tailwind CSS、Vitest、Docker。运行环境要求 Node.js >= 22.12.0 和 npm 11。

## 快速开始

```bash
git clone https://github.com/242282218/blog-nevigation.git
cd blog-nevigation
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

默认访问 `http://localhost:3000`，编辑器入口是 `/editor`。

最小本地配置：

```env
EDITOR_ACCESS_TOKEN=local-dev-only-secret
BLOG_DATA_ROOT=./data
COOKIE_SECURE=false
TRUSTED_PROXY_IPS=
```

## 数据边界

仓库只提交应用代码和默认种子内容：

- `content/seeds/`：默认文章和导航数据，会随仓库提交。
- `BLOG_DATA_ROOT`：编辑器写入的运行时文章、导航和设置，不应提交。
- `data/`：本地或生产常用运行时数据目录，已被忽略。
- `.env*`：密钥、端口、备份配置，已被忽略。

未配置 `BLOG_DATA_ROOT` 时，站点只读取 `content/seeds/`。不要把生产 `data/` 当缓存删除，迁移前先备份 `.env` 和 `data/`。

## 常用命令

```bash
npm run check      # 环境文件检查、lint、类型检查、单元测试
npm run build      # Next.js standalone 构建
npm run start      # 启动 standalone 产物，需先 build
npm run smoke:ui   # 需要已有服务和 Playwright 依赖
```

数据脚本：

```bash
npm run data:export -- ./data ./output/blog-navigation-backup.json
npm run data:import -- ./output/blog-navigation-backup.json ./data
npm run data:verify -- ./data
```

## 部署与备份

推荐部署方式是推送 `main` 后由 GitHub Actions 构建并发布 GHCR 镜像，服务器通过 `deploy/git-deploy.sh` 拉取部署文件和镜像。服务器不需要执行 `npm install`、`npm run build` 或 `docker build`。

Cloudflare R2 备份以服务器本地 `BLOG_DATA_ROOT` 为主数据源。`/editor/settings` 中的 `data/settings/cloudflare-r2.json` 一旦存在，会完整优先于 `.env` 中的 R2 变量。启用 R2 时默认要求配置 `R2_BACKUP_ENCRYPTION_KEY`。

详细文档：

- [服务器部署](docs/deploy/服务器部署.md)
- [数据迁移](docs/deploy/数据迁移.md)
- [Cloudflare R2 备份](docs/deploy/Cloudflare-R2备份.md)
- [GitHub 加密备份](docs/deploy/GitHub加密备份.md)
- [Docker 补充说明](docs/deploy/Docker补充说明.md)

## 目录

```text
src/                 Next.js App Router、API routes、业务代码
content/seeds/       默认文章和导航种子数据
tests/               Vitest 测试
scripts/data/        数据导入、导出、校验、备份脚本
scripts/test/        Playwright UI smoke 脚本
deploy/              生产 Compose 和部署脚本
docs/deploy/         部署和迁移文档
```

## 许可证

MIT License. See [LICENSE](LICENSE).

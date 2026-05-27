# Blog Navigation

[![Docker Build & Publish](https://github.com/242282218/blog-nevigation/actions/workflows/docker-deploy.yml/badge.svg?branch=main)](https://github.com/242282218/blog-nevigation/actions/workflows/docker-deploy.yml)
[![UI Smoke](https://github.com/242282218/blog-nevigation/actions/workflows/ui-smoke.yml/badge.svg?branch=main)](https://github.com/242282218/blog-nevigation/actions/workflows/ui-smoke.yml)

Blog Navigation 是一个面向个人技术博客和常用工具导航的 Next.js 应用。它把公开站点、服务端编辑器、运行时 JSON 数据、Docker 部署和远端备份放在同一个仓库里，适合自托管个人知识库或技术主页。

代码以 MIT 协议开源。仓库只包含种子内容和应用代码，真实运行时数据、密钥和本地环境文件不应提交。

## 功能

- 博客文章、导航目录和站点设置的公开展示
- `/editor` 后台编辑器，使用服务端口令和会话 Cookie 保护
- 种子内容与运行时数据分离，便于开源仓库和私有内容共存
- 文章 frontmatter、来源链接、修订记录和发布状态校验
- Cloudflare R2 远端备份与 GitHub 加密备份脚本
- Docker standalone 构建、GHCR 镜像发布和服务器拉取式部署
- Vitest 单元测试、架构测试、Playwright UI 冒烟测试

## 技术栈

- Next.js 15 App Router
- React 18
- TypeScript strict mode
- Tailwind CSS
- Vitest
- Playwright Python smoke tests
- Docker / Docker Compose
- Node.js >= 22.12.0，npm 11

## 数据模型

项目明确区分两类数据：

| 位置 | 用途 | 是否提交 |
| --- | --- | --- |
| `content/seeds/` | 默认文章和导航数据，用于空环境启动 | 是 |
| `BLOG_DATA_ROOT` | 编辑器写入的运行时文章、导航和设置 | 否 |
| `data/` | 本地或生产常用的 `BLOG_DATA_ROOT` 目录名 | 否 |
| `.env.local` / `.env` | 本地和生产密钥、端口、备份配置 | 否 |

未配置 `BLOG_DATA_ROOT` 时，站点只读取 `content/seeds/`，编辑器不会把变更写入服务器磁盘。Docker 生产部署默认使用 `/var/lib/blog-navigation` 作为容器内运行时数据目录。

不要把生产 `data/` 当缓存删除。迁移服务器时先备份 `.env` 和 `data/`。

## 本地开发

```bash
git clone https://github.com/242282218/blog-nevigation.git
cd blog-nevigation
nvm use
npm ci
```

创建 `.env.local`：

```env
EDITOR_ACCESS_TOKEN=local-dev-only-secret
BLOG_DATA_ROOT=./data
COOKIE_SECURE=false
TRUSTED_PROXY_IPS=
```

启动开发服务：

```bash
npm run dev
```

默认访问 `http://localhost:3000`，编辑器入口是 `http://localhost:3000/editor`。

## 常用命令

```bash
npm run lint
npm run typecheck
npm run test:run
npm run check
npm run build
npm run start
```

说明：

- `npm run check` 会依次执行环境文件检查、lint、类型检查和单元测试。
- `npm run build` 只负责 Next.js 构建，提交前仍应运行 `npm run check`。
- `npm run start` 启动 standalone 产物，需先运行 `npm run build`。

UI 冒烟测试需要已有服务：

```bash
BASE_URL=http://127.0.0.1:3000 npm run smoke:public
BASE_URL=http://127.0.0.1:3000 EDITOR_LOGIN_SECRET=local-dev-only-secret npm run smoke:editor
```

## 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `EDITOR_ACCESS_TOKEN` | 编辑器访问口令；配置后优先使用环境变量认证 | - |
| `EDITOR_RUNTIME_AUTH_SETUP_TOKEN` | 未配置固定口令时，用于首次初始化运行时口令 | - |
| `EDITOR_ALLOW_RUNTIME_AUTH_SETUP` | 是否允许无初始化密钥的首次运行时初始化；生产不建议开启 | `false` |
| `BLOG_DATA_ROOT` | 运行时文章、导航、设置数据目录 | 未配置时只使用种子数据 |
| `APP_PORT` | Docker 生产宿主机端口 | `3000` |
| `COOKIE_SECURE` | 是否只通过 HTTPS 发送编辑器会话 Cookie；生产环境始终强制安全 Cookie | Docker 生产默认 `true` |
| `TRUSTED_PROXY_IPS` | 可信反向代理 IP，逗号分隔；配置后登录和搜索限流按真实客户端 IP 分桶 | - |
| `R2_BACKUP_ENABLED` | 是否启用 Cloudflare R2 远端备份 | `false` |
| `R2_ACCOUNT_ID` | Cloudflare Account ID | - |
| `R2_BUCKET` | R2 Bucket 名称 | - |
| `R2_ACCESS_KEY_ID` | R2 S3 API Access Key | - |
| `R2_SECRET_ACCESS_KEY` | R2 S3 API Secret Key | - |
| `R2_PREFIX` | R2 对象前缀 | `blog-navigation` |
| `R2_ENDPOINT` | 自定义 S3 endpoint | - |
| `R2_SNAPSHOT_ON_WRITE` | 每次编辑保存都写入时间快照 | `false` |
| `R2_BACKUP_ENCRYPTION_KEY` | R2 备份加密密钥，32 字节 base64 或 hex；启用 R2 时默认必填 | - |
| `R2_ALLOW_PLAINTEXT_BACKUP` | 显式允许 R2 明文备份；仅用于兼容旧备份或临时迁移 | `false` |

## Docker 部署

推荐部署模型是 GitHub Actions 构建镜像并推送 GHCR，服务器只拉取部署文件和镜像：

```text
git push main -> GitHub Actions -> GHCR image
                                      |
                                      v
server deploy/git-deploy.sh -> git checkout -> docker compose pull/up
```

服务器不需要执行 `npm install`、`npm run build` 或 `docker build`。

首次部署示例：

```bash
mkdir -p /opt/blog-nevigation && cd /opt/blog-nevigation

curl -fsSL https://raw.githubusercontent.com/242282218/blog-nevigation/main/deploy/git-deploy.sh \
  -o /opt/blog-nevigation/git-deploy.sh
chmod +x /opt/blog-nevigation/git-deploy.sh

EDITOR_ACCESS_TOKEN="$(openssl rand -base64 32)"
cat > .env <<EOF
EDITOR_ACCESS_TOKEN=${EDITOR_ACCESS_TOKEN}
APP_PORT=3000
COOKIE_SECURE=true
TRUSTED_PROXY_IPS=
R2_BACKUP_ENABLED=false
EOF

DEPLOY_PATH=/opt/blog-nevigation /opt/blog-nevigation/git-deploy.sh
```

更新部署：

```bash
DEPLOY_PATH=/opt/blog-nevigation /opt/blog-nevigation/git-deploy.sh
```

更多部署细节见：

- [服务器部署](docs/deploy/server.md)
- [数据迁移](docs/deploy/migration.md)
- [Cloudflare R2 备份](docs/deploy/cloudflare-r2.md)
- [GitHub 加密备份](docs/deploy/github-backup.md)
- [Docker 补充说明](DOCKER.md)

## 备份与恢复

Cloudflare R2 备份以服务器本地 `BLOG_DATA_ROOT` 为主数据源。启用后：

- 每次编辑保存会同步 `latest/backup.json` 到 R2。
- 在编辑中心点击“同步云端”会额外写入时间快照。
- `/editor/settings` 中的 `data/settings/cloudflare-r2.json` 一旦存在，会完整优先于 `.env` 中的 R2 变量。
- 启用 R2 时默认必须配置 `R2_BACKUP_ENCRYPTION_KEY`；只有显式设置 `R2_ALLOW_PLAINTEXT_BACKUP=true` 才会写入明文备份。

本地备份包：

```bash
npm run data:export -- ./data ./output/blog-navigation-backup.json
npm run data:import -- ./output/blog-navigation-backup.json ./data
npm run data:verify -- ./data
```

可选 GitHub 加密备份：

```bash
GITHUB_BACKUP_ENCRYPTION_KEY='replace-with-a-long-random-secret' npm run data:backup:github -- ./data
GITHUB_BACKUP_ENCRYPTION_KEY='replace-with-a-long-random-secret' npm run data:restore:encrypted -- ./output/github-backups/<backup>.enc.json ./data
```

备份包包含文章、导航和站点设置；不包含 `data/settings/cloudflare-r2.json` 或 R2 密钥。

## 目录结构

```text
src/                         Next.js App Router、API routes、业务代码
content/seeds/               默认文章和导航种子数据
public/                      静态资源
tests/                       Vitest 测试
scripts/data/                运行时数据导入、导出、校验、备份脚本
scripts/test/                Playwright UI 冒烟脚本
deploy/                      生产 Compose 和 Git 部署脚本
docs/deploy/                 部署和迁移文档
docs/plans/                  设计和实施记录
.github/workflows/           CI、Docker 构建和 UI smoke 工作流
```

## 贡献

提交前至少运行：

```bash
npm run check
```

涉及公开页面或编辑器工作流时，再运行对应 smoke test。请不要提交 `.env*`、`data/`、`.next/`、`output/`、`coverage/`、`node_modules/` 或任何真实备份。

## 许可证

MIT License. See [LICENSE](LICENSE).

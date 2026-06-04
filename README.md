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

## Docker 部署教程

生产发布以 Docker 镜像为准。推送 `main` 后，GitHub Actions 构建镜像并发布到 GHCR；服务器只执行 `docker compose pull` 和 `docker compose up -d`。生产服务器不需要安装 Node.js 依赖，也不需要执行 `npm run build` 或 `docker build`。

发布链路：

```text
git push origin main
  -> GitHub Actions: Docker Build & Publish
  -> ghcr.io/242282218/blog-nevigation
  -> server: docker compose pull
  -> server: docker compose up -d
```

### 1. GitHub 发布 Docker 镜像

推送到 `main` 后，等待 GitHub Actions 的 `Docker Build & Publish` 成功。成功后 GHCR 会发布这些标签：

```text
ghcr.io/242282218/blog-nevigation:latest
ghcr.io/242282218/blog-nevigation:main
ghcr.io/242282218/blog-nevigation:main-<7-char-sha>
ghcr.io/242282218/blog-nevigation:v<package-version>
ghcr.io/242282218/blog-nevigation:v<package-version>-build.<run-number>
```

简单部署可以使用 `latest` 或 `main`。更稳妥的生产部署建议把 `.env` 里的 `DEPLOY_IMAGE` 固定为 `v<package-version>`、`main-<7-char-sha>` 或 `@sha256:<digest>`，避免镜像标签漂移。

### 2. 首次 Docker 部署

服务器只需要 Docker、Docker Compose plugin，以及 `curl` 或 `wget`。

```bash
mkdir -p /opt/blog-nevigation/data
cd /opt/blog-nevigation

curl -fsSL https://raw.githubusercontent.com/242282218/blog-nevigation/main/deploy/compose.prod.yaml \
  -o compose.yaml

EDITOR_ACCESS_TOKEN="$(openssl rand -base64 32)"

cat > .env <<EOF
DEPLOY_IMAGE=ghcr.io/242282218/blog-nevigation:latest
EDITOR_ACCESS_TOKEN=${EDITOR_ACCESS_TOKEN}
APP_PORT=3000
NEXT_PUBLIC_SITE_URL=https://your-domain.example
COOKIE_SECURE=true
TRUSTED_PROXY_IPS=
R2_BACKUP_ENABLED=false
EOF

docker compose --env-file .env -f compose.yaml pull
docker compose --env-file .env -f compose.yaml up -d
```

如果 GHCR package 不是 public，先在服务器登录 GHCR：

```bash
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

`NEXT_PUBLIC_SITE_URL` 必须填写生产公网地址，用于 metadata、robots 和 sitemap。本地或纯 HTTP 内网测试可以临时设置 `COOKIE_SECURE=false`，公网 HTTPS 环境必须保持 `COOKIE_SECURE=true`。

`TRUSTED_PROXY_IPS` 填应用前一层反向代理的直接来源 IP。配置后，登录和搜索限流才会信任 `X-Forwarded-*` 头。只有容器直接接收客户端流量时才留空。

### 3. 发布新 Docker 版本

如果 `.env` 使用 `latest` 或 `main` 浮动标签，更新流程是：

```bash
cd /opt/blog-nevigation
docker compose --env-file .env -f compose.yaml pull
docker compose --env-file .env -f compose.yaml up -d --force-recreate
docker image prune -f
```

如果 `.env` 固定了版本标签，先改 `DEPLOY_IMAGE`，再拉取和重启：

```bash
cd /opt/blog-nevigation
sed -i 's#^DEPLOY_IMAGE=.*#DEPLOY_IMAGE=ghcr.io/242282218/blog-nevigation:v2.0.1#' .env
docker compose --env-file .env -f compose.yaml pull
docker compose --env-file .env -f compose.yaml up -d --force-recreate
```

### 4. 部署后检查

```bash
cd /opt/blog-nevigation
docker compose --env-file .env -f compose.yaml ps
docker compose --env-file .env -f compose.yaml logs --tail=100 app
HEALTHCHECK_PORT=$(docker compose --env-file .env -f compose.yaml port app 3000 | awk -F: 'END {print $NF}')
curl -I "http://127.0.0.1:${HEALTHCHECK_PORT:-3000}/"
```

成功标准：容器处于运行状态，日志没有持续重启或配置错误，公开页面可访问，`/editor` 可登录。

### 5. 数据和备份

生产运行时数据在服务器部署目录的 `./data`，容器内路径是 `/var/lib/blog-navigation`。迁移服务器时，至少备份 `.env` 和 `data/`。

Cloudflare R2 只是远端灾备镜像，本地 `BLOG_DATA_ROOT` 仍是主数据源。`/editor/settings` 保存的 `data/settings/cloudflare-r2.json` 一旦存在，会完整优先于 `.env` 中的 R2 变量。启用 R2 时默认要求配置 `R2_BACKUP_ENCRYPTION_KEY`，或在设置页生成/保存备份加密密钥。

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

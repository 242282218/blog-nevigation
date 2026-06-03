# Docker 补充说明

本文只说明本地 Docker 和 Compose 使用方式。生产部署主路径见 [服务器部署](服务器部署.md)。生产服务器推荐拉取 GitHub Actions 构建好的 GHCR 镜像，不推荐在服务器上执行 `docker build`。

## 适用场景

适用于：

- 本地验证 Docker 镜像能否启动。
- 本地用 Compose 检查容器挂载和环境变量。
- 理解运行时数据目录和容器内路径的关系。

不适用于完整生产部署。生产环境应使用 [deploy/compose.prod.yaml](../../deploy/compose.prod.yaml) 和 [deploy/git-deploy.sh](../../deploy/git-deploy.sh)。

## 本地构建镜像

```bash
docker build -t blog-navigation .
```

该命令用于本地验证镜像构建。生产镜像由 GitHub Actions 构建并发布到 GHCR。

## 本地运行容器

```bash
EDITOR_ACCESS_TOKEN="$(openssl rand -base64 32)"

docker run -p 127.0.0.1:3000:3000 \
  -e EDITOR_ACCESS_TOKEN="${EDITOR_ACCESS_TOKEN}" \
  -e BLOG_DATA_ROOT=/var/lib/blog-navigation \
  -e COOKIE_SECURE=false \
  -e R2_BACKUP_ENABLED=false \
  blog-navigation
```

本地 HTTP 测试需要 `COOKIE_SECURE=false`。公开生产环境应使用 HTTPS，并设置 `COOKIE_SECURE=true`。

## 本地 Compose

```bash
cp .env.example .env
docker compose up --build
```

根目录 Compose 文件默认把编辑器 Cookie 视为 HTTPS-only。`.env.example` 为本地 HTTP 测试设置了 `COOKIE_SECURE=false`。公网服务器请使用 [deploy/compose.prod.yaml](../../deploy/compose.prod.yaml)。

Compose 使用单个 bind mount：

```text
./data:/var/lib/blog-navigation
```

运行时编辑器数据保存在仓库外的 `data/` 目录中，可以通过复制 `data/` 迁移。公开博客文章和编辑器文章共享容器内路径 `/var/lib/blog-navigation/articles`。

`EDITOR_ACCESS_TOKEN` 登录会生成随机会话，并把会话状态写入 `BLOG_DATA_ROOT`。多个应用副本只有在挂载同一个数据目录时才能共享编辑器会话；否则应使用粘性路由，或每个数据目录只运行一个副本。

## 便携数据备份

```bash
npm run data:export -- ./data ./output/blog-navigation-backup.json
npm run data:import -- ./output/blog-navigation-backup.json ./data
npm run data:verify -- ./data
```

该方式适合本地迁移和临时备份。完整迁移流程见 [数据迁移](数据迁移.md)。

## Cloudflare R2 备份

Docker 本身不改变 R2 的配置规则。需要远端备份时，在 `.env` 中配置 R2，或启动后通过 `/editor/settings` 保存 R2 配置。

最小变量示例：

```env
R2_BACKUP_ENABLED=true
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_BUCKET=your-r2-bucket
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_PREFIX=blog-navigation
R2_SNAPSHOT_ON_WRITE=false
R2_BACKUP_ENCRYPTION_KEY=<32-byte-base64-or-hex-key>
R2_ALLOW_PLAINTEXT_BACKUP=false
```

本地文件仍是主数据源。R2 保存 `latest/backup.json` 和手动时间戳快照，用于迁移和恢复。

启用 R2 时默认必须配置 `R2_BACKUP_ENCRYPTION_KEY`。只有明确进行一次性明文迁移时，才设置 `R2_ALLOW_PLAINTEXT_BACKUP=true`。

详细说明见 [Cloudflare R2 备份](Cloudflare-R2备份.md)。

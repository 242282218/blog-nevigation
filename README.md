# 个人技术博客导航

基于 Next.js 的个人技术博客和常用链接导航，包含受服务端口令保护的编辑器。

## 本地开发

```bash
git clone https://github.com/242282218/blog-nevigation.git
cd blog-nevigation
nvm use
npm ci --legacy-peer-deps
```

创建 `.env.local`：

```env
EDITOR_ACCESS_TOKEN=local-dev-only-secret
# 可选：需要本地持久化编辑数据时再配置
BLOG_DATA_ROOT=./data
```

启动开发环境：

```bash
npm run dev
```

默认访问 `http://localhost:3000`。

说明：

- 不配置 `BLOG_DATA_ROOT` 时，站点使用种子数据运行，编辑器数据仅保存在当前浏览器，不会写入服务器磁盘。
- Docker 部署已默认设置 `BLOG_DATA_ROOT=/var/lib/blog-navigation`。
- 推荐用 `EDITOR_ACCESS_TOKEN` 固定编辑口令；如果不想把编辑口令放进 `.env`，可配置一次性 `EDITOR_RUNTIME_AUTH_SETUP_TOKEN` 后在 `/editor/login` 初始化运行时口令。

## 部署

推送到 `main` 会自动通过 GitHub Actions 构建镜像并推送到 GHCR。
详细部署文档见：

- [服务器部署](docs/deploy/server.md)
- [数据迁移](docs/deploy/migration.md)
- [Cloudflare R2 备份](docs/deploy/cloudflare-r2.md)
- [GitHub 加密备份](docs/deploy/github-backup.md)

### 首次部署

生产部署目录只需要保留 `compose.prod.yaml`、`.env` 和 `data/`。迁移服务器时优先整体复制这三项，其中 `data/` 是唯一运行时数据边界。

```bash
mkdir -p /opt/blog-nevigation && cd /opt/blog-nevigation

# 下载生产 compose 文件
curl -LO https://raw.githubusercontent.com/242282218/blog-nevigation/main/deploy/compose.prod.yaml

# 创建 .env，使用随机编辑器访问口令
EDITOR_ACCESS_TOKEN="$(openssl rand -base64 32)"
cat > .env <<EOF
EDITOR_ACCESS_TOKEN=${EDITOR_ACCESS_TOKEN}
COOKIE_SECURE=true
EOF

# 创建数据目录并启动
mkdir -p data
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d
```

### 更新部署

```bash
cd /opt/blog-nevigation
export DEPLOY_IMAGE=ghcr.io/242282218/blog-nevigation:main-<commit-sha>
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d
```

> 镜像标签格式：`latest`、`main`、`main-<7位commit短哈希>`

### 查看状态

```bash
docker compose -f compose.prod.yaml ps
docker compose -f compose.prod.yaml logs --tail=100 app
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `EDITOR_ACCESS_TOKEN` | 编辑器访问口令；配置后优先使用环境变量认证 | — |
| `EDITOR_RUNTIME_AUTH_SETUP_TOKEN` | 首次运行时初始化密钥；仅用于未配置 `EDITOR_ACCESS_TOKEN` 时初始化编辑口令 | — |
| `EDITOR_ALLOW_RUNTIME_AUTH_SETUP` | 是否允许无初始化密钥的首次运行时初始化；生产环境不建议开启 | `false` |
| `EDITOR_AUTH_INTERNAL_ORIGIN` | 生产 middleware 校验运行时会话时使用的可信内部地址 | Docker 默认 `http://127.0.0.1:3000` |
| `APP_PORT` | 宿主机端口 | `3000` |
| `COOKIE_SECURE` | 是否只通过 HTTPS 发送编辑器会话 Cookie；公网生产保持 `true`，仅内网 HTTP 调试设为 `false` | Docker 默认 `true` |
| `R2_BACKUP_ENABLED` | 是否启用 Cloudflare R2 远端备份 | `false` |
| `R2_ACCOUNT_ID` | Cloudflare Account ID | — |
| `R2_BUCKET` | R2 Bucket 名称 | — |
| `R2_ACCESS_KEY_ID` | R2 S3 API Access Key | — |
| `R2_SECRET_ACCESS_KEY` | R2 S3 API Secret Key | — |
| `R2_PREFIX` | R2 对象前缀 | `blog-navigation` |
| `R2_ENDPOINT` | 自定义 S3 endpoint（通常留空） | — |
| `R2_SNAPSHOT_ON_WRITE` | 每次编辑保存都写入时间快照 | `false` |

### Cloudflare R2 备份

默认以服务器本地 `BLOG_DATA_ROOT` 为主数据源。启用 R2 后，每次编辑保存会同步
`latest/backup.json` 到 R2；在编辑中心点击“同步云端”会额外写入时间快照。
R2 可在 `/editor/settings` 的 Cloudflare R2 面板配置；一旦
`data/settings/cloudflare-r2.json` 存在，它会完整优先于 `.env` 中的 R2 变量，
不会按字段回退到 `.env`。

R2 对象结构：

```text
blog-navigation/latest/backup.json
blog-navigation/snapshots/YYYY/MM/DD/<timestamp>-manual-sync.json
```

迁移服务器时优先复制部署目录下的 `data/`。如果本地数据不可用，
在新服务器配置同一组 R2 变量后登录 `/editor`，点击“云端恢复”即可从最新 R2 备份恢复。

也可以用仓库内置脚本生成和恢复可迁移备份包：

```bash
npm run data:export -- ./data ./output/blog-navigation-backup.json
npm run data:import -- ./output/blog-navigation-backup.json ./data
npm run data:verify -- ./data
```

生产目录没有源码和 `package.json` 时，在源码检出目录运行校验并传入生产数据路径：

```bash
npm run data:verify -- /opt/blog-nevigation/data
```

备份包包含文章、导航和站点设置；旧备份缺少站点设置时会使用默认设置恢复。
备份包不会包含 `data/settings/cloudflare-r2.json` 或 R2 密钥；完整迁移服务器时复制
`data/` 和 `.env`，只做内容迁移时在新服务器重新配置 R2。
导入和 `data:verify` 会校验导航数据契约：分类 slug 不能重复，工具链接必须是 HTTPS，
且每个工具至少包含一个标签。
导入后会生成 `data/manifest.json`，用于记录文章、导航和站点设置的修订号与内容哈希。

可选 GitHub 加密备份：

```bash
GITHUB_BACKUP_ENCRYPTION_KEY='replace-with-a-long-random-secret' npm run data:backup:github -- ./data
GITHUB_BACKUP_ENCRYPTION_KEY='replace-with-a-long-random-secret' npm run data:restore:encrypted -- ./output/github-backups/<backup>.enc.json ./data
```

## 常用命令

```bash
npm run check
npm run build
npm run start
```

`npm run start` runs the generated standalone server. Run `npm run build`
first so `.next/standalone/server.js` exists.

本地或测试机已有服务运行时，可执行 UI 冒烟脚本：

```bash
BASE_URL=http://127.0.0.1:3000 npm run smoke:public
BASE_URL=http://127.0.0.1:3000 EDITOR_LOGIN_SECRET=local-dev-only-secret npm run smoke:editor
```

公开页面冒烟脚本会在 `UI Smoke` GitHub Actions 工作流中自动运行，并在失败时上传
`output/playwright` 截图和服务日志用于定位。

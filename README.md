# Blog Navigation

个人技术博客和常用链接导航站，基于 Next.js 构建，内置受服务端口令保护的内容编辑器。

## 技术栈

- Next.js 15 App Router
- React 18
- TypeScript
- Tailwind CSS
- Vitest
- Docker / Docker Compose
- npm 11，Node.js >= 22.12.0

## 数据模型

项目把“仓库内种子内容”和“运行时编辑数据”分开管理：

- `content/seeds/`：随仓库提交的默认文章和导航数据。
- `BLOG_DATA_ROOT`：编辑器写入的运行时数据目录。
- 不配置 `BLOG_DATA_ROOT` 时，站点只读取种子内容，编辑器变更不会写入服务器磁盘。
- Docker 生产部署默认使用 `/var/lib/blog-navigation` 作为运行时数据目录。

不要把生产 `data/` 当缓存删除。迁移服务器时优先复制 `.env` 和 `data/`。

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
# 可选：需要本地持久化编辑数据时再配置
BLOG_DATA_ROOT=./data
```

启动开发服务：

```bash
npm run dev
```

默认访问 `http://localhost:3000`。编辑器入口是 `/editor`。

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

- `npm run check` 等价于 lint、typecheck、单元测试。
- `npm run build` 不负责 ESLint 检查，提交前仍需运行 `npm run check`。
- `npm run start` 启动 standalone 产物，需先运行 `npm run build`。

UI 冒烟测试需要已有服务：

```bash
BASE_URL=http://127.0.0.1:3000 npm run smoke:public
BASE_URL=http://127.0.0.1:3000 EDITOR_LOGIN_SECRET=local-dev-only-secret npm run smoke:editor
```

## 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `EDITOR_ACCESS_TOKEN` | 编辑器访问口令；配置后优先使用环境变量认证 | — |
| `EDITOR_RUNTIME_AUTH_SETUP_TOKEN` | 未配置固定口令时，用于首次初始化运行时口令 | — |
| `EDITOR_ALLOW_RUNTIME_AUTH_SETUP` | 是否允许无初始化密钥的首次运行时初始化；生产不建议开启 | `false` |
| `BLOG_DATA_ROOT` | 运行时文章、导航、设置数据目录 | 未配置时只使用种子数据 |
| `APP_PORT` | Docker 生产宿主机端口 | `3000` |
| `COOKIE_SECURE` | 是否只通过 HTTPS 发送编辑器会话 Cookie | Docker 生产默认 `true` |
| `TRUSTED_PROXY_IPS` | 可信反向代理 IP，逗号分隔；配置后登录和搜索限流按真实客户端 IP 分桶 | — |
| `R2_BACKUP_ENABLED` | 是否启用 Cloudflare R2 远端备份 | `false` |
| `R2_ACCOUNT_ID` | Cloudflare Account ID | — |
| `R2_BUCKET` | R2 Bucket 名称 | — |
| `R2_ACCESS_KEY_ID` | R2 S3 API Access Key | — |
| `R2_SECRET_ACCESS_KEY` | R2 S3 API Secret Key | — |
| `R2_PREFIX` | R2 对象前缀 | `blog-navigation` |
| `R2_ENDPOINT` | 自定义 S3 endpoint | — |
| `R2_SNAPSHOT_ON_WRITE` | 每次编辑保存都写入时间快照 | `false` |
| `R2_BACKUP_ENCRYPTION_KEY` | R2 备份加密密钥，32 字节 base64 或 hex；启用 R2 时默认必填，远端备份写入 AES-256-GCM 密文 | — |
| `R2_ALLOW_PLAINTEXT_BACKUP` | 显式允许 R2 明文备份；仅用于兼容旧备份或临时迁移 | `false` |

## Docker 和生产部署

推荐部署模型：GitHub Actions 负责构建 Docker 镜像并推送 GHCR，服务器只拉取部署文件和镜像，然后重启 Compose 服务。

```text
git push main -> GitHub Actions -> GHCR image
                                      |
                                      v
server deploy/git-deploy.sh -> git checkout -> docker compose pull/up
```

服务器不需要执行 `npm install`、`npm run build` 或 `docker build`。

详细文档：

- [服务器部署](docs/deploy/server.md)
- [数据迁移](docs/deploy/migration.md)
- [Cloudflare R2 备份](docs/deploy/cloudflare-r2.md)
- [GitHub 加密备份](docs/deploy/github-backup.md)
- [Docker 补充说明](DOCKER.md)

### GitHub 镜像构建

推送到 `main` 或 `master` 会触发 [.github/workflows/docker-deploy.yml](.github/workflows/docker-deploy.yml)：

1. 安装依赖并执行高危依赖审计。
2. 运行 lint、类型检查和单元测试。
3. 构建 Docker 镜像并做容器冒烟检查。
4. 非 PR 事件推送镜像到 `ghcr.io/242282218/blog-nevigation`。

默认镜像标签：

- `latest`
- `main`
- `main-<7位commit短哈希>`

如果 GHCR Package 不是公开包，服务器需先登录：

```bash
echo "<github-token>" | docker login ghcr.io -u "<github-user>" --password-stdin
```

### 首次服务器部署

生产部署目录保留 `.env`、`data/`、`compose.prod.yaml` 和受控 Git checkout `repo/`。

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

### 更新部署

```bash
DEPLOY_PATH=/opt/blog-nevigation /opt/blog-nevigation/git-deploy.sh
```

脚本默认部署当前 Git commit 对应的 `main-<7位commit短哈希>` 镜像，并在镜像尚未发布到 GHCR 时短暂重试。需要临时部署分支浮动标签时：

```bash
IMAGE_TAG=main DEPLOY_PATH=/opt/blog-nevigation /opt/blog-nevigation/git-deploy.sh
```

查看状态：

```bash
cd /opt/blog-nevigation
docker compose -f compose.prod.yaml ps
docker compose -f compose.prod.yaml logs --tail=100 app
```

部署脚本变量：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `DEPLOY_PATH` | 服务器部署目录 | `/opt/blog-nevigation` |
| `REPO_URL` | 部署文件来源仓库 | `https://github.com/242282218/blog-nevigation.git` |
| `DEPLOY_BRANCH` | 要部署的 Git 分支 | `main` |
| `REPO_PATH` | 受控 Git checkout 目录 | `$DEPLOY_PATH/repo` |
| `IMAGE_REPOSITORY` | GHCR 镜像仓库 | `ghcr.io/242282218/blog-nevigation` |
| `IMAGE_TAG` | 要部署的镜像标签；不设置时用当前 commit 标签 | `$DEPLOY_BRANCH-<7位commit短哈希>` |
| `PULL_ATTEMPTS` | 拉镜像重试次数 | `12` |
| `PULL_RETRY_SECONDS` | 拉镜像重试间隔 | `10` |
| `HEALTHCHECK_TIMEOUT_SECONDS` | 部署后健康检查超时 | `90` |

## 备份和恢复

Cloudflare R2 备份以服务器本地 `BLOG_DATA_ROOT` 为主数据源。启用后：

- 每次编辑保存会同步 `latest/backup.json` 到 R2。
- 在编辑中心点击“同步云端”会额外写入时间快照。
- `/editor/settings` 中的 `data/settings/cloudflare-r2.json` 一旦存在，会完整优先于 `.env` 中的 R2 变量。
- 启用 R2 时默认必须配置 `R2_BACKUP_ENCRYPTION_KEY`；只有显式设置 `R2_ALLOW_PLAINTEXT_BACKUP=true` 才会写入明文备份。

R2 对象结构：

```text
blog-navigation/latest/backup.json
blog-navigation/snapshots/YYYY/MM/DD/<timestamp>-manual-sync.json
```

本地备份包命令：

```bash
npm run data:export -- ./data ./output/blog-navigation-backup.json
npm run data:import -- ./output/blog-navigation-backup.json ./data
npm run data:verify -- ./data
```

生产目录没有源码和 `package.json` 时，在源码检出目录校验生产数据：

```bash
npm run data:verify -- /opt/blog-nevigation/data
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

## 清理规则

以下目录或文件是本地生成物，可安全重建，不应提交：

- `.next/`
- `dist/`
- `output/`
- `node_modules/`
- `coverage/`
- `tsconfig.tsbuildinfo`
- `scripts/test/__pycache__/`

生产或本地真实 `data/` 不是缓存，删除前必须确认已备份。

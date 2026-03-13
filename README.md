# blog-navigation

基于 Next.js 的博客和导航站点，包含受 `EDITOR_ACCESS_TOKEN` 保护的编辑器。

## 本地开发

```bash
git clone https://github.com/242282218/blog-nevigation.git
cd blog-nevigation
npm install
```

创建 `.env.local`：

```env
EDITOR_ACCESS_TOKEN=change-me
# 可选：需要本地持久化编辑数据时再配置
BLOG_DATA_ROOT=/absolute/path/to/blog-navigation-data
```

启动开发环境：

```bash
npm run dev
```

默认访问 `http://localhost:3000`。

说明：

- 不配置 `BLOG_DATA_ROOT` 时，站点使用种子数据运行，编辑器数据不会持久化到磁盘。
- Docker 部署已默认设置 `BLOG_DATA_ROOT=/var/lib/blog-navigation`。

## 部署

推送到 `main` 会自动通过 GitHub Actions 构建镜像并推送到 GHCR。

### 首次部署

```bash
mkdir -p /opt/blog-nevigation && cd /opt/blog-nevigation

# 下载生产 compose 文件
curl -LO https://raw.githubusercontent.com/242282218/blog-nevigation/main/deploy/compose.prod.yaml

# 创建 .env，填写编辑器访问密码
echo 'EDITOR_ACCESS_TOKEN=change-me' > .env

# 创建数据目录并启动
mkdir -p articles navigation
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
| `EDITOR_ACCESS_TOKEN` | 编辑器访问密码（必填） | — |
| `APP_PORT` | 宿主机端口 | `3000` |
| `COOKIE_SECURE` | HTTPS 下设为 `true` | `false` |

## 常用命令

```bash
npm run build
npm run start
npm run test:run
```

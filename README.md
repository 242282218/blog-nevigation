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

- 不配置 `BLOG_DATA_ROOT` 时，站点可以运行，但编辑器数据不会持久化到磁盘。
- Docker 部署已默认设置 `BLOG_DATA_ROOT=/var/lib/blog-navigation`。

## 部署

### 方式一：源码部署

适合直接在服务器构建镜像。

```bash
git clone https://github.com/242282218/blog-nevigation.git
cd blog-nevigation
cp .env.example .env
```

编辑 `.env`，至少填写：

```env
EDITOR_ACCESS_TOKEN=change-me
```

创建数据目录并启动：

```bash
mkdir -p /root/blog-navigation/articles /root/blog-navigation/navigation
docker compose up -d --build
```

查看状态：

```bash
docker compose ps
docker compose logs -f
```

### 方式二：GHCR 镜像部署

适合直接使用 GitHub Actions 构建好的镜像。

```bash
mkdir -p /opt/blog-nevigation
cd /opt/blog-nevigation
curl -L https://raw.githubusercontent.com/242282218/blog-nevigation/main/deploy/compose.prod.yaml -o compose.prod.yaml
```

创建 `.env`：

```env
EDITOR_ACCESS_TOKEN=change-me
```

创建数据目录并启动：

```bash
mkdir -p articles navigation
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d
```

查看状态：

```bash
docker compose -f compose.prod.yaml ps
docker compose -f compose.prod.yaml logs -f
```

说明：

- 默认镜像：`ghcr.io/242282218/blog-nevigation:latest`
- 如需修改宿主机端口，再额外在 `.env` 中增加 `APP_PORT=8080`

## CI/CD

- 推送到 `main` 或 `master` 会自动构建并推送镜像到 `ghcr.io/242282218/blog-nevigation`
- 当前可直接使用的标签通常包括 `latest`、`main` 和对应提交的短 SHA 标签
- 如需使用 GitHub Actions 远程部署服务器，还需要配置仓库 secrets：
  `DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_SSH_KEY`、`DEPLOY_PATH`

## 常用命令

```bash
npm run build
npm run start
npm run test:run
```

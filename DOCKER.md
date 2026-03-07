# Docker 部署指南

## 快速开始

### 本地构建和运行

```bash
# 构建镜像
docker build -t blog-nevigation .

# 运行容器
docker run -p 3000:3000 -e EDITOR_ACCESS_TOKEN=your-secret blog-nevigation
```

### 使用 Docker Compose

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

## GitHub Container Registry

### 拉取镜像

```bash
# 登录 GitHub Container Registry（使用 GitHub 用户名和 PAT）
echo YOUR_GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# 拉取镜像
docker pull ghcr.io/242282218/blog-nevigation:latest

# 运行
docker run -d \
  --name blog-nevigation \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e EDITOR_ACCESS_TOKEN=your-secret \
  --restart unless-stopped \
  ghcr.io/242282218/blog-nevigation:latest
```

### 使用 Docker Compose 运行远程镜像

```yaml
version: '3.8'

services:
  app:
    image: ghcr.io/242282218/blog-nevigation:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - EDITOR_ACCESS_TOKEN=your-secret
    restart: unless-stopped
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 服务端口 | `3000` |
| `EDITOR_ACCESS_TOKEN` | 编辑区登录口令，不配置则编辑区锁定 | 无 |

## 多平台支持

镜像支持以下平台：
- `linux/amd64`
- `linux/arm64`

## 自动构建

每次推送到 `main` 或 `master` 分支时，GitHub Actions 会自动：
1. 构建 Docker 镜像
2. 推送到 GitHub Container Registry
3. 生成多平台镜像
4. 为默认分支生成 `latest` 标签

手动触发：

```bash
gh workflow run docker-deploy.yml
```

镜像地址：`ghcr.io/242282218/blog-nevigation`

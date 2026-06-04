# Blog Navigation Docker 部署指南

[![Docker Build & Publish](https://github.com/242282218/blog-nevigation/actions/workflows/docker-deploy.yml/badge.svg?branch=main)](https://github.com/242282218/blog-nevigation/actions/workflows/docker-deploy.yml)

本项目生产发布只依赖 Docker 镜像。推送 `main` 后，GitHub Actions 会构建并发布镜像到 GHCR；服务器后续只需要 `docker pull` 和 `docker run` 获取版本更新。

## 镜像

默认使用最新稳定镜像：

```text
ghcr.io/242282218/blog-nevigation:latest
```

推送 `main` 后，GitHub Actions 会写入这些日常更新标签：

```text
ghcr.io/242282218/blog-nevigation:latest
ghcr.io/242282218/blog-nevigation:main
ghcr.io/242282218/blog-nevigation:main-<7-char-sha>
ghcr.io/242282218/blog-nevigation:v<package-version>-build.<run-number>
```

推送 Git tag `v<package-version>` 后，才会发布稳定版本标签：

```text
ghcr.io/242282218/blog-nevigation:v<package-version>
```

日常更新用 `latest`。需要回滚或锁定生产版本时，改用 `v<package-version>`、`main-<sha>`、`v<package-version>-build.<run-number>` 或镜像 digest。

## 首次部署

服务器需要 Docker、`curl`、`openssl`，以及一个反向代理负责公网 HTTPS。下面命令默认只监听本机 `127.0.0.1:3000`，适合放在 Nginx、Caddy 或 Cloudflare Tunnel 后面。

```bash
APP_DIR=/opt/blog-nevigation
CONTAINER_NAME=blog-navigation
IMAGE=ghcr.io/242282218/blog-nevigation:latest

mkdir -p "${APP_DIR}/data"
cd "${APP_DIR}"

EDITOR_ACCESS_TOKEN="$(openssl rand -base64 32)"

cat > "${APP_DIR}/.env" <<EOF
EDITOR_ACCESS_TOKEN=${EDITOR_ACCESS_TOKEN}
NEXT_PUBLIC_SITE_URL=https://your-domain.example
COOKIE_SECURE=true
TRUSTED_PROXY_IPS=
R2_BACKUP_ENABLED=false
EOF
chmod 600 "${APP_DIR}/.env"

docker pull "${IMAGE}"
docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true
docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  --init \
  --env-file "${APP_DIR}/.env" \
  -p 127.0.0.1:3000:3000 \
  -v "${APP_DIR}/data:/var/lib/blog-navigation" \
  "${IMAGE}"
```

如果要直接暴露端口，不走本机反向代理，把端口参数改成：

```bash
-p 3000:3000
```

如果 GHCR 包不是 public，先登录：

```bash
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

## 更新到最新版本

重复执行下面命令即可拉取最新 `latest` 并重建容器。`data/` 挂载目录不会被删除。

```bash
APP_DIR=/opt/blog-nevigation
CONTAINER_NAME=blog-navigation
IMAGE=ghcr.io/242282218/blog-nevigation:latest

docker pull "${IMAGE}"
docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true
docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  --init \
  --env-file "${APP_DIR}/.env" \
  -p 127.0.0.1:3000:3000 \
  -v "${APP_DIR}/data:/var/lib/blog-navigation" \
  "${IMAGE}"

docker image prune -f
```

## 固定版本或回滚

把 `IMAGE` 改成目标版本即可。

```bash
IMAGE=ghcr.io/242282218/blog-nevigation:v2.0.1
```

也可以使用 GitHub Actions 输出的 digest：

```bash
IMAGE=ghcr.io/242282218/blog-nevigation@sha256:<digest>
```

然后重新执行“更新到最新版本”里的 `docker pull`、`docker rm -f`、`docker run` 命令。

## 发布稳定版本

普通 `main` 提交只更新 `latest` 和构建标签。需要发布稳定版本时，确保 `package.json` 版本号已经是目标版本，然后推送同名 Git tag：

```bash
git tag v2.0.1
git push origin v2.0.1
```

GitHub Actions 会校验 Git tag 必须匹配 `package.json` 版本号。校验通过后才发布：

```text
ghcr.io/242282218/blog-nevigation:v2.0.1
```

## 常用管理命令

```bash
docker ps --filter name=blog-navigation
docker logs --tail=100 blog-navigation
docker restart blog-navigation
docker inspect --format '{{.Config.Image}} {{.Image}}' blog-navigation
curl -I http://127.0.0.1:3000/
```

停止服务：

```bash
docker rm -f blog-navigation
```

备份运行时数据：

```bash
tar -C /opt/blog-nevigation -czf blog-navigation-data.tgz data .env
```

## 环境变量

必须按生产环境修改：

```env
EDITOR_ACCESS_TOKEN=<long-random-secret>
NEXT_PUBLIC_SITE_URL=https://your-domain.example
COOKIE_SECURE=true
TRUSTED_PROXY_IPS=
R2_BACKUP_ENABLED=false
```

`NEXT_PUBLIC_SITE_URL` 填公网访问地址，用于 metadata、robots 和 sitemap。公网 HTTPS 环境保持 `COOKIE_SECURE=true`；只有本地或临时 HTTP 测试才设为 `false`。

`TRUSTED_PROXY_IPS` 填直接连接应用容器的反向代理 IP。配置后，登录和搜索限流才会信任 `X-Forwarded-*` 请求头。

## 可选 R2 备份

R2 只是远端灾备镜像，服务器本地 `/opt/blog-nevigation/data` 仍是主数据源。需要用环境变量启用时，把下面内容追加到 `.env`：

```env
R2_BACKUP_ENABLED=true
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_BUCKET=<bucket>
R2_ACCESS_KEY_ID=<r2-access-key-id>
R2_SECRET_ACCESS_KEY=<r2-secret-access-key>
R2_PREFIX=blog-navigation
R2_SNAPSHOT_ON_WRITE=false
R2_BACKUP_ENCRYPTION_KEY=<32-byte-base64-or-hex-key>
R2_ALLOW_PLAINTEXT_BACKUP=false
```

也可以在 `/editor/settings` 保存 R2 配置。保存后，`/opt/blog-nevigation/data/settings/cloudflare-r2.json` 会完整优先于 `.env` 中的 R2 变量。

## 发布入口

Docker 发布记录查看：

```text
https://github.com/242282218/blog-nevigation/actions/workflows/docker-deploy.yml
```

镜像包地址：

```text
https://github.com/242282218/blog-nevigation/pkgs/container/blog-nevigation
```

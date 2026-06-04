# Blog Navigation Docker 部署指南

[![Docker Build & Publish](https://github.com/242282218/blog-nevigation/actions/workflows/docker-deploy.yml/badge.svg?branch=main)](https://github.com/242282218/blog-nevigation/actions/workflows/docker-deploy.yml)

GHCR 镜像已公开，可以直接拉取：

```bash
docker pull ghcr.io/242282218/blog-nevigation:latest
```

下面命令在 Linux 服务器用 `root` 复制粘贴执行即可。脚本会自动安装 Docker、拉取 `latest` 镜像、生成登录口令、创建数据目录，并用 `docker run` 启动服务。

端口规则固定为：

```text
服务器对外端口：7199
容器内部端口：3000
docker run 映射：-p 7199:3000
```

不要使用旧命令 `-p 3000:3000`。如果 Docker 报 `Bind for 0.0.0.0:3000 failed: port is already allocated`，说明运行的还是旧端口命令，直接复制下面“一键部署”或“更新 latest”脚本重新执行。

## 一键部署

```bash
sh -s <<'EOF'
set -eu

APP_DIR=/opt/blog-nevigation
CONTAINER_NAME=blog-navigation
IMAGE=ghcr.io/242282218/blog-nevigation:latest
APP_PORT=7199

if [ "$(id -u)" -ne 0 ]; then
  echo "请切换 root 后重新执行。"
  exit 1
fi

install_base_tools() {
  if command -v curl >/dev/null 2>&1 && command -v openssl >/dev/null 2>&1; then
    return
  fi

  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y curl openssl ca-certificates
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y curl openssl ca-certificates
  elif command -v yum >/dev/null 2>&1; then
    yum install -y curl openssl ca-certificates
  elif command -v apk >/dev/null 2>&1; then
    apk add --no-cache curl openssl ca-certificates
  else
    echo "请先安装 curl、openssl、ca-certificates。"
    exit 1
  fi
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    return
  fi

  curl -fsSL https://get.docker.com | sh
}

start_docker() {
  if command -v systemctl >/dev/null 2>&1; then
    systemctl enable --now docker >/dev/null 2>&1 || true
  elif command -v service >/dev/null 2>&1; then
    service docker start >/dev/null 2>&1 || true
  fi
}

detect_public_ip() {
  PUBLIC_IP="$(curl -fsS --max-time 5 https://api.ipify.org || true)"

  if [ -z "${PUBLIC_IP}" ]; then
    PUBLIC_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi

  if [ -z "${PUBLIC_IP}" ]; then
    PUBLIC_IP=127.0.0.1
  fi
}

sync_existing_site_url_port() {
  if grep -q '^NEXT_PUBLIC_SITE_URL=http://.*:3000$' "${APP_DIR}/.env"; then
    sed -i "s#^\(NEXT_PUBLIC_SITE_URL=http://.*\):3000\$#\1:${APP_PORT}#" "${APP_DIR}/.env"
  fi
}

create_env_file() {
  mkdir -p "${APP_DIR}/data"

  if [ -f "${APP_DIR}/.env" ]; then
    chmod 600 "${APP_DIR}/.env"
    sync_existing_site_url_port
    return
  fi

  EDITOR_ACCESS_TOKEN="$(openssl rand -base64 32 | tr -d '\n')"
  SITE_URL="http://${PUBLIC_IP}:${APP_PORT}"

  cat > "${APP_DIR}/.env" <<ENVEOF
EDITOR_ACCESS_TOKEN=${EDITOR_ACCESS_TOKEN}
NEXT_PUBLIC_SITE_URL=${SITE_URL}
COOKIE_SECURE=false
TRUSTED_PROXY_IPS=
R2_BACKUP_ENABLED=false
ENVEOF
  chmod 600 "${APP_DIR}/.env"
}

run_container() {
  docker pull "${IMAGE}"
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  docker run -d \
    --name "${CONTAINER_NAME}" \
    --restart unless-stopped \
    --init \
    --env-file "${APP_DIR}/.env" \
    -p "${APP_PORT}:3000" \
    -v "${APP_DIR}/data:/var/lib/blog-navigation" \
    "${IMAGE}"
}

print_result() {
  SITE_URL="$(grep '^NEXT_PUBLIC_SITE_URL=' "${APP_DIR}/.env" | cut -d= -f2-)"
  EDITOR_ACCESS_TOKEN="$(grep '^EDITOR_ACCESS_TOKEN=' "${APP_DIR}/.env" | cut -d= -f2-)"

  echo
  echo "部署完成"
  echo "访问地址：${SITE_URL}"
  echo "编辑器地址：${SITE_URL}/editor"
  echo "编辑器登录口令：${EDITOR_ACCESS_TOKEN}"
  echo "配置文件：${APP_DIR}/.env"
  echo "数据目录：${APP_DIR}/data"
  echo
  docker ps --filter "name=${CONTAINER_NAME}"
}

install_base_tools
install_docker
start_docker
detect_public_ip
create_env_file
run_container
print_result
EOF
```

默认访问地址是：

```text
http://服务器公网IP:7199
```

安全组或防火墙需要放行 `7199/tcp`。

## 更新 latest

后续更新直接复制粘贴执行下面整段，会保留 `/opt/blog-nevigation/.env` 和 `/opt/blog-nevigation/data`：

```bash
sh -s <<'EOF'
set -eu

APP_DIR=/opt/blog-nevigation
CONTAINER_NAME=blog-navigation
IMAGE=ghcr.io/242282218/blog-nevigation:latest
APP_PORT=7199

if [ "$(id -u)" -ne 0 ]; then
  echo "请切换 root 后重新执行。"
  exit 1
fi

if [ ! -f "${APP_DIR}/.env" ]; then
  echo "缺少 ${APP_DIR}/.env，请先执行一键部署。"
  exit 1
fi

if grep -q '^NEXT_PUBLIC_SITE_URL=http://.*:3000$' "${APP_DIR}/.env"; then
  sed -i "s#^\(NEXT_PUBLIC_SITE_URL=http://.*\):3000\$#\1:${APP_PORT}#" "${APP_DIR}/.env"
fi

mkdir -p "${APP_DIR}/data"
docker pull "${IMAGE}"
docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  --init \
  --env-file "${APP_DIR}/.env" \
  -p "${APP_PORT}:3000" \
  -v "${APP_DIR}/data:/var/lib/blog-navigation" \
  "${IMAGE}"

docker image prune -f
docker ps --filter "name=${CONTAINER_NAME}"
EOF
```

## 查看口令

```bash
grep '^EDITOR_ACCESS_TOKEN=' /opt/blog-nevigation/.env
```

## R2 备份

R2 备份启动后在 `/editor/settings` 里配置。保存后配置文件位于 `/opt/blog-nevigation/data/settings/cloudflare-r2.json`，它会完整优先于 `.env` 中的 R2 变量。

## 常用管理

```bash
docker ps --filter name=blog-navigation
docker logs --tail=100 blog-navigation
docker restart blog-navigation
docker inspect --format '{{.Config.Image}} {{.Image}}' blog-navigation
curl -I http://127.0.0.1:7199/
```

## 端口冲突修复

如果出现下面错误：

```text
Bind for 0.0.0.0:3000 failed: port is already allocated
```

原因是运行了旧命令 `-p 3000:3000`。本项目现在固定使用宿主机 `7199`，容器内部仍是 `3000`。直接复制执行：

```bash
set -eu

APP_DIR=/opt/blog-nevigation
CONTAINER_NAME=blog-navigation
IMAGE=ghcr.io/242282218/blog-nevigation:latest
APP_PORT=7199

mkdir -p "${APP_DIR}/data"

if [ ! -f "${APP_DIR}/.env" ]; then
  EDITOR_ACCESS_TOKEN="$(openssl rand -base64 32 | tr -d '\n')"
  PUBLIC_IP="$(curl -fsS --max-time 5 https://api.ipify.org || hostname -I | awk '{print $1}')"

  cat > "${APP_DIR}/.env" <<EOF
EDITOR_ACCESS_TOKEN=${EDITOR_ACCESS_TOKEN}
NEXT_PUBLIC_SITE_URL=http://${PUBLIC_IP}:${APP_PORT}
COOKIE_SECURE=false
TRUSTED_PROXY_IPS=
R2_BACKUP_ENABLED=false
EOF
  chmod 600 "${APP_DIR}/.env"
fi

if grep -q '^NEXT_PUBLIC_SITE_URL=http://.*:3000$' "${APP_DIR}/.env"; then
  sed -i "s#^\(NEXT_PUBLIC_SITE_URL=http://.*\):3000\$#\1:${APP_PORT}#" "${APP_DIR}/.env"
fi

docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
docker pull "${IMAGE}"
docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  --init \
  --env-file "${APP_DIR}/.env" \
  -p "${APP_PORT}:3000" \
  -v "${APP_DIR}/data:/var/lib/blog-navigation" \
  "${IMAGE}"

docker ps --filter "name=${CONTAINER_NAME}"
curl -I "http://127.0.0.1:${APP_PORT}/"
```

停止服务：

```bash
docker rm -f blog-navigation
```

备份数据和配置：

```bash
tar -C /opt/blog-nevigation -czf blog-navigation-data.tgz data .env
```

恢复数据和配置：

```bash
mkdir -p /opt/blog-nevigation
tar -C /opt/blog-nevigation -xzf blog-navigation-data.tgz
```

## 固定版本

默认使用：

```text
ghcr.io/242282218/blog-nevigation:latest
```

如果要固定版本，把部署脚本或更新脚本里的 `IMAGE` 改成指定标签或 digest：

```bash
IMAGE=ghcr.io/242282218/blog-nevigation:v2.0.1
IMAGE=ghcr.io/242282218/blog-nevigation@sha256:<digest>
```

## 发布记录

```text
https://github.com/242282218/blog-nevigation/actions/workflows/docker-deploy.yml
https://github.com/242282218/blog-nevigation/pkgs/container/blog-nevigation
```

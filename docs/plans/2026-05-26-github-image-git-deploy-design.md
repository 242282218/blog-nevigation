# GitHub 镜像构建与 Git 部署脚本设计

## 目标

生产部署以 GitHub Actions 构建 Docker 镜像为唯一构建入口，服务器只负责拉取仓库部署文件、拉取 GHCR 镜像并重启 Docker Compose 服务。

## 推荐方案

采用“GitHub 构建镜像 + 服务器 Git 部署脚本”：

1. GitHub Actions 在 `main` 或 `master` 推送后执行检查、构建 Docker 镜像并发布到 GHCR。
2. 服务器运行 `deploy/git-deploy.sh`。
3. 脚本在 `DEPLOY_PATH/repo` 维护一个受控 Git checkout。
4. 脚本把 `deploy/compose.prod.yaml` 复制到 `DEPLOY_PATH/compose.prod.yaml`，保持 `data/`、`.env` 和 Compose 文件同级。
5. 脚本默认部署当前 Git commit 对应的 `main-<7位commit>` 镜像标签，避免服务器本地构建。

## 取舍

- 优点：服务器无需 Node.js 构建环境；镜像来自 CI，部署结果更可复现；运行时数据仍集中在 `DEPLOY_PATH/data`。
- 成本：服务器需要安装 `git`、`docker compose`，并能访问 GitHub 与 GHCR。
- 风险控制：脚本部署后执行 HTTP 健康检查；失败时尝试回滚到上一版容器镜像。

## 验证

- `bash -n deploy/git-deploy.sh`
- `git diff --check`
- 检查 README 中首次部署、更新部署、脚本变量说明是否完整。

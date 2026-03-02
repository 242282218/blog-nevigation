---
name: docker-ci-workflow
description: 创建和管理 Docker GitHub Actions CI/CD 工作流。当用户需要设置 Docker 自动构建测试、镜像推送、安全扫描、多平台构建或 Docker 部署自动化时触发。支持 GitHub Registry (ghcr.io)、Docker Hub、多阶段构建缓存优化。
---

# Docker CI Workflow

创建 GitHub Actions 工作流，自动化 Docker 镜像的构建、测试和部署。

## 快速开始

### 基础构建测试

创建 `.github/workflows/docker-ci.yml`：

```yaml
name: Docker CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build
        uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          tags: ${{ github.repository }}:latest
```

### 构建并推送到 GitHub Registry

```yaml
name: Docker Build & Push

on:
  push:
    branches: [main]

jobs:
  build-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## 工作流模式

根据需求选择合适的模式：

| 模式 | 用途 | 参考 |
|------|------|------|
| **基础构建** | PR/push 时验证构建 | `assets/docker-ci.yml` |
| **镜像推送** | 自动推送到镜像仓库 | [workflow-patterns.md](references/workflow-patterns.md#镜像推送) |
| **多平台构建** | linux/amd64, linux/arm64 | [workflow-patterns.md](references/workflow-patterns.md#多平台构建) |
| **安全扫描** | Trivy 漏洞扫描 | [workflow-patterns.md](references/workflow-patterns.md#安全扫描) |
| **镜像大小检查** | 限制镜像体积 | [workflow-patterns.md](references/workflow-patterns.md#镜像大小检查) |

## 核心 Actions

| Action | 用途 |
|--------|------|
| `docker/setup-buildx-action@v3` | 设置 Buildx 构建器 |
| `docker/build-push-action@v6` | 构建并推送镜像 |
| `docker/login-action@v3` | 登录镜像仓库 |
| `docker/metadata-action@v5` | 生成镜像标签和标签 |
| `docker/setup-qemu-action@v3` | 设置 QEMU (多平台构建) |

## 缓存策略

使用 GitHub Actions 缓存加速构建：

```yaml
- name: Build and push
  uses: docker/build-push-action@v6
  with:
    context: .
    push: true
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

## 镜像仓库配置

### GitHub Container Registry (推荐)

```yaml
- name: Login to GHCR
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

### Docker Hub

```yaml
- name: Login to Docker Hub
  uses: docker/login-action@v3
  with:
    username: ${{ secrets.DOCKERHUB_USERNAME }}
    password: ${{ secrets.DOCKERHUB_TOKEN }}
```

## 生成工作流

使用脚本快速生成工作流文件：

```bash
python scripts/generate_workflow.py --type build --output .github/workflows/docker-ci.yml
python scripts/generate_workflow.py --type push --registry ghcr --output .github/workflows/docker-push.yml
python scripts/generate_workflow.py --type full --output .github/workflows/docker-full.yml
```

## 最佳实践

1. **使用 Buildx** - 启用 BuildKit 和缓存
2. **多阶段构建** - 减少最终镜像体积
3. **标签策略** - 使用 `docker/metadata-action` 自动生成
4. **安全扫描** - 在推送前扫描漏洞
5. **资源限制** - 设置 job 超时和并发限制

# blog-navigation

基于 Next.js 构建的博客与导航站点，内置编辑器、本地开发流程和 Docker 部署支持。

## 快速开始

```bash
npm install
npm run dev
```

打开浏览器访问 `http://localhost:3000`。

## 目录结构

```text
src/                  Next.js 应用源码和共享库
├── app/              Next.js App Router 页面和 API
│   ├── api/          API 路由
│   ├── blog/         博客页面
│   ├── editor/       编辑器页面
│   ├── navigation/   导航页面
│   └── components/   React 组件
├── lib/              工具函数和库
└── middleware.ts     中间件
content/seeds/        初始文章和导航数据（提交到 Git）
public/               静态资源
tests/                Vitest 测试套件
docs/                 项目文档和设计系统资源
```

## 运行时数据

- **本地开发**：在 `.env.local` 中设置 `BLOG_DATA_ROOT` 为项目外的绝对路径
- **Docker 部署**：数据存储在服务器 `/root/blog-navigation/` 目录

设置 `EDITOR_ACCESS_TOKEN` 环境变量以解锁编辑器路由。

---

## Docker 部署

### 方式一：Docker Compose（推荐）

#### 1. 克隆仓库

```bash
git clone https://github.com/242282218/blog-nevigation.git
cd blog-nevigation/blog-nevigation
```

#### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 编辑器访问令牌（必填，用于保护编辑器路由）
EDITOR_ACCESS_TOKEN=your-secure-token-here
```

#### 3. 创建数据目录

```bash
mkdir -p /root/blog-navigation/articles
mkdir -p /root/blog-navigation/navigation
```

#### 4. 启动服务

```bash
docker compose up -d --build
```

#### 5. 访问应用

- **主页**：http://localhost:3000
- **博客**：http://localhost:3000/blog
- **导航**：http://localhost:3000/navigation
- **编辑器登录**：http://localhost:3000/editor/login

#### 6. 常用命令

```bash
# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 重新构建
docker compose up -d --build
```

---

### 方式二：Docker 命令行

#### 1. 构建镜像

```bash
cd blog-nevigation
docker build -t blog-navigation:latest .
```

#### 2. 创建数据目录

```bash
mkdir -p /root/blog-navigation/articles
mkdir -p /root/blog-navigation/navigation
```

#### 3. 运行容器

```bash
docker run -d \
  --name blog-navigation \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e EDITOR_ACCESS_TOKEN=your-secure-token-here \
  -v /root/blog-navigation/articles:/var/lib/blog-navigation/articles \
  -v /root/blog-navigation/navigation:/var/lib/blog-navigation/navigation \
  --restart unless-stopped \
  blog-navigation:latest
```

#### 4. 管理容器

```bash
# 查看日志
docker logs -f blog-navigation

# 停止容器
docker stop blog-navigation

# 启动容器
docker start blog-navigation

# 删除容器
docker rm -f blog-navigation
```

---

### 方式三：使用 GitHub Container Registry

镜像自动构建并推送到 `ghcr.io`。

#### 1. 登录 GitHub Container Registry

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

#### 2. 拉取镜像

```bash
docker pull ghcr.io/242282218/blog-nevigation:latest
```

#### 3. 创建数据目录

```bash
mkdir -p /root/blog-navigation/articles
mkdir -p /root/blog-navigation/navigation
```

#### 4. 运行容器

```bash
docker run -d \
  --name blog-navigation \
  -p 3000:3000 \
  -e EDITOR_ACCESS_TOKEN=your-secure-token-here \
  -v /root/blog-navigation/articles:/var/lib/blog-navigation/articles \
  -v /root/blog-navigation/navigation:/var/lib/blog-navigation/navigation \
  --restart unless-stopped \
  ghcr.io/242282218/blog-nevigation:latest
```

---

## Docker 部署配置说明

### 环境变量

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `EDITOR_ACCESS_TOKEN` | 是 | - | 编辑器访问令牌，用于身份验证 |
| `BLOG_DATA_ROOT` | 否 | `/var/lib/blog-navigation` | 容器内数据存储路径 |
| `NODE_ENV` | 否 | `production` | 运行环境 |
| `PORT` | 否 | `3000` | 服务端口 |

### 数据持久化

Docker 部署使用**本地目录映射**，数据存储在服务器 `/root/blog-navigation/` 目录：

| 服务器路径 | 容器路径 | 说明 |
|------------|----------|------|
| `/root/blog-navigation/articles/` | `/var/lib/blog-navigation/articles/` | 文章数据（JSON 格式） |
| `/root/blog-navigation/navigation/` | `/var/lib/blog-navigation/navigation/` | 导航数据（JSON 格式） |

#### 数据管理

```bash
# 查看文章数据
ls -la /root/blog-navigation/articles/

# 查看导航数据
ls -la /root/blog-navigation/navigation/

# 备份所有数据
tar czf blog-backup-$(date +%Y%m%d).tar.gz -C /root blog-navigation

# 恢复数据
tar xzf blog-backup-20250101.tar.gz -C /root
```

#### 修改存储路径

如需使用其他目录，修改 `compose.yaml`：

```yaml
volumes:
  - /your/custom/path/articles:/var/lib/blog-navigation/articles
  - /your/custom/path/navigation:/var/lib/blog-navigation/navigation
```

或使用 Docker 命令：

```bash
docker run -d \
  --name blog-navigation \
  -p 3000:3000 \
  -e EDITOR_ACCESS_TOKEN=your-secure-token-here \
  -v /your/custom/path/articles:/var/lib/blog-navigation/articles \
  -v /your/custom/path/navigation:/var/lib/blog-navigation/navigation \
  --restart unless-stopped \
  blog-navigation:latest
```

### 多平台支持

镜像支持以下平台：

- `linux/amd64` - x86_64 架构
- `linux/arm64` - ARM64 架构（如 Apple Silicon、树莓派）

### 镜像优化

镜像采用多阶段构建优化体积：

- 基于 `node:20-alpine` 轻量镜像
- 使用 Next.js standalone 输出模式
- 非 root 用户运行，提升安全性
- 清理 npm 缓存和构建缓存

---

## 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务
npm run start

# 代码检查
npm run lint

# 运行测试
npm run test

# 测试覆盖率
npm run test:coverage
```

---

## 技术栈

- **框架**：Next.js 14 (App Router)
- **样式**：Tailwind CSS
- **动画**：Framer Motion
- **图标**：Lucide React
- **Markdown**：react-markdown + remark-gfm
- **代码高亮**：highlight.js
- **测试**：Vitest + Testing Library

---

## License

MIT

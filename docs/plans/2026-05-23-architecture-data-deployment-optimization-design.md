# Architecture, Data, and Deployment Optimization Design

## 目标

把项目优化成便宜、稳定、容易迁移的个人博客导航系统：

- 服务器部署简单，更新可回滚。
- 运行时数据有清晰边界，迁移时只需要复制少量文件。
- Cloudflare R2 用作低成本远端灾备。
- GitHub 保留源码、镜像构建记录，并可选做加密数据备份。
- 不为了“上云”强行牺牲当前 Next.js 文件系统运行模型。

## 当前事实

项目当前是 Next.js 14、React 18、TypeScript、Tailwind CSS、Vitest 和
Docker。生产构建使用 `output: 'standalone'`，运行时数据通过
`BLOG_DATA_ROOT` 写入服务器文件系统。

当前数据文件：

```text
data/
  articles/articles.json
  navigation/tools.json
  settings/site.json
  manifest.json
```

`manifest.json` 记录 articles、navigation、settings 的 revision、hash 和
updatedAt。编辑 API 已支持 revision 冲突检查，R2 备份已使用统一 envelope。

## 参考项目与约束

- Cloudflare R2：官方价格页说明 R2 按存储、Class A、Class B 操作计费，标准存储有
  10 GB-month、100 万 Class A、1000 万 Class B 的月度免费额度，直接从 R2 出网不收
  egress 费。适合做备份对象存储。
  <https://developers.cloudflare.com/r2/pricing/>
- Cloudflare R2 S3 API：R2 支持 S3 兼容 API，当前项目使用 `PutObject` 和
  `GetObject` 符合这个模型。
  <https://developers.cloudflare.com/r2/api/s3/api/>
- Next.js standalone：官方建议 `output: 'standalone'` 生成可独立部署的
  `.next/standalone`，适合 Docker 镜像。
  <https://nextjs.org/docs/app/api-reference/config/next-config-js/output>
- Cloudflare Workers + OpenNext：官方支持把 Next.js 部署到 Workers，但当前项目
  依赖 Node 文件系统写入，不能直接把 R2 当本地磁盘替换。
  <https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/>
- Decap CMS：Git-backed CMS 把内容变成 Git 工作流，适合强版本管理，但会把编辑保存
  变成 Git API/commit 流程，当前项目不需要这个复杂度。
  <https://decapcms.org/docs/intro/>
- PocketBase：生产建议强调单目录数据、停止服务后复制数据目录，以及 S3 兼容备份。
  这和本项目“一个 data 目录即迁移边界”的方向一致。
  <https://pocketbase.io/docs/going-to-production/>
- GitLab：对象存储数据不会自动进入常规备份，配置文件和 secrets 需要单独处理。
  这支持本项目把 R2 对象、运行数据 envelope、R2 凭据分成不同备份边界。
  <https://docs.gitlab.com/administration/backup_restore/backup_gitlab/>
- GitLab object storage：对象存储连接配置和各类对象 bucket 有明确边界，备份对象存储
  需要独立配置。
  <https://docs.gitlab.com/administration/object_storage/>
- Nextcloud：对象存储作为存储后端会影响备份与恢复策略，不应假设它等同于本地文件系统。
  <https://docs.nextcloud.com/server/latest/admin_manual/configuration_files/primary_storage.html>

## 方案对比

### 方案 A：VPS + 本地 JSON + R2 灾备

```text
GitHub main -> GitHub Actions -> GHCR image -> Docker Compose on server
                                                   |
                                                   v
                                           ./data as source of truth
                                                   |
                                      R2 latest + snapshots backup
```

优点：

- 和当前代码匹配，改造成本最低。
- 公开页面读取本地数据，不依赖 R2 在线。
- 迁移边界清楚：`compose.prod.yaml`、`.env`、`data/`。
- R2 成本对个人站点很低。

缺点：

- JSON 是单写者模型，不适合多人高并发编辑。
- 需要服务器磁盘备份纪律。

结论：推荐作为当前主方案。

### 方案 B：Cloudflare Workers + OpenNext + R2/D1

优点：

- 运维负担更低。
- 更贴近 Cloudflare 全托管生态。

缺点：

- 当前存储层直接使用 Node `fs`，需要先抽象 storage provider。
- R2 适合对象备份，不适合作为频繁读写的 JSON 主数据库。
- D1/SQLite schema、迁移、编辑器 API 都要重构。

结论：作为二期路线，不在当前阶段直接迁移。

### 方案 C：GitHub 作为内容数据库

优点：

- 每次内容变更天然有 Git 历史。
- 数据备份、diff、回滚能力强。

缺点：

- 编辑器要处理 GitHub OAuth、commit、冲突和发布延迟。
- 导航和设置这类运行时数据不适合频繁通过 Git commit 保存。

结论：只建议做“加密备份到私有仓库”，不建议把 GitHub 变成主数据源。

## 推荐架构

当前阶段采用方案 A：

```text
Cloudflare DNS/TLS/CDN
        |
        v
VPS / lightweight server
        |
        v
Docker Compose
        |
        +-- GHCR image: immutable app artifact
        +-- ./data: mutable runtime data
        +-- .env: deployment secrets

Backup:
        +-- R2 latest/backup.json
        +-- R2 snapshots/YYYY/MM/DD/*.json
        +-- optional GitHub encrypted backup artifact/repository
```

数据管理原则：

- `data/` 是唯一运行时迁移边界。
- `content/seeds/` 只保留初始化和 fallback 内容。
- R2 是灾备镜像，不是主数据库。
- GitHub 存源码和镜像构建记录；运行数据只以加密备份形式进入 GitHub。
- 所有导出、导入、R2 同步使用同一个 backup envelope。

## 已执行的小修正

- `.dockerignore` 排除 `data/` 和 `output/`，避免本地运行数据和导出包进入 Docker
  build context。
- GitHub Actions 部署健康检查改为读取 `docker compose port app 3000` 的实际映射端口，
  避免 `APP_PORT` 不是 3000 时误判失败。

## 后续实施清单

### P0：部署和数据边界

- 保持 `deploy/compose.prod.yaml` 为生产入口。
- 服务器部署目录固定为：

```text
compose.prod.yaml
.env
data/
```

- 迁移优先使用 `tar` 复制整个目录；不可直连时使用 `npm run data:export` 和
  `npm run data:import`。
- 每次迁移后必须运行 `npm run data:verify -- ./data`。

### P1：备份增强

- 已增加 `scripts/data/backup-to-github.mjs`：导出 backup envelope，使用环境变量密钥
  生成 AES-256-GCM 加密备份文件；配置 `GITHUB_BACKUP_REPO_PATH` 后可提交到本地私有
  备份仓库，配置 `GITHUB_BACKUP_PUSH=true` 后才会推送。
- 已增加 `scripts/data/restore-encrypted-backup.mjs`：从 GitHub 加密备份恢复到 `data/`，
  恢复后继续使用 manifest 校验。
- 增加服务器 cron 示例：

```text
daily: npm run data:export -> encrypted artifact -> R2 snapshot / GitHub backup
weekly: restore drill on temporary directory -> data:verify
```

- R2 保持 `latest/backup.json` + `snapshots/` 两级结构。

### P2：恢复原子性

已将 CLI 导入和编辑器备份恢复改为 staging restore：

1. 解析 backup envelope。
2. 写入临时目录。
3. 生成并校验 manifest。
4. 原子替换正式资源文件。
5. 替换失败时使用临时备份目录回滚已有文件。
6. 成功后再同步 R2 snapshot。

这样可以避免恢复中途失败导致半更新状态。

### P3：存储抽象

当需要迁移到 Cloudflare Workers/D1 或 SQLite 时，再引入 storage provider：

```text
StorageProvider
  readArticles()
  writeArticles()
  readNavigation()
  writeNavigation()
  readSettings()
  writeSettings()
  exportBackup()
  restoreBackup()
```

当前阶段不提前抽象，避免为单一存储制造复杂度。

## 升级到数据库的触发条件

只有满足以下条件之一，才建议从 JSON 升级：

- 多人同时编辑成为常态。
- 需要审计日志、细粒度回滚或差异对比。
- 文章和导航数据规模大到全量 JSON 读写明显变慢。
- 需要公开 API 给外部系统频繁写入。

优先级：

1. 服务器仍自托管：SQLite。
2. Cloudflare 原生：D1 + R2。
3. 成熟后台系统：PocketBase。

## 验收标准

- `npm run lint` 通过。
- `npx tsc --noEmit --incremental false --pretty false` 通过。
- `npm run test:run` 通过。
- `npm run build` 通过。
- `npm run data:verify -- ./data` 通过。
- Docker build context 不包含 `data/` 和 `output/`。
- GitHub Actions 部署健康检查不再硬编码宿主机端口 3000。

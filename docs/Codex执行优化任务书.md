# Codex执行优化任务书

生成日期：2026-06-07

用途：给后续 Codex coding agent 直接执行项目优化。本文不是摘要，而是执行入口。每个任务必须按“目标、范围、禁止事项、实施步骤、验证方式、完成标准”落地。

## 执行总原则

1. 先读相关代码和既有文档，再改文件。
2. 默认只做当前任务卡范围内的修改，不顺手重构相邻代码。
3. R2 远端备份必须保持明文 JSON，可下载后直接检查和恢复。
4. Docker 更新必须保留宿主机 `.env` 和 `data/`，更新前必须快照 `.env data`。
5. 涉及 Docker/GHCR 的验证优先走 GitHub Actions，不在本地构建发布镜像。
6. 每个任务完成后必须运行最小充分验证，并在回复中说明通过/失败。
7. 任何失败都要带回具体文件、命令、错误和下一步，不允许只说“失败了”。

## 必读文档

执行前按任务类型读取：

- 全局结论：`docs/项目全量审查报告.md`
- 外部参考：`docs/同类型开源项目对比研究.md`
- 架构改造：`docs/架构优化设计方案.md`
- 前端体验：`docs/前端体验优化设计方案.md`
- 数据安全：`docs/数据安全与备份恢复优化方案.md`
- 测试质量：`docs/测试与质量体系优化方案.md`
- Docker 发布：`docs/Docker与GitHub发布优化方案.md`
- 路线图：`docs/分阶段优化路线图.md`

## 通用验证命令

按改动范围选择，不要无意义跑超大验证：

```bash
npm run lint -- --fix
npm run typecheck
npm run test:coverage
npm run test:architecture
git diff --check
```

R2 或 Docker 相关改动必须额外检查：

```bash
rg "/var/lib/blog-navigation|\\.env data|data:/var/lib/blog-navigation" README.md compose.yaml deploy .github tests -n
```

说明：R2 相关改动必须按 `AGENTS.md` 的禁止项做回归搜索，确认没有把已移除的远端备份口令设计写回项目；上面的命令用于确认 Docker 数据保留约束仍存在。

## 任务优先级总览

| 优先级 | 任务 | 推荐执行时机 |
|---|---|---|
| P0 | Docker 更新行为级测试 | 立即 |
| P0 | R2 明文备份回归护栏 | 立即 |
| P1 | Docker 同源镜像 smoke | 发布前 |
| P1 | digest 部署与 `.last-good-digest` | 发布前 |
| P1 | Trivy 镜像扫描 | 发布前 |
| P1 | 前端对比度与表单错误语义 | 发布前 |
| P1 | R2 pending failed 状态 | 数据安全第一批 |
| P1 | snapshot 绑定 manifest/hash | 数据安全第一批 |
| P1 | manifest transaction | 数据安全第二批 |
| P2 | schemaVersion 与迁移 registry | 架构演进 |
| P2 | 文章工作流视图 | 体验优化 |
| P3 | 文章分文件存储 | 长期演进 |

## 任务卡 0：执行前审查

目标：确认当前工作区状态，避免覆盖用户改动。

范围：只读。

步骤：

1. 运行 `git status --short --branch`。
2. 运行 `git log --oneline -5`。
3. 阅读本任务卡对应的方案文档。
4. 用 `rg` 定位涉及文件。
5. 如果发现同文件已有用户未提交改动，先读 diff，再在其基础上修改。

完成标准：

- 明确本次要改哪些文件。
- 明确不会改哪些文件。
- 明确验证命令。

## 任务卡 1：Docker 更新行为级测试

目标：用自动化测试证明更新脚本不会覆盖 `.env` 和 `data/`。

范围：

- 新增 `tests/scripts/docker-update.test.ts` 或同等测试文件。
- 必要时小幅调整 `deploy/git-deploy.sh` 以支持测试注入，但不得改变生产行为。

禁止事项：

- 不得真实删除本机容器。
- 不得真实操作生产路径。
- 不得把 bind mount 改成匿名 volume。
- 不得覆盖 `.env`。

实施步骤：

1. 创建临时部署目录。
2. 写入 `.env` 和 `data/settings/site.json`。
3. 在临时 PATH 前置 fake `docker`、`git`、`tar`。
4. fake 命令只记录参数，不执行破坏性动作。
5. 执行部署脚本。
6. 断言 `.env` 内容未变。
7. 断言 `data/settings/site.json` 内容未变。
8. 断言 tar 参数包含 `.env data`。
9. 断言没有删除 `data` 的命令。

验证：

```bash
npm run test -- tests/scripts/docker-update.test.ts
npm run test:architecture
git diff --check
```

完成标准：

- 测试失败能准确指出破坏了 `.env` 或 `data/`。
- 当前实现测试通过。

## 任务卡 2：R2 明文备份回归护栏

目标：确保 R2 远端备份继续是明文 JSON。

范围：

- `tests/lib/r2-backup-storage.test.ts`
- `tests/app/setup-route.test.ts`
- `tests/app/cloudflare-r2-route.test.ts`
- `tests/architecture/repository-structure.test.ts`

禁止事项：

- 不得新增旧口令式字段。
- 不得新增旧口令式 UI。
- 不得把 R2 payload 包装成不可直接阅读的内容。

实施步骤：

1. 增强测试：上传 body 必须能直接 `JSON.parse`。
2. 增强测试：配置文件不包含历史口令类字段。
3. 增强测试：README/docs 不引导旧口令式远端备份。
4. 保留现有明文说明。

验证：

```bash
npm run test -- tests/lib/r2-backup-storage.test.ts tests/app/setup-route.test.ts tests/app/cloudflare-r2-route.test.ts
npm run test:architecture
git diff --check
```

完成标准：

- R2 上传体是可读 JSON。
- 下载后可直接恢复。
- 搜索不到已移除的远端备份口令设计相关文案。

## 任务卡 3：Docker 同源镜像 smoke

目标：让 CI 测试的镜像和最终推送镜像来自同一 Buildx 构建链路。

范围：

- `.github/workflows/docker-deploy.yml`
- 必要时调整 smoke 脚本。

禁止事项：

- 不得在 workflow 中删除服务器 `.env` 或 `data/`。
- 不得使用 `latest` 作为生产回滚依据。

实施步骤：

1. 用 `docker/build-push-action` `load: true` 构建测试镜像。
2. 使用该镜像运行 Docker smoke。
3. smoke 通过后再 push GHCR tags。
4. 保留 Buildx cache。
5. summary 输出镜像 digest。

验证：

- 推送到 GitHub 后检查 Docker Build & Publish workflow。
- 确认 smoke 日志中的 image tag 与 push 输入一致。

完成标准：

- 不再出现普通 `docker build blog-navigation:smoke` 与 push 重新构建割裂。
- GHCR digest 可在 workflow summary 看到。

## 任务卡 4：Docker smoke 挂载数据目录

目标：CI 验证容器对 `/var/lib/blog-navigation` 的读写和重启保留。

范围：

- `.github/workflows/docker-deploy.yml`
- `Dockerfile`
- `deploy/docker-entrypoint.sh`

实施步骤：

1. CI 创建 `.tmp/docker-smoke-data`。
2. `docker run` 加 `-v "$PWD/.tmp/docker-smoke-data:/var/lib/blog-navigation"`。
3. 容器启动后写入 marker 或通过 API 写设置。
4. 重启容器。
5. 验证 marker 或设置仍存在。

验证：

- GitHub Actions Docker smoke 通过。
- 日志显示 volume mount。

完成标准：

- 数据目录权限问题能被 CI 发现。
- 重启后数据仍存在。

## 任务卡 5：digest 部署与 `.last-good-digest`

目标：生产部署和回滚使用不可变 digest。

范围：

- `.github/workflows/docker-deploy.yml`
- `deploy/git-deploy.sh`
- `deploy/compose.prod.yaml`
- `README.md`

禁止事项：

- 不得自动恢复旧数据覆盖当前 `data/`。
- 不得覆盖服务器 `.env`。

实施步骤：

1. 部署前读取服务器 `.last-good-digest`。
2. 新镜像用 digest 启动。
3. 健康检查通过后写入 `.last-good-digest`。
4. 健康检查失败时回滚到旧 digest。
5. 更新前继续 tar `.env data`。
6. 文档区分“镜像回滚”和“数据恢复”。

验证：

- GitHub Actions manual deploy dry run 或真实测试环境。
- 日志显示 old digest、new digest、backup path。

完成标准：

- `latest` 不再作为生产回滚目标。
- 自动回滚只回镜像，不覆盖数据。

## 任务卡 6：Trivy 镜像扫描

目标：HIGH/CRITICAL 镜像漏洞阻断发布。

范围：

- `.github/workflows/docker-deploy.yml`

实施步骤：

1. 在 Docker smoke 后加入 `aquasecurity/trivy-action`。
2. 扫描同一测试镜像或 GHCR digest。
3. 设置 `severity: HIGH,CRITICAL`。
4. 设置 `exit-code: 1`。
5. 输出 SARIF 或 artifact。

验证：

- GitHub Actions 中看到 Trivy 步骤。
- 漏洞达到阈值时 workflow 失败。

完成标准：

- 镜像层 CVE 不再只靠人工发现。

## 任务卡 7：前端 P1 可访问性修复

目标：修复 warning 对比度、代码块 hover、运行时配置错误语义、loading 语义。

范围：

- `src/app/styles/design-tokens.css`
- `tailwind.config.ts`
- `src/app/styles/markdown-preview.css`
- `src/app/editor/(authenticated)/settings/runtime/page.tsx`
- `src/app/loading.tsx`
- 相关测试文件

实施步骤：

1. 调整 warning 文本和背景 token，保证小字号可读。
2. 调整代码块复制按钮 hover pair。
3. runtime 口令确认错误时设置 `aria-invalid` 和 `aria-describedby`。
4. 错误提交后聚焦第一个错误字段。
5. loading 使用 `role="status" aria-live="polite"`。

验证：

```bash
npm run lint -- --fix
npm run test -- tests/app
python scripts/test/verify-editor-settings-ui.py
git diff --check
```

完成标准：

- 测试覆盖错误字段语义。
- UI smoke 通过。

## 任务卡 8：R2 pending failed 状态

目标：R2 pending 失败不再静默丢弃。

范围：

- `src/lib/backup-coordinator.ts`
- `src/lib/editor-remote-backup.ts`
- `src/app/api/data/backup/remote/*`
- `src/app/editor/(authenticated)/settings/CloudflareR2SettingsPanel.tsx`
- 相关测试

实施步骤：

1. 队列结构增加 version。
2. pending 失败超过阈值后进入 failed。
3. failed 保留 lastError、attempts、lastAttemptAt。
4. 设置页显示 failed 状态。
5. 增加手动重试 API。
6. 兼容旧队列文件。

验证：

```bash
npm run test -- tests/lib/backup-coordinator.test.ts tests/lib/editor-remote-backup.test.ts tests/app/remote-backup-route.test.ts
npm run typecheck
git diff --check
```

完成标准：

- 失败任务不丢失。
- 用户能在设置页看到失败并重试。

## 任务卡 9：snapshot 绑定 manifest/hash

目标：R2 snapshot 语义准确，不能把延迟 drain 的当前状态伪装成旧保存时刻。

范围：

- `src/lib/editor-data-backup.ts`
- `src/lib/editor-remote-backup.ts`
- `src/lib/r2-backup-storage.ts`
- `src/lib/backup-coordinator.ts`

实施步骤：

1. 入队 snapshot 时记录 manifest/hash。
2. snapshot key 包含 manifest hash 或 payload hash。
3. drain 时校验当前 manifest 是否匹配。
4. latest 任务允许合并去重。
5. snapshot 任务不可随意合并成旧语义。

验证：

```bash
npm run test -- tests/lib/r2-backup-storage.test.ts tests/lib/backup-coordinator.test.ts tests/lib/editor-remote-backup.test.ts
npm run typecheck
git diff --check
```

完成标准：

- snapshot 可审计。
- latest 仍保持覆盖写。
- R2 payload 仍是明文 JSON。

## 任务卡 10：manifest transaction

目标：资源 JSON 与 manifest 事务一致。

范围：

- `src/lib/editor-data-storage.ts`
- `src/lib/editor-data-lock.ts`
- 新增 `src/lib/manifest-transaction.ts`
- 新增 `src/lib/atomic-json-writer.ts`
- 相关测试

实施步骤：

1. 提取 atomic JSON writer。
2. writer 支持 temp、fsync、rename、目录 fsync、临时文件清理。
3. 保存资源时 stage 资源 JSON 和 manifest。
4. commit 失败留下 marker。
5. 启动时检测 marker 并诊断或恢复。
6. 保持现有 API 返回兼容。

验证：

```bash
npm run test -- tests/lib
npm run test -- tests/app/editor-data-routes.test.ts
npm run typecheck
git diff --check
```

完成标准：

- 资源写失败不改 manifest。
- manifest 写失败不产生静默半提交。
- 启动可识别未完成事务。

## 任务卡 11：schemaVersion 与迁移 registry

目标：为后续数据结构升级和文章分文件存储准备。

范围：

- `src/lib/editor-data-storage.ts`
- `src/lib/editor-data-backup.ts`
- `scripts/data/runtime-data.mjs`
- 相关测试

实施步骤：

1. manifest 增加 `schemaVersion`。
2. backup payload 增加 `schemaVersion`。
3. 旧数据读取时默认 schemaVersion。
4. 新增迁移 registry。
5. 迁移前必须本地 snapshot。

验证：

```bash
npm run test -- tests/scripts/data-migration-scripts.test.ts tests/lib/r2-backup-storage.test.ts
npm run typecheck
git diff --check
```

完成标准：

- 旧数据可读。
- 新备份带 schemaVersion。
- 恢复时校验 schemaVersion。

## 任务卡 12：文章工作流视图

目标：后台文章列表从普通筛选升级为“草稿 / 待修复 / 可发布 / 已发布”工作流视图。

范围：

- `src/app/editor/(authenticated)/blog/page.tsx`
- `src/lib/article-quality.ts`
- `tests/app/editor-blog-page.test.tsx`
- `scripts/test/verify-editor-blog-ui.py`

实施步骤：

1. 复用现有 draft/published/evergreen。
2. 用 blocking check 计算“待修复”。
3. blocking 通过且未发布为“可发布”。
4. 增加 segmented control 或 tabs。
5. 列表显示质量检查摘要。
6. UI smoke 覆盖状态往返。

验证：

```bash
npm run test -- tests/app/editor-blog-page.test.tsx
python scripts/test/verify-editor-blog-ui.py
git diff --check
```

完成标准：

- 用户能快速找到待修复和可发布文章。
- 发布前 blocking 仍被阻止。

## 不建议执行的方向

1. 不要把主存储改成 GitHub 仓库提交。
2. 不要引入 PostgreSQL 作为当前阶段依赖。
3. 不要引入 Sanity、Contentful 等外部内容源。
4. 不要引入 MDX 任意组件执行替代当前 sanitize Markdown。
5. 不要把 R2 明文备份改成需要口令才能读取。
6. 不要让 Docker 更新清空、重建或覆盖生产 `data/`。

## Codex最终回复模板

每个任务完成后按此格式回复：

```markdown
已完成：<任务名>

改动文件：
- <path>

关键结果：
- <结果 1>
- <结果 2>

验证：
- `<command>`：通过/失败

风险/缺口：
- <如无则写“无已知缺口”>
```

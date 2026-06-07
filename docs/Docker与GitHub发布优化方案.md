# Docker 与 GitHub 发布优化方案

> 生成时间：2026-06-06
> 现状评估：发布链路在 digest 部署 + 失败自动回滚 + pin SHA + provenance/SBOM 上**已优于多数社区项目**
> 核心问题：测的不是发的（双重构建）、配置与镜像不同源、回滚源运行时推断、缺镜像 CVE 扫描
> 配套：[项目全量审查报告](./项目全量审查报告.md)、[测试与质量体系优化方案](./测试与质量体系优化方案.md)、[分阶段优化路线图](./分阶段优化路线图.md)

---

## 一、当前发布链路

```
[push / PR / tag vX.Y.Z]
   │  concurrency: cancel-in-progress
   ▼
[Job: verify] (contents:read)
   checkout(SHA pin) → setup-node24 cache:npm → npm ci
   → audit:high → check:env → lint → typecheck → test:coverage
   → docker build --tag smoke .（❌ 无 cache，纯冷构建）
   → Docker smoke：docker run(裸跑) → 轮询 / → 校验 seeds → curl /blog /navigation（仅 200）
   │  needs: verify, if: event != PR
   ▼
[Job: build-and-push] (packages:write)
   login ghcr → 校验 package.json version（tag 须 == v<version>）
   → metadata-action 多 tag（branch/pr/sha/version/build.N/latest）
   → build-push-action（❌ 再构建一次，cache gha mode=max, provenance+sbom, linux/amd64）
   → outputs: image-digest
   │  needs: build-and-push, if: workflow_dispatch && deploy==true（❌ 仅手动部署）
   ▼
[Job: deploy] (environment: production)
   校验 secrets → appleboy/ssh-action(SHA pin)：
     cd DEPLOY_PATH → IMAGE=ghcr@digest → 记录 PREV_DIGEST(docker inspect)
     → docker pull → compose -f compose.prod.yaml up -d --force-recreate（❌ compose 从不投递）
     → wait_for_healthcheck（❌ 解析宿主端口 curl）
     → 失败：PREV_DIGEST 为 sha256 则回滚，否则跳过 exit 1（❌ 留不健康容器）
   ▼
[Job: notify] if always() → Step Summary + 可选 webhook

并行独立链路：ui-smoke.yml（❌ 测源码 build 而非 GHCR 镜像）
备用链路：deploy/git-deploy.sh（❌ 行为与 workflow 不同，回滚目标可能是 tag）
```

---

## 二、现状优势（避免改坏，需保留）

| 优势 | 证据 |
|------|------|
| 三阶段构建 + standalone（~150-200MB） | `Dockerfile:1-64` |
| 非 root（uid 1001）+ su-exec 降权 + --init + HEALTHCHECK | `Dockerfile:43-64` |
| 质量门前移镜像构建期（lint+typecheck+build 不可绕过） | `Dockerfile:27-31` |
| 生产 compose 安全加固（read_only + tmpfs + cap_drop ALL + no-new-privileges + 内存限制 + 日志轮转） | `deploy/compose.prod.yaml` |
| 所有 Action pin 到 40 位 commit SHA | `.github/workflows/docker-deploy.yml` |
| provenance + sbom（SLSA 基础） | build-push-action 配置 |
| digest（非 tag）部署，杜绝 latest 漂移 | deploy job |
| 多 tag 策略 + 版本一致性强校验（git tag == package version） | `docker-deploy.yml:144-153` |
| 失败自动回滚 + 健康检查等待 | `docker-deploy.yml:320-355` |

> 外部对比结论：**这套发布链路成熟度高于 leerob/next-self-host 等社区项目**（后者回滚偏手动）。优化是补缺口，不是重做。

---

## 三、消除「测的不是发的 + 双重构建」（P1-3，高优先）

### 3.1 问题
1. **双重构建**：verify 的 `docker build --tag smoke`（`docker-deploy.yml:70`，无 cache-from/to）+ build-and-push 再构建一次 = 两遍完整 `next build`，GHA 分钟翻倍。
2. **测的不是发的**：ui-smoke.yml 跑源码 `npm run build` 后的 standalone，而非将发布的 GHCR 镜像。两条 CI 都 build 源码，测的不是同一产物。

### 3.2 方案：单链路一次构建一次测试一次推送
```
[Job: verify]   仅 lint/typecheck/test/audit（移除 docker build）
[Job: build]    build-push-action（load=true 或 push 到临时 tag）
                  → cache-from/to=gha
[Job: smoke]    用 build 产出的镜像跑（不再单独构建）
                  → 用 compose.prod.yaml 启动（约束与生产一致）
                  → Playwright（ui-smoke 改用该镜像）
[Job: push]     smoke 通过后 push 正式 tag + provenance/sbom
```
- **关键改动**：
  - 删除 verify 的 `docker build --tag smoke`（`docker-deploy.yml:70`）；
  - build-and-push 先 `load` 镜像供 smoke 使用，smoke 通过再 push；
  - ui-smoke.yml 改为 `docker load` build 产物后跑 Playwright（保证「测的即发的」）。
- **收益**：消除一次完整构建（省数分钟），smoke 测真实镜像。
- **验证**：CI 时长下降；smoke 在真实镜像 + 生产约束下通过。
- **工作量**：1-1.5 天。

---

## 四、部署链路修复（P1-1 / P1-2，高优先）

### 4.1 compose 与镜像同源（P1-1）
- **问题**：deploy 假定生产机已有 compose.prod.yaml，但 workflow 从不投递它（仅 git-deploy.sh 会 cp），安全模型可能与仓库声明不一致而无人察觉（`docker-deploy.yml:279-281,338`）。
- **方案**：部署前用 `scp` 将仓库 `deploy/compose.prod.yaml` 同步到 `DEPLOY_PATH`，或 SSH 脚本内 `git pull` 后引用仓库内 compose 文件。**保证 compose 与镜像同源同版本**。
- **验证**：部署后 `docker inspect` 确认容器有 read_only/cap_drop（与仓库 compose 一致）。

### 4.2 健康检查改用容器状态（部署可靠性）
- **问题**：`get_healthcheck_url` 解析宿主端口 curl（`docker-deploy.yml:299,339`），端口解析失败回退 7199，可能打错端口误判失败触发回滚。
- **方案**：直接用 `docker inspect --format '{{.State.Health.Status}}'` == healthy 作通过条件（与 compose healthcheck 单一事实源对齐）。

### 4.3 部署触发策略明确化
- **问题**：部署仅 `workflow_dispatch && deploy==true`（`docker-deploy.yml:238-241`），存在「以为推 tag 就上线」认知偏差；两条部署链路（workflow SSH vs git-deploy.sh）行为不同并存。
- **方案**（二选一，明确单一权威路径）：
  - **A（推荐）**：tag 事件自动 deploy + production environment 必需审批（required reviewers）；
  - **B**：文档明确「手动部署是唯一路径」，废弃或对齐 git-deploy.sh。
- **附带**：production environment 配 required reviewers，DEPLOY_* secrets 收敛到 environment 级而非 repo 级。

### 4.4 回滚健壮化（P1-2）
- **问题**：回滚依赖 `docker inspect` 推断 PREV_DIGEST，容器不存在/非 digest 时回退 none 放弃回滚（`docker-deploy.yml:320-355`）；非 sha256 时直接 exit 1 留下不健康新容器；git-deploy.sh 回滚目标可能是可变 tag 等于没回滚。
- **方案**：
  1. **部署前显式持久化「上一个成功 digest」** 到 `DEPLOY_PATH/.last-good-digest` 文件，回滚从文件读取，不依赖运行时推断；
  2. 回滚失败时至少 `docker compose stop` 而非留不健康容器跑；
  3. 区分「回滚成功（发布失败但生产恢复）」与「回滚也失败（生产宕机）」两种退出码，notify 明确严重级别；
  4. git-deploy.sh 回滚目标固定为 digest，与 workflow 同策略。
- **验证**：模拟新版健康检查失败，确认从 `.last-good-digest` 回滚成功且生产可用。

### 4.5 SSH 注入面收敛（安全中级）
- **问题**：SSH 脚本大量用 `${{ }}` GitHub 表达式直接插值进远程 shell（`docker-deploy.yml:268-275`），digest 来自 build outputs 存在注入面；webhook `-d '{...}'` 直接拼 `github.ref_name`（`426-441`）。
- **方案**：表达式先赋值到 `env:` 段再脚本内 `"${VAR}"` 引用（appleboy 支持 envs）；webhook 用 `jq -n --arg` 构造 payload。

---

## 五、Dockerfile / 镜像优化（P2-5 / P2-10）

| 项 | 现状 | 优化 | 优先级 |
|----|------|------|--------|
| 基础镜像 pin digest | `node:24-alpine` 三处浮动 tag（`Dockerfile:1,13,33`） | 改 `node:24-alpine@sha256:...`，ARG 统一三阶段，renovate/ratchet 自动维护 | 中（可复现 + 防 tag 重推） |
| 移除镜像内 lint/typecheck | builder 阶段重跑（`Dockerfile:27-31`） | 移到 CI verify，镜像只 `next build`，显著缩短构建（与 §3 配合） | 中 |
| HEALTHCHECK 专用端点 | `curl -f http://localhost:${PORT}/` 探整页 SSR（`Dockerfile:57-58`） | 新增轻量 `/api/health` 返回 200，HEALTHCHECK 与 compose 都指向它 | 中 |
| 移除 curl 依赖 | runner 装 curl 仅 HEALTHCHECK 用（`Dockerfile:43`） | 用 wget（compose 已用）或 node 自带 http 探活，减镜像与攻击面 | 低 |
| 移除 su-exec + chown | entrypoint 每次启动 `chown -R`（`deploy/docker-entrypoint.sh:8-12`） | 用 compose `user:` + 卷预置属主，去 CHOWN/FOWNER 能力缩小攻击面 | 低 |
| 拆分 RUN 链 | lint&&typecheck&&build 单层（`Dockerfile:28-31`） | 若保留则拆分便于定位失败；builder 清理无意义可删 | 低 |
| 缓存策略 | cache gha mode=max（`189-193`，10GB 上限） | 镜像不大可保持 gha；超限才迁 registry cache | 低 |

> ⚠️ **不照搬**：多架构（arm64+QEMU）对纯 amd64 部署拖慢 CI 无收益；registry cache / buildkit-cache-dance 对小镜像偏重；Nginx/Postgres 编排本项目不需要；蓝绿对单 VPS 单容器过重。

---

## 六、安全扫描补强（P1-4 / P3-6，最大缺口）

### 6.1 镜像层 CVE 扫描（P1-4，高优先）
- **问题**：有 npm audit（源码依赖）+ SBOM，但缺镜像层（alpine OS 包 + 应用依赖）CVE 扫描。
- **方案**：build-and-push 后新增 Trivy job：
```yaml
- uses: aquasecurity/trivy-action@<SHA>
  with:
    image-ref: ghcr.io/242282218/blog-nevigation@${{ needs.build.outputs.digest }}
    severity: CRITICAL,HIGH
    exit-code: '1'           # 高危阻断
    format: sarif
    output: trivy.sarif
- uses: github/codeql-action/upload-sarif@<SHA>
  with: { sarif_file: trivy.sarif }   # 上传 GitHub Security
```
- **验证**：注入已知漏洞依赖确认 CI 红；SARIF 出现在 Security 标签页。

### 6.2 SAST + Dependabot + secret 扫描（P3-6）
| 工具 | 用途 | 配置 |
|------|------|------|
| CodeQL | SAST 静态分析 | `.github/workflows/codeql.yml`，JS/TS |
| Dependabot/Renovate | 自动依赖 + Action SHA + 基础镜像 digest 升级 | `.github/dependabot.yml`（覆盖 npm + github-actions + docker） |
| gitleaks/trufflehog | 全量 secret 扫描（补 check:env 只能防入库的不足） | CI job |
| `gh attestation verify` / cosign | 部署 pull 后验证镜像来源（闭环 provenance） | deploy 脚本 |

### 6.3 audit 门禁脆弱性
- **问题**：`audit:high` 受外部 advisory 波动影响，新增 advisory 可能让无关 PR 突然红（`docker-deploy.yml:47-48`）。
- **方案**：audit 单独非阻塞 job，或固定 advisory 白名单 + 定期人工复核，避免外部抖动卡发布主链。

---

## 七、smoke test 缺口（详见 [测试方案 §4.4](./测试与质量体系优化方案.md)）

| 缺口 | 位置 | 修复 |
|------|------|------|
| 仅 curl 200 不校验内容 | `docker-deploy.yml:105-108` | 落盘 HTML grep 关键文案 |
| 裸 docker run 非生产约束 | `docker-deploy.yml:77-83` | 用 compose.prod.yaml 启动（read_only/cap_drop 一致） |
| 无 post-deploy 外部冒烟 | （缺失） | deploy 末尾对 SITE_URL 跑外部 curl/Playwright，失败回滚/告警 |
| 写操作未验证落盘 | `ui-smoke.yml:117` | 写-读回-断言冒烟，验证 read_only 下仅 ./data 可写 |
| 健康判定仅 HTTP 可达 | `docker-deploy.yml:91-103` | 结合 `docker inspect` Health.Status == healthy |

---

## 八、release tag 策略与发布自动化

### 8.1 当前（已较好）
metadata-action 生成 branch/pr/sha/v<version>/v<version>-build.<run>/latest，tag 事件校验 git tag == package version，digest 部署。

### 8.2 补强
| 项 | 现状 | 优化 |
|----|------|------|
| CHANGELOG / Release notes | 无 | 引入 semantic-release 或 changesets，conventional commits 驱动自动 bump + 生成 CHANGELOG + 创建 GitHub Release |
| GitHub Release | 无创建步骤 | tag 推送自动建 Release，附 SBOM/digest |
| SECURITY.md | 无 | 新增漏洞披露政策 |
| 回滚 runbook | 仅 README 命令 | `docs/DEPLOYMENT.md` 增回滚步骤（配合 `.last-good-digest`） |

---

## 九、compose.prod.yaml 补强
- 加 `deploy.resources.limits`（mem/cpu）、`logging`（json-file max-size/max-file）、`restart: unless-stopped`（部分 docker run 命令已有 --restart/--init，同步进 compose）。

---

## 十、落地优先级
1. **P1（发布前）**：单链路消除双重构建（§3）+ compose 同源（§4.1）+ 回滚健壮化（§4.4）+ Trivy CVE 扫描（§6.1）。
2. **P2**：基础镜像 pin digest（§5）+ 健康检查用容器状态（§4.2）+ smoke 用生产约束（§7）+ Dependabot/CodeQL/gitleaks（§6.2）+ SSH 注入收敛（§4.5）。
3. **P3**：HEALTHCHECK 专用端点（§5）+ semantic-release 发布自动化（§8）+ OIDC 替换 SSH key + SECURITY.md/runbook。

---

## 十一、成功标准
- CI 单链路：一次构建 → 真实镜像 + 生产约束 smoke → 推送，时长下降；
- ui-smoke 测的是将发布的 GHCR 镜像；
- compose 与镜像同源，生产容器安全模型与仓库一致；
- 回滚从 `.last-good-digest` 读取，不依赖运行时推断，失败不留不健康容器；
- 镜像有 Trivy CVE 门禁，HIGH/CRITICAL 阻断；
- 基础镜像 pin digest，构建可复现；
- 有 CodeQL/Dependabot/gitleaks 安全自动化。

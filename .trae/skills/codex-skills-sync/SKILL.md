---
name: codex-skills-sync
description: 同步和恢复 Codex 本地配置。用于将 `%USERPROFILE%\\.codex` 下的 `core`、`skills`、`snippets`、`templates`、`rules` 以及 `config.toml`、`AGENTS.md` 推送到 GitHub 仓库，或从 GitHub 云端恢复到本机（覆盖不删除）。当用户提出“同步到 GitHub”“云端备份”“从仓库恢复本地 Codex 配置”时使用。
---

# codex-skills-sync

## 目标

统一管理 Codex 配置的云端备份与恢复：
- `push`：本机 `%USERPROFILE%\\.codex` -> GitHub 仓库
- `restore`：GitHub 仓库 -> 本机 `%USERPROFILE%\\.codex`

默认策略是**覆盖不删除**。

## 同步范围

- 目录：`core`、`skills`、`snippets`、`templates`、`rules`
- 文件：`config.toml`、`AGENTS.md`、`rules/default.rules`

说明：`rules/default.rules` 已包含在 `rules/` 目录中，单独列出是为了显式校验。

## 使用步骤

1. 确认目标仓库 URL（例如：`https://github.com/242282218/codex_skills.git`）和分支（默认 `main`）。
2. 运行脚本：`scripts/sync_codex_repo.py`。
3. 根据模式选择：
   - 推送：`--mode push`
   - 恢复：`--mode restore`
4. 如需先预览不推送，使用 `--dry-run`。

## 常用命令

```bash
# 推送到 GitHub（覆盖不删除）
python scripts/sync_codex_repo.py \
  --mode push \
  --repo-url https://github.com/242282218/codex_skills.git \
  --branch main

# 若本机未设置 Git 提交身份，可临时指定：
python scripts/sync_codex_repo.py \
  --mode push \
  --repo-url https://github.com/242282218/codex_skills.git \
  --git-user-name "Your Name" \
  --git-user-email "you@example.com"

# 从 GitHub 恢复到本机（覆盖不删除）
python scripts/sync_codex_repo.py \
  --mode restore \
  --repo-url https://github.com/242282218/codex_skills.git \
  --branch main

# 预演（不提交不推送）
python scripts/sync_codex_repo.py \
  --mode push \
  --repo-url https://github.com/242282218/codex_skills.git \
  --dry-run
```

## 默认规则

- 覆盖不删除：只复制和覆盖目标文件，不主动删除目标多余文件。
- 自动忽略机器产物：`__pycache__/`、`*.pyc`、`*.pyo`、`.DS_Store`、`Thumbs.db`。
- `push` 仅在检测到变更时才提交和推送。
- 若未配置 Git 身份，需传入 `--git-user-name` 和 `--git-user-email`。

## 资源

- 详细范围说明：`references/sync-scope.md`
- 执行脚本：`scripts/sync_codex_repo.py`

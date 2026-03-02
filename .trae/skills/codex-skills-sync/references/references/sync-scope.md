# 同步范围与策略

## 固定同步范围

- 目录：
  - `core`
  - `skills`
  - `snippets`
  - `templates`
  - `rules`
- 文件：
  - `config.toml`
  - `AGENTS.md`
  - `rules/default.rules`

## 默认策略

- 覆盖不删除（overwrite without delete）
- 忽略机器产物：
  - 目录：`__pycache__`
  - 文件后缀：`.pyc`、`.pyo`
  - 文件名：`.DS_Store`、`Thumbs.db`

## Git 提交策略

- `push` 模式下：
  - 若无变更，不提交不推送
  - 若有变更，默认提交信息：`chore: sync codex files`
  - 推送目标：`origin/<branch>`

## 恢复策略

- `restore` 模式从 GitHub 拉取后，复制到本机 `%USERPROFILE%\\.codex`
- 默认仅覆盖已同步范围，不删除本机其他文件

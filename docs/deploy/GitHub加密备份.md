# GitHub 加密备份

GitHub 可以作为可选的异地备份目标。运行时数据在提交或上传前必须加密，不能把明文文章、导航、站点设置或密钥提交到仓库。

## 适用场景

适用于以下需求：

- 把运行时数据归档到一个独立的私有备份仓库。
- 在 R2 之外保留第二份异地备份。
- 通过定时任务生成可恢复的加密备份。
- 定期做恢复演练，确认备份可用。

它和 R2 的区别：

- R2：应用内云同步和云恢复，适合作为近实时灾备镜像。
- GitHub 加密备份：离线异地归档，适合保留历史备份和做恢复演练。

## 创建加密备份

```bash
export GITHUB_BACKUP_ENCRYPTION_KEY='replace-with-a-long-random-secret'
npm run data:backup:github -- ./data ./output/github-backups/latest.enc.json
```

生成的加密文件包含与 `npm run data:export` 相同的 backup envelope，但 JSON payload 会使用 AES-256-GCM 加密。明文文章、导航和设置数据不会写入加密备份文件。

`GITHUB_BACKUP_ENCRYPTION_KEY` 必须长期保存。如果密钥丢失，已加密的备份无法恢复。

## 提交到私有备份仓库

在服务器上 clone 一个专用的私有备份仓库：

```bash
git clone git@github.com:<owner>/<private-backup-repo>.git /opt/blog-navigation-backups
```

然后执行：

```bash
export GITHUB_BACKUP_ENCRYPTION_KEY='replace-with-a-long-random-secret'
export GITHUB_BACKUP_REPO_PATH=/opt/blog-navigation-backups
export GITHUB_BACKUP_PUSH=true
npm run data:backup:github -- ./data
```

`GITHUB_BACKUP_PUSH=true` 用于允许脚本推送到远端。没有该变量时，脚本只会写入加密文件并提交到本地备份仓库。

建议把备份仓库和源码仓库分开。备份仓库只保存加密备份文件，不保存 `.env`、R2 凭据、GitHub token 或加密密钥。

## 恢复

```bash
export GITHUB_BACKUP_ENCRYPTION_KEY='replace-with-the-original-secret'
npm run data:restore:encrypted -- ./backups/blog-navigation-backup.enc.json ./data
npm run data:verify -- ./data
```

恢复后应继续检查公开页面和 `/editor` 数据。只要密钥不一致，恢复就会失败；不要尝试用新密钥恢复旧备份。

## Cron 示例

建议把复杂命令放进脚本，Cron 只调用脚本，降低复制错误概率。

例如创建 `/opt/blog-nevigation/run-github-backup.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /opt/blog-nevigation
export GITHUB_BACKUP_ENCRYPTION_KEY='replace-with-a-long-random-secret'
export GITHUB_BACKUP_REPO_PATH=/opt/blog-navigation-backups
export GITHUB_BACKUP_PUSH=true
npm run data:backup:github -- ./data
```

设置权限：

```bash
chmod +x /opt/blog-nevigation/run-github-backup.sh
```

Cron：

```cron
15 3 * * * /opt/blog-nevigation/run-github-backup.sh >> /var/log/blog-navigation-backup.log 2>&1
```

不要把真实密钥提交到任何 Git 仓库。生产环境中应通过服务器密钥管理、受限权限文件或部署平台 secrets 注入密钥。

## 每周恢复演练

恢复演练应在临时目录中执行，验证通过后再信任备份。

```bash
RESTORE_DIR=$(mktemp -d)
LATEST_BACKUP=$(ls -t /opt/blog-navigation-backups/backups/*.enc.json | head -n 1)
export GITHUB_BACKUP_ENCRYPTION_KEY='replace-with-the-original-secret'
npm run data:restore:encrypted -- "$LATEST_BACKUP" "$RESTORE_DIR"
npm run data:verify -- "$RESTORE_DIR"
rm -rf "$RESTORE_DIR"
```

演练成功标准：

- 可以解密并导入到临时目录。
- `npm run data:verify` 通过。
- 临时目录中的文章、导航和站点设置数量符合预期。
- 演练结束后已删除临时目录。

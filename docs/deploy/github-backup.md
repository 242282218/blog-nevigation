# GitHub Encrypted Backup

GitHub can be used as an optional offsite backup target. Runtime data must be
encrypted before it is committed or uploaded.

## Create an Encrypted Backup

```bash
export GITHUB_BACKUP_ENCRYPTION_KEY='replace-with-a-long-random-secret'
npm run data:backup:github -- ./data ./output/github-backups/latest.enc.json
```

The encrypted file contains the same backup envelope as `npm run data:export`,
but the JSON payload is encrypted with AES-256-GCM. The plaintext article,
navigation, and settings data are not written to the encrypted backup file.

## Commit Into a Private Backup Repository

On the server, clone a private repository dedicated to backups:

```bash
git clone git@github.com:<owner>/<private-backup-repo>.git /opt/blog-navigation-backups
```

Then run:

```bash
export GITHUB_BACKUP_ENCRYPTION_KEY='replace-with-a-long-random-secret'
export GITHUB_BACKUP_REPO_PATH=/opt/blog-navigation-backups
export GITHUB_BACKUP_PUSH=true
npm run data:backup:github -- ./data
```

`GITHUB_BACKUP_PUSH=true` is required for the script to push. Without it, the
script only writes the encrypted file and commits it into the local backup repo.

## Restore

```bash
export GITHUB_BACKUP_ENCRYPTION_KEY='replace-with-the-original-secret'
npm run data:restore:encrypted -- ./backups/blog-navigation-backup.enc.json ./data
npm run data:verify -- ./data
```

Keep the encryption key outside GitHub. If the key is lost, encrypted backups
cannot be restored.

## Cron Example

```cron
15 3 * * * cd /opt/blog-nevigation && GITHUB_BACKUP_ENCRYPTION_KEY='...' GITHUB_BACKUP_REPO_PATH=/opt/blog-navigation-backups GITHUB_BACKUP_PUSH=true npm run data:backup:github -- ./data >> /var/log/blog-navigation-backup.log 2>&1
```

## Weekly Restore Drill

Run the restore drill from a source checkout with access to the backup file and
encryption key. Restore into a temporary directory first, then verify the
manifest before trusting the backup.

```bash
RESTORE_DIR=$(mktemp -d)
LATEST_BACKUP=$(ls -t /opt/blog-navigation-backups/backups/*.enc.json | head -n 1)
export GITHUB_BACKUP_ENCRYPTION_KEY='replace-with-the-original-secret'
npm run data:restore:encrypted -- "$LATEST_BACKUP" "$RESTORE_DIR"
npm run data:verify -- "$RESTORE_DIR"
rm -rf "$RESTORE_DIR"
```

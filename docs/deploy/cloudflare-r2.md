# Cloudflare and R2

Cloudflare is used as an edge layer and optional backup mirror. The server
filesystem remains the primary data source.

## Recommended Setup

- DNS: Cloudflare proxied record to the server.
- TLS: Full or Full strict.
- App: Docker Compose on the server.
- Backup: Cloudflare R2 via S3-compatible API.

## R2 Environment

R2 can be configured in two ways:

- Preferred for an already running server: log in to `/editor/settings` and use
  the Cloudflare R2 panel. The secret key is stored under
  `BLOG_DATA_ROOT/settings/cloudflare-r2.json` and is not returned to the
  browser after save.
- Preferred for immutable or first deploys: set the environment variables below
  in `.env`.

When `BLOG_DATA_ROOT/settings/cloudflare-r2.json` exists, it is the complete R2
configuration source and `.env` R2 variables are not used as field fallbacks.
Delete or edit that settings file through `/editor/settings` when you want to
switch back to `.env`-driven R2 configuration.

```env
R2_BACKUP_ENABLED=true
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_BUCKET=your-r2-bucket
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_PREFIX=blog-navigation
R2_SNAPSHOT_ON_WRITE=false
```

`R2_ENDPOINT` is optional. Leave it empty for normal Cloudflare R2 usage.

## Object Layout

```text
blog-navigation/latest/backup.json
blog-navigation/snapshots/YYYY/MM/DD/<timestamp>-manual-sync.json
```

`latest/backup.json` is overwritten by sync operations. Snapshot objects are
written for explicit sync and restore actions, or for every write when
`R2_SNAPSHOT_ON_WRITE=true`.

## Backup Scope

R2 backup objects contain articles, navigation, site settings, and a manifest.
They do not contain `BLOG_DATA_ROOT/settings/cloudflare-r2.json` or any R2
credentials. This prevents a restored backup from overwriting the destination
server's storage credentials.

This follows the same operational boundary used by mature self-hosted systems:
GitLab documents object-storage data and configuration/secrets as separate
backup concerns, and Nextcloud treats object storage as a storage backend that
changes the backup and restore plan rather than a transparent local filesystem.

- GitLab object storage: <https://docs.gitlab.com/administration/object_storage/>
- GitLab backup and restore: <https://docs.gitlab.com/administration/backup_restore/backup_gitlab/>
- Nextcloud primary object storage:
  <https://docs.nextcloud.com/server/latest/admin_manual/configuration_files/primary_storage.html>

## Restore

From a fresh server:

1. Configure `.env` with R2 variables.
2. Start the app.
3. Log in to `/editor`.
4. Use cloud restore.
5. Verify public pages and editor data.

If cloud restore reports that local data was restored but the follow-up cloud
snapshot failed, the restored server data is already in place. Fix the R2
configuration and run a manual cloud sync to restore the remote mirror.

## Why R2 Is Not Primary Storage

Local JSON keeps public reads independent from remote object storage
availability. R2 is used as disaster recovery and migration support. If the app
needs multi-user editing, audit history, or high write concurrency later, move
the storage layer to a database instead of making R2 the live database.

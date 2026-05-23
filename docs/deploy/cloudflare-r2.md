# Cloudflare and R2

Cloudflare is used as an edge layer and optional backup mirror. The server
filesystem remains the primary data source.

## Recommended Setup

- DNS: Cloudflare proxied record to the server.
- TLS: Full or Full strict.
- App: Docker Compose on the server.
- Backup: Cloudflare R2 via S3-compatible API.

## R2 Environment

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

## Restore

From a fresh server:

1. Configure `.env` with R2 variables.
2. Start the app.
3. Log in to `/editor`.
4. Use cloud restore.
5. Verify public pages and editor data.

## Why R2 Is Not Primary Storage

Local JSON keeps public reads independent from remote object storage
availability. R2 is used as disaster recovery and migration support. If the app
needs multi-user editing, audit history, or high write concurrency later, move
the storage layer to a database instead of making R2 the live database.

# Local + Cloudflare R2 Data Management Design

## Goal

Keep the server filesystem as the primary runtime data source and use Cloudflare
R2 as a remote backup target. A deployment can be migrated by copying
`BLOG_DATA_ROOT`, or by restoring the latest R2 backup into a fresh server.

## Current Baseline

- Runtime data is stored under `BLOG_DATA_ROOT`.
- Articles are stored in `articles/articles.json`.
- Navigation data is stored in `navigation/tools.json`.
- Seed content remains in `content/seeds/`.
- The editor already exposes a protected backup and restore API.

## Decision

Use local-first persistence with best-effort R2 backups.

Local writes are the source of truth. After a successful local write, the server
attempts to upload a versioned backup payload to R2. R2 failures are logged and
reported as backup failures, but they do not roll back local writes.

## Data Contract

All backup exports use one JSON envelope:

```json
{
  "version": 1,
  "exportedAt": "2026-05-22T00:00:00.000Z",
  "source": "local",
  "data": {
    "articles": [],
    "navigation": [],
    "settings": {}
  }
}
```

The restore API keeps compatibility with the previous flat shape, but all new
exports should use the envelope.

## R2 Object Layout

Default prefix: `blog-navigation/`

```text
blog-navigation/latest/backup.json
blog-navigation/snapshots/YYYY/MM/DD/<timestamp>-<reason>.json
```

`latest/backup.json` is overwritten on every successful sync. Snapshot objects
are written for explicit backup/restore actions and can also be enabled for
every editor write.

## Environment Variables

```env
R2_BACKUP_ENABLED=false
R2_ACCOUNT_ID=
R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PREFIX=blog-navigation
R2_SNAPSHOT_ON_WRITE=false
```

`R2_ENDPOINT` can override the default endpoint when needed.

## Runtime Flow

1. Editor writes articles or navigation.
2. API validates input and writes local JSON atomically.
3. API triggers best-effort R2 sync.
4. R2 stores `latest/backup.json`.
5. Manual backup writes an additional timestamped snapshot.
6. A fresh server can call a protected restore endpoint to pull the latest R2
   backup into `BLOG_DATA_ROOT`.

## Migration Flow

Preferred migration:

1. Stop the old container.
2. Copy the server data directory.
3. Start the new container with the copied directory mounted as `BLOG_DATA_ROOT`.

Cloud restore migration:

1. Start a fresh container with `BLOG_DATA_ROOT` configured.
2. Configure R2 environment variables.
3. Log into `/editor`.
4. Trigger remote restore.
5. Verify public pages show restored articles and navigation.

## Trade-offs

- Local-first avoids making public reads depend on Cloudflare availability.
- Best-effort remote sync avoids losing editor saves when R2 is temporarily
  unavailable.
- JSON remains easy to inspect and migrate, but this is still single-writer
  storage. Multi-user concurrent editing should move to a database later.

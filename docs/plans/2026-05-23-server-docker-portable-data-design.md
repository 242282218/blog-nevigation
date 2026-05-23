# Server Docker Portable Data Design

## Goal

Deploy the app as a low-cost, portable server application:

- GitHub stores source code and runs CI.
- GHCR stores versioned Docker images.
- A small server runs the standalone Next.js container.
- Cloudflare handles DNS/CDN and optional R2 backup.
- Runtime data migrates as a single `data/` directory or one backup JSON file.

## Decision

Use the current Docker deployment as the primary path. Do not move the app to
Cloudflare Workers in this phase because the current runtime depends on Node
filesystem APIs. A Cloudflare-native path can be added later after the storage
layer is abstracted.

## Data Contract

Local JSON remains the source of truth. Backups use one envelope across API,
CLI, and R2:

```json
{
  "version": 1,
  "exportedAt": "2026-05-23T00:00:00.000Z",
  "source": "local",
  "persistent": true,
  "dataRoot": "/var/lib/blog-navigation",
  "data": {
    "articles": [],
    "navigation": [],
    "settings": {}
  }
}
```

Restore keeps compatibility with older backups that only contain articles and
navigation. Missing settings restore to defaults.

## First Implementation Phase

- Include site settings in CLI export/import.
- Keep article URLs stable by storing a generated `slug` with new and restored
  runtime articles.
- Preserve compatibility with old article records that do not have `slug`.
- Add focused tests for migration scripts and runtime slug behavior.

## Later Phases

- Add `data/manifest.json` with schema version, content hash, and last backup
  time.
- Add optimistic write checks for editor saves to reduce multi-tab overwrite
  risk.
- Split deployment docs into server, migration, and Cloudflare R2 guides.
- Introduce a storage provider interface before any Cloudflare Workers/D1/R2
  native migration.

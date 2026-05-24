# Docker

## Build

```bash
docker build -t blog-navigation .
```

## Run

```bash
EDITOR_ACCESS_TOKEN="$(openssl rand -base64 32)"

docker run -p 3000:3000 \
  -e EDITOR_ACCESS_TOKEN="${EDITOR_ACCESS_TOKEN}" \
  -e BLOG_DATA_ROOT=/var/lib/blog-navigation \
  -e COOKIE_SECURE=false \
  -e R2_BACKUP_ENABLED=false \
  blog-navigation
```

## Compose

```bash
cp .env.example .env
docker compose up --build
```

The root Compose file is for local HTTP testing. For a public server, use
`deploy/compose.prod.yaml`; it defaults editor cookies to HTTPS-only.

The compose stack uses a single bind mount: `./data:/var/lib/blog-navigation`.
Runtime editor data stays outside the repository and can be migrated by copying
the `data/` directory.
Public blog articles and editor articles share the same runtime data under `/var/lib/blog-navigation/articles`.

## Portable data backup

```bash
npm run data:export -- ./data ./output/blog-navigation-backup.json
npm run data:import -- ./output/blog-navigation-backup.json ./data
```

## Optional Cloudflare R2 backup

Set these variables in `.env` when remote backup is needed:

```env
R2_BACKUP_ENABLED=true
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_BUCKET=your-r2-bucket
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_PREFIX=blog-navigation
R2_SNAPSHOT_ON_WRITE=false
```

Local files remain the primary data source. R2 stores `latest/backup.json` and
manual timestamped snapshots for migration and recovery.

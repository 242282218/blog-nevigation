# Data Migration

Runtime data is portable by design. Prefer copying `data/` directly when the
old server is reachable. Use JSON backup packages when direct copying is not
convenient.

## Preferred Server-to-Server Migration

On the old server:

```bash
cd /opt/blog-nevigation
docker compose -f compose.prod.yaml stop app
tar -czf blog-navigation-data.tgz data .env compose.prod.yaml
```

Copy the archive to the new server, then:

```bash
mkdir -p /opt/blog-nevigation && cd /opt/blog-nevigation
tar -xzf /path/to/blog-navigation-data.tgz
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d
```

Verify after start:

```bash
# Run from a source checkout, not from the three-file production directory.
npm run data:verify -- /opt/blog-nevigation/data

cd /opt/blog-nevigation
HEALTHCHECK_PORT=$(docker compose -f compose.prod.yaml port app 3000 | awk -F: 'END {print $NF}')
curl -I "http://127.0.0.1:${HEALTHCHECK_PORT:-3000}/"
```

## Backup Package Migration

Export:

```bash
npm run data:export -- ./data ./output/blog-navigation-backup.json
```

Import:

```bash
npm run data:import -- ./output/blog-navigation-backup.json ./data
npm run data:verify -- ./data
```

The backup package includes articles, navigation, site settings, and a manifest.
Older backup packages without settings restore default settings. The package
does not include `data/settings/cloudflare-r2.json` or R2 credentials; configure
R2 again on the new server unless you migrate the full `data/` directory and
`.env`.

Imports and `data:verify` enforce the same public navigation contract as the
application: category slugs must be unique, production tool URLs must be HTTPS,
and each tool must include at least one tag. Invalid backup packages fail before
replacing the target runtime data.

## Encrypted GitHub Backup Migration

Use this path when the backup is stored in a private GitHub repository or a
GitHub Actions artifact.

```bash
export GITHUB_BACKUP_ENCRYPTION_KEY='replace-with-the-original-secret'
npm run data:restore:encrypted -- ./backups/blog-navigation-backup.enc.json ./data
npm run data:verify -- ./data
```

Create encrypted backups with:

```bash
export GITHUB_BACKUP_ENCRYPTION_KEY='replace-with-a-long-random-secret'
npm run data:backup:github -- ./data
```

## Repair Manifest

If a copied data directory predates `manifest.json`, regenerate it:

```bash
npm run data:verify -- ./data --write-manifest
npm run data:verify -- ./data
```

## Cloud Restore Migration

If local data is unavailable:

1. Deploy a fresh server with `BLOG_DATA_ROOT` configured.
2. Configure the same R2 variables in `.env`.
3. Start the container.
4. Log in to `/editor`.
5. Click cloud restore.
6. Run a public page smoke check.

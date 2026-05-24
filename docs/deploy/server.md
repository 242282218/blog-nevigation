# Server Deployment

This is the recommended production path for the project.

## Architecture

```text
GitHub main -> GitHub Actions -> GHCR image -> server Docker Compose
                                      |
                                      v
                         ./data mounted as /var/lib/blog-navigation
```

Cloudflare can sit in front of the server for DNS, TLS, and CDN. Runtime data
stays on the server filesystem and can be mirrored to R2.

## First Deploy

```bash
mkdir -p /opt/blog-nevigation && cd /opt/blog-nevigation
curl -LO https://raw.githubusercontent.com/242282218/blog-nevigation/main/deploy/compose.prod.yaml

cat > .env <<'EOF'
EDITOR_ACCESS_TOKEN=change-me
APP_PORT=3000
COOKIE_SECURE=false
R2_BACKUP_ENABLED=false
EOF

mkdir -p data
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d
```

Set `COOKIE_SECURE=true` after HTTPS is enabled.

## Update

```bash
cd /opt/blog-nevigation
export DEPLOY_IMAGE=ghcr.io/242282218/blog-nevigation:main-<commit-sha>
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d
```

## Health Check

```bash
docker compose -f compose.prod.yaml ps
docker compose -f compose.prod.yaml logs --tail=100 app
HEALTHCHECK_PORT=$(docker compose -f compose.prod.yaml port app 3000 | awk -F: 'END {print $NF}')
curl -I "http://127.0.0.1:${HEALTHCHECK_PORT:-3000}/"
```

## Runtime Data

The deployment directory should contain:

```text
compose.prod.yaml
.env
data/
```

`data/` is the migration boundary. It contains article data, navigation data,
site settings, and `manifest.json`.

Run data verification from a source checkout, passing the production data path:

```bash
npm run data:verify -- /opt/blog-nevigation/data
```

## GitHub Actions Deployment

The workflow can deploy through SSH when these secrets are configured:

```text
DEPLOY_HOST
DEPLOY_USER
DEPLOY_SSH_KEY
DEPLOY_PATH
```

Manual deployment uses the `workflow_dispatch` trigger with `deploy=true`.

The deployment job refuses to start if the build did not publish an immutable
image digest. After Docker Compose restarts the app, the workflow checks the
actual mapped port from `docker compose port app 3000`. If the new container
does not pass the health check, the workflow rolls back only when the previous
container has a valid `@sha256:` image digest, then runs the same health check
against the rollback container.

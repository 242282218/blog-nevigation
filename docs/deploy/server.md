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

EDITOR_ACCESS_TOKEN="$(openssl rand -base64 32)"

cat > .env <<EOF
EDITOR_ACCESS_TOKEN=${EDITOR_ACCESS_TOKEN}
APP_PORT=3000
COOKIE_SECURE=true
R2_BACKUP_ENABLED=false
EOF

mkdir -p data
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d
```

If the first start is on a private HTTP-only host, set `COOKIE_SECURE=false`
temporarily and change it back to `true` before exposing the editor over HTTPS.

`EDITOR_ACCESS_TOKEN` is the simplest production authentication path. If you
prefer to initialize the editor password from the login page, omit
`EDITOR_ACCESS_TOKEN`, set `EDITOR_RUNTIME_AUTH_SETUP_TOKEN` to a one-time setup
secret, start the container, then open `/editor/login` and enter that setup
secret plus the new editor password. Do not enable
`EDITOR_ALLOW_RUNTIME_AUTH_SETUP=true` on a public production host unless the
host is otherwise isolated.
Environment-token logins issue random in-memory sessions, so keep one app
process per data directory unless you add sticky routing or shared session
storage.

Docker Compose sets `EDITOR_AUTH_INTERNAL_ORIGIN=http://127.0.0.1:3000` by
default so production middleware can verify runtime editor sessions without
trusting the public request Host header.

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
site settings, editor runtime auth settings, and `manifest.json`.

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

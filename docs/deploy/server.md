# Server Deployment

This is the recommended production path for the project.

## Architecture

```text
GitHub main -> GitHub Actions -> GHCR image -> server Docker Compose
                                      |
                                      v
                         git-deploy.sh updates deploy files
                                      |
                                      v
                         ./data mounted as /var/lib/blog-navigation
```

Cloudflare can sit in front of the server for DNS, TLS, and CDN. Runtime data
stays on the server filesystem and can be mirrored to R2.

The server does not build the application image. It only keeps a managed Git
checkout for deployment files and pulls the image built by GitHub Actions.

## First Deploy

```bash
mkdir -p /opt/blog-nevigation && cd /opt/blog-nevigation

curl -fsSL https://raw.githubusercontent.com/242282218/blog-nevigation/main/deploy/git-deploy.sh \
  -o /opt/blog-nevigation/git-deploy.sh
chmod +x /opt/blog-nevigation/git-deploy.sh

EDITOR_ACCESS_TOKEN="$(openssl rand -base64 32)"

cat > .env <<EOF
EDITOR_ACCESS_TOKEN=${EDITOR_ACCESS_TOKEN}
APP_PORT=3000
COOKIE_SECURE=true
TRUSTED_PROXY_IPS=
R2_BACKUP_ENABLED=false
EOF

DEPLOY_PATH=/opt/blog-nevigation /opt/blog-nevigation/git-deploy.sh
```

If the first start is on a private HTTP-only host, set `COOKIE_SECURE=false`
temporarily and change it back to `true` before exposing the editor over HTTPS.

Set `TRUSTED_PROXY_IPS` to the IP address of the reverse proxy directly in
front of the app. Login and search rate limits only trust forwarded client IP
headers from these proxies. Leave it empty only for direct-to-container traffic.

`EDITOR_ACCESS_TOKEN` is the simplest production authentication path. If you
prefer to initialize the editor password from the login page, omit
`EDITOR_ACCESS_TOKEN`, set `EDITOR_RUNTIME_AUTH_SETUP_TOKEN` to a one-time setup
secret, start the container, then open `/editor/login` and enter that setup
secret plus the new editor password. Do not enable
`EDITOR_ALLOW_RUNTIME_AUTH_SETUP=true` on a public production host unless the
host is otherwise isolated.
Environment-token logins store random session state under `BLOG_DATA_ROOT`. Keep
all app replicas on the same mounted data directory, or use sticky routing/a
single replica if that shared directory is unavailable.

## Update

```bash
DEPLOY_PATH=/opt/blog-nevigation /opt/blog-nevigation/git-deploy.sh
```

By default the script deploys the exact image tag for the current Git commit,
for example `main-<7-char-sha>`. Use `IMAGE_TAG=main` only when you explicitly
want the branch floating tag:

```bash
IMAGE_TAG=main DEPLOY_PATH=/opt/blog-nevigation /opt/blog-nevigation/git-deploy.sh
```

## Health Check

```bash
cd /opt/blog-nevigation
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
repo/
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

Server-side Git deployment can also be run directly over SSH:

```bash
ssh root@your-server 'DEPLOY_PATH=/opt/blog-nevigation /opt/blog-nevigation/git-deploy.sh'
```

The deployment job refuses to start if the build did not publish an immutable
image digest. After Docker Compose restarts the app, the workflow checks the
actual mapped port from `docker compose port app 3000`. If the new container
does not pass the health check, the workflow rolls back only when the previous
container has a valid `@sha256:` image digest, then runs the same health check
against the rollback container.

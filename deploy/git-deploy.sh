#!/usr/bin/env sh
set -eu

APP_NAME="blog-nevigation"
REPO_URL="${REPO_URL:-https://github.com/242282218/blog-nevigation.git}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/blog-nevigation}"
REPO_PATH="${REPO_PATH:-${DEPLOY_PATH}/repo}"
IMAGE_REPOSITORY="${IMAGE_REPOSITORY:-ghcr.io/242282218/blog-nevigation}"
HEALTHCHECK_TIMEOUT_SECONDS="${HEALTHCHECK_TIMEOUT_SECONDS:-90}"

COMPOSE_SOURCE="${REPO_PATH}/deploy/compose.prod.yaml"
COMPOSE_FILE="${DEPLOY_PATH}/compose.prod.yaml"
ENV_FILE="${DEPLOY_PATH}/.env"
DATA_DIR="${DEPLOY_PATH}/data"

log() {
  printf '\n==> %s\n' "$*"
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

compose() {
  if [ "${DEPLOY_IMAGE+x}" ]; then
    DEPLOY_IMAGE="${DEPLOY_IMAGE}" docker compose \
      --env-file "${ENV_FILE}" \
      -f "${COMPOSE_FILE}" \
      "$@"
    return
  fi

  docker compose \
    --env-file "${ENV_FILE}" \
    -f "${COMPOSE_FILE}" \
    "$@"
}

ensure_tools() {
  need_cmd git
  need_cmd docker
  docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is required."
}

ensure_env_file() {
  mkdir -p "${DEPLOY_PATH}"

  if [ -f "${ENV_FILE}" ]; then
    return
  fi

  umask 077
  cat > "${ENV_FILE}" <<'EOF'
EDITOR_ACCESS_TOKEN=replace-with-a-long-random-secret
APP_PORT=3000
NEXT_PUBLIC_SITE_URL=
COOKIE_SECURE=true
R2_BACKUP_ENABLED=false
EOF

  fail "Created ${ENV_FILE}. Set EDITOR_ACCESS_TOKEN, then rerun this script."
}

update_repo() {
  if [ ! -d "${REPO_PATH}/.git" ]; then
    if [ -e "${REPO_PATH}" ] && [ "$(find "${REPO_PATH}" -mindepth 1 -maxdepth 1 2>/dev/null | head -n 1)" ]; then
      fail "${REPO_PATH} exists but is not an empty Git checkout."
    fi

    log "Cloning ${REPO_URL}#${DEPLOY_BRANCH}"
    git clone --branch "${DEPLOY_BRANCH}" --depth 1 "${REPO_URL}" "${REPO_PATH}"
    return
  fi

  log "Updating ${REPO_PATH}"
  git -C "${REPO_PATH}" remote set-url origin "${REPO_URL}"
  git -C "${REPO_PATH}" fetch --depth 1 origin "${DEPLOY_BRANCH}"
  git -C "${REPO_PATH}" checkout -B "${DEPLOY_BRANCH}" "origin/${DEPLOY_BRANCH}"
  git -C "${REPO_PATH}" reset --hard "origin/${DEPLOY_BRANCH}"
}

prepare_compose() {
  [ -f "${COMPOSE_SOURCE}" ] || fail "Missing compose file: ${COMPOSE_SOURCE}"

  mkdir -p "${DATA_DIR}"
  cp "${COMPOSE_SOURCE}" "${COMPOSE_FILE}"
}

resolve_image() {
  commit_short="$(git -C "${REPO_PATH}" rev-parse --short=7 HEAD)"
  tag_branch="$(printf '%s' "${DEPLOY_BRANCH}" | sed 's/[^A-Za-z0-9_.-]/-/g')"
  image_tag="${IMAGE_TAG:-${tag_branch}-${commit_short}}"
  printf '%s:%s\n' "${IMAGE_REPOSITORY}" "${image_tag}"
}

pull_image() {
  image="$1"
  attempts="${PULL_ATTEMPTS:-12}"
  delay_seconds="${PULL_RETRY_SECONDS:-10}"

  log "Pulling ${image}"
  i=1
  while [ "${i}" -le "${attempts}" ]; do
    if DEPLOY_IMAGE="${image}" compose pull app; then
      return
    fi

    if [ "${i}" -eq "${attempts}" ]; then
      fail "Could not pull ${image}. Check GitHub Actions and GHCR permissions."
    fi

    log "Image not ready yet; retrying in ${delay_seconds}s (${i}/${attempts})"
    sleep "${delay_seconds}"
    i=$((i + 1))
  done
}

current_container_image() {
  container_id="$(compose ps -q app 2>/dev/null || true)"
  if [ -z "${container_id}" ]; then
    return
  fi

  docker inspect --format '{{.Config.Image}}' "${container_id}" 2>/dev/null || true
}

healthcheck_url() {
  port="$(compose port app 3000 2>/dev/null | awk -F: 'END {print $NF}')"
  printf 'http://127.0.0.1:%s/\n' "${port:-3000}"
}

wait_for_healthcheck() {
  url="$1"
  now="$(date +%s)"
  deadline=$((now + HEALTHCHECK_TIMEOUT_SECONDS))

  log "Waiting for health check: ${url}"
  while [ "$(date +%s)" -le "${deadline}" ]; do
    if command -v curl >/dev/null 2>&1; then
      if curl --fail --silent --max-time 5 "${url}" >/dev/null 2>&1; then
        return 0
      fi
    elif command -v wget >/dev/null 2>&1; then
      if wget -q -O /dev/null "${url}" >/dev/null 2>&1; then
        return 0
      fi
    else
      fail "curl or wget is required for health checks."
    fi

    sleep 2
  done

  return 1
}

deploy_image() {
  image="$1"
  previous_image="$(current_container_image)"

  log "Starting ${APP_NAME} with ${image}"
  DEPLOY_IMAGE="${image}" compose up -d --force-recreate --remove-orphans app

  if wait_for_healthcheck "$(healthcheck_url)"; then
    log "Deployment succeeded"
    compose ps
    return
  fi

  log "Deployment health check failed"
  compose logs --tail=80 app || true

  if [ -n "${previous_image}" ]; then
    log "Rolling back to ${previous_image}"
    DEPLOY_IMAGE="${previous_image}" compose up -d --force-recreate --remove-orphans app
    wait_for_healthcheck "$(healthcheck_url)" || fail "Rollback health check failed."
  fi

  fail "Deployment failed."
}

main() {
  ensure_tools
  ensure_env_file
  update_repo
  prepare_compose

  image="$(resolve_image)"
  pull_image "${image}"
  deploy_image "${image}"

  log "Done"
}

main "$@"

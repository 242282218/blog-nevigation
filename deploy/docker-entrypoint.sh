#!/bin/sh
set -e

DATA_ROOT="${BLOG_DATA_ROOT:-/var/lib/blog-navigation}"

mkdir -p "$DATA_ROOT/articles" "$DATA_ROOT/navigation" "$DATA_ROOT/settings"

echo "[entrypoint] fixing ownership of $DATA_ROOT ..."
chown -R nextjs:nodejs "$DATA_ROOT"
echo "[entrypoint] done, dropping to nextjs"

exec su-exec nextjs "$@"

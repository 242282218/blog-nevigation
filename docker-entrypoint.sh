#!/bin/sh
set -e

DATA_ROOT="${BLOG_DATA_ROOT:-/var/lib/blog-navigation}"

echo "[entrypoint] fixing ownership of $DATA_ROOT ..."
chown -R nextjs:nodejs "$DATA_ROOT"
echo "[entrypoint] done, dropping to nextjs"

exec su-exec nextjs "$@"

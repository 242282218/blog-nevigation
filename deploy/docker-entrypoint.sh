#!/bin/sh
set -e

DATA_ROOT="${BLOG_DATA_ROOT:-/var/lib/blog-navigation}"

mkdir -p "$DATA_ROOT/articles" "$DATA_ROOT/navigation" "$DATA_ROOT/settings"

# Fix ownership only on first boot or after a data restore. A marker file
# records that the recursive chown has already run, so normal restarts with
# many media files stay fast.
MARKER="$DATA_ROOT/.ownership-fixed"

if [ ! -f "$MARKER" ] || ! su-exec nextjs test -r "$MARKER" 2>/dev/null; then
    echo "[entrypoint] fixing ownership of $DATA_ROOT ..."
    chown -R nextjs:nodejs "$DATA_ROOT"
    touch "$MARKER"
    chown nextjs:nodejs "$MARKER"
    echo "[entrypoint] done, dropping to nextjs"
else
    echo "[entrypoint] ownership already fixed, skipping recursive chown"
fi

exec su-exec nextjs "$@"

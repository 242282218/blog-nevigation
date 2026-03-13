#!/bin/sh
set -e

# Ensure the data directories are writable by the nextjs user (uid 1001).
# When host-mounted volumes are owned by root, the non-root container user
# cannot write to them. This entrypoint runs as root, fixes ownership,
# then drops privileges to nextjs via su-exec.

DATA_ROOT="${BLOG_DATA_ROOT:-/var/lib/blog-navigation}"

for dir in "$DATA_ROOT/articles" "$DATA_ROOT/navigation"; do
    if [ -d "$dir" ] && [ "$(stat -c '%u' "$dir")" != "1001" ]; then
        chown -R nextjs:nodejs "$dir"
    fi
done

exec su-exec nextjs "$@"

# Workspace cleanup and README rewrite design

## Goal

Reduce repository maintenance noise by removing local build artifacts, old project leftovers, and unreferenced legacy design assets. Rewrite the README so it accurately describes the current Next.js application, data boundaries, local workflow, validation commands, and Docker/GHCR deployment model.

## Cleanup scope

Remove local generated files and caches:

- `.next/`
- `dist/`
- `output/`
- `tsconfig.tsbuildinfo`
- `scripts/test/__pycache__/`
- nested legacy copy `blog-nevigation/`

Remove repository-tracked legacy leftovers that are not used by the current Next.js app:

- `content/posts/.vitepress/`
- `docs/design-system/`

Keep current source, seed content, deployment docs, planning docs, research docs, Docker docs, tests, and scripts.

## README structure

The rewritten README should cover:

1. Project purpose
2. Current stack
3. Runtime data model: seed content vs `BLOG_DATA_ROOT`
4. Local development
5. Common validation commands
6. Editor authentication and environment variables
7. Docker and production deployment
8. Backup and restore
9. Repository layout

## Validation

After cleanup and README rewrite, run the minimum sufficient checks:

- `npm run lint`
- `npm run typecheck`
- `npm run test:run`

Also check references to removed legacy paths and fix stale references if needed.

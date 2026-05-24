# Security and Quality Audit Optimization

Date: 2026-05-24

## Context

This round reviewed the current Next.js App Router project against the codebase,
official Next.js guidance, Vercel-style deployment practices, and common
patterns in mature open-source Next.js projects.

The highest-risk findings were in editor authentication and production
packaging:

- Public first-use editor setup could let an unauthenticated visitor claim the
  editor if no password was configured.
- Runtime editor sessions were deterministic and persisted in a reusable form.
- Production middleware runtime-auth fallback depended on the public request
  host.
- Docker build context excluded Markdown seed posts, which could make the
  production image lose built-in blog content.
- Lint/typecheck/test entry points were split between local scripts and CI.

## Chosen Approach

Use the smallest secure path that preserves existing deployments:

- Keep `EDITOR_ACCESS_TOKEN` as the simplest and highest-priority production
  authentication path.
- Add explicit runtime setup gates for deployments that do not want the editor
  password in `.env`.
- Store runtime editor passwords with `scrypt` and per-secret salt.
- Store only a hash of the active runtime session, rotate it on login, and
  revoke it on logout.
- In production middleware, use a configured internal origin for runtime session
  checks instead of trusting the public Host header.
- Keep React Hooks core lint rules enabled, but do not enable React Compiler
  rules for this React 18 / Next 14 codebase yet.
- Restore seed Markdown files to the Docker build context.

## Implemented Changes

- Added runtime editor auth storage in `src/lib/editor-auth-runtime.ts`.
- Updated `POST/PUT/GET/DELETE /api/editor-auth` for login, setup status,
  protected first-use initialization, session rotation, and logout revocation.
- Updated the login page to show one of three clear states: normal login,
  setup form, or locked setup.
- Hardened middleware runtime auth checks with `EDITOR_AUTH_INTERNAL_ORIGIN`.
- Added auth tests for setup gating, setup token rejection, no plaintext secret
  persistence, session rotation, logout revocation, and middleware Host trust.
- Added `typecheck` and `check` package scripts and aligned CI with them.
- Declared ESLint plugins as direct dev dependencies and restored
  `react-hooks/rules-of-hooks`.
- Fixed `.dockerignore` so `content/seeds/posts/**/*.md` is included in Docker
  builds.
- Updated deployment docs for runtime auth setup and the internal auth origin.

## Verification

Local verification completed:

- `npm run check`
- `npm run build`
- `git diff --check`

Docker CLI is not installed in the local environment, so Docker image validation
must be verified by GitHub Actions after pushing this change.

## Follow-up Backlog

- Add a CI Docker smoke step that starts the built image and probes `/blog` plus
  one known seed post URL.
- Decide whether to standardize on npm or migrate fully to pnpm, then enforce it
  with `packageManager` and CI.
- Consider adding a bounded Playwright smoke job in CI with screenshot artifacts.
- Audit npm vulnerabilities and upgrade dependencies without `--force` first.

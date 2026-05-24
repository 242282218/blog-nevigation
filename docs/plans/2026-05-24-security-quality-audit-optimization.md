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
  rules for this React 18 / Next 15 codebase yet.
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
- Updated editor Playwright verification scripts to authenticate through
  `/api/editor-auth` instead of hand-built session cookies.
- Added npm smoke entry points for public and editor Playwright verification
  scripts so UI checks can be run consistently on local or test hosts.
- Added a bounded `UI Smoke` GitHub Actions workflow that builds the app, runs
  the public Playwright smoke script against `next start`, and uploads
  screenshots and server logs as failure artifacts.
- Hardened runtime data reads so corrupt or structurally invalid JSON fails
  explicitly instead of being treated as empty articles, default settings, or
  seed navigation data.
- Removed navigation seed write-back from read paths and switched missing
  manifest revisions to deterministic derived revisions, keeping read paths
  side-effect free while preserving write conflict checks.
- Added `typecheck` and `check` package scripts and aligned CI with them.
- Declared ESLint plugins as direct dev dependencies and restored
  `react-hooks/rules-of-hooks`.
- Fixed `.dockerignore` so `content/seeds/posts/**/*.md` is included in Docker
  builds.
- Updated deployment docs for runtime auth setup and the internal auth origin.

## Dependency Audit Follow-up

The next review pass focused on dependency risk without using
`npm audit fix --force`:

- Upgraded `next` and `eslint-config-next` from `14.2.x` to `15.5.18`.
- Migrated the App Router request APIs touched by the project to the Next 15
  async form: login `searchParams`, `cookies()`, and post route `params`.
- Upgraded Vite to `7.3.2` and pinned patched transitive versions through npm
  `overrides` for `brace-expansion`, `picomatch`, `flatted`, and `undici`.
- Moved CI and Docker builds from Node 20 to Node 24 after confirming Node 20
  is end-of-life as of 2026-04-30.
- Upgraded GitHub Actions JavaScript actions to Node 24-native major versions
  ahead of GitHub's forced runner migration.
- Standardized local installs on `.nvmrc` Node 24 and `npm@11.6.2`.
- Added `npm run audit:high` and wired it into CI so high and critical
  dependency advisories fail the build.

`npm audit` still reports two moderate advisories through Next's internal
`postcss@8.4.31`. The audit-proposed fix is to downgrade Next to `9.3.3`,
which is not an acceptable security or compatibility path. The current
enforced threshold is high/critical while this upstream Next dependency remains
fixed below the patched PostCSS line.

## Verification

Local verification completed:

- `npm run check`
- `npm run build`
- `npm run audit:high`
- `BASE_URL=http://127.0.0.1:<port> npm run smoke:ui`
- `git diff --check`

Docker CLI is not installed in the local environment, so Docker image validation
must be verified by GitHub Actions after pushing this change.

## Follow-up Backlog

- Consider adding authenticated editor smoke coverage to CI once the browser
  runtime cost and secret handling are acceptable.
- Revisit the remaining moderate Next/PostCSS audit item when Next publishes a
  version that no longer vendors the vulnerable PostCSS range.

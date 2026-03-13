# Repository Architecture Design

## Goal

Reshape the repository into an open-source friendly Next.js project that supports both local development and Docker deployment without committing runtime editor data.

## Decisions

1. The repository root remains the project root.
2. Application source moves under `src/`.
3. Static assets move to `public/`.
4. Seed content lives under `content/seeds/`.
5. Runtime editor data stays outside the repository through `BLOG_DATA_ROOT`.
6. Docker uses `/var/lib/blog-navigation` as the container data root.
7. The project name is standardized as `blog-navigation`.

## Target Structure

```text
src/
  app/
  lib/
content/
  seeds/
    posts/
    navigation/
public/
docs/
  design-system/
  plans/
tests/
```

## Migration Scope

- Move `app/` to `src/app/`.
- Move `lib/` to `src/lib/`.
- Move `middleware.ts` to `src/middleware.ts`.
- Move public assets out of `content/posts/public/`.
- Move committed seed data to `content/seeds/`.
- Replace `docker-compose.yml` with `compose.yaml`.
- Update path aliases, test paths, build paths, and Docker data paths.

## Runtime Data Policy

- Local default: `${HOME}/.blog-navigation`
- Docker default: `/var/lib/blog-navigation`
- Data written by the editor is not committed to Git.

## Follow-up

This migration establishes the new repository boundary and source root.
A later phase can further split `src/app` internals into `features/` and `shared/` without changing the external runtime contract.

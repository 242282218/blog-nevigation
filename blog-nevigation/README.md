# blog-navigation

A Next.js blog and navigation site with a built-in editor, local development flow, and Docker deployment support.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Runtime editor data is stored outside the repository through `BLOG_DATA_ROOT`.

## Repository structure

```text
src/              Next.js app source and shared libraries
content/seeds/    Seed posts and navigation data committed to Git
public/           Static assets served by Next.js
tests/            Vitest test suites
docs/             Supporting project docs and design system assets
scripts/          Utility scripts
```

## Runtime data

- Local development: set `BLOG_DATA_ROOT` in `.env.local` to an absolute path outside the project
- Docker default: `/var/lib/blog-navigation`

Set `EDITOR_ACCESS_TOKEN` to unlock the editor routes.

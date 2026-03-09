# Docker

## Build

```bash
docker build -t blog-navigation .
```

## Run

```bash
docker run -p 3000:3000 \
  -e EDITOR_ACCESS_TOKEN=change-me \
  -e BLOG_DATA_ROOT=/var/lib/blog-navigation \
  blog-navigation
```

## Compose

```bash
cp .env.example .env
docker compose up --build
```

The compose stack uses a named volume mounted at `/var/lib/blog-navigation`.
Runtime editor data stays outside the repository.
Public blog articles and editor articles share the same runtime data under `/var/lib/blog-navigation/articles`.

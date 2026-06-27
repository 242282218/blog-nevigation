FROM node:24-alpine AS deps

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./

RUN npm ci --prefer-offline --no-audit && \
    npm cache clean --force && \
    rm -rf /root/.npm /tmp/*

FROM node:24-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json next.config.mjs tsconfig.json postcss.config.mjs tailwind.config.ts vitest.config.ts eslint.config.mjs ./
COPY src ./src
COPY public ./public
COPY content ./content
COPY tests ./tests

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Docker builds keep the same quality gates as CI so image artifacts cannot bypass them.
RUN npm run lint && \
    npm run typecheck && \
    npm run build && \
    rm -rf node_modules/.cache /tmp/*

FROM node:24-alpine AS runner

WORKDIR /app

ARG APP_VERSION=unknown
ARG APP_IMAGE_TAG=unknown
ARG APP_REVISION=unknown
ARG APP_BUILD_TIME=unknown

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV BLOG_DATA_ROOT=/var/lib/blog-navigation
ENV BLOG_NAVIGATION_DOCKER=true
ENV BLOG_NAVIGATION_VERSION=${APP_VERSION}
ENV BLOG_NAVIGATION_IMAGE_TAG=${APP_IMAGE_TAG}
ENV BLOG_NAVIGATION_REVISION=${APP_REVISION}
ENV BLOG_NAVIGATION_BUILD_TIME=${APP_BUILD_TIME}
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache curl su-exec && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /var/lib/blog-navigation/articles /var/lib/blog-navigation/navigation /var/lib/blog-navigation/settings && \
    chown -R nextjs:nodejs /var/lib/blog-navigation && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack && \
    rm -rf /var/cache/apk/* /tmp/*

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/content/seeds ./content/seeds
COPY --chmod=755 deploy/docker-entrypoint.sh /usr/local/bin/
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/ || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]

EXPOSE 3000

CMD ["node", "server.js"]

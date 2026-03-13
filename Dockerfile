FROM node:20-alpine AS deps

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./

RUN npm ci --legacy-peer-deps --prefer-offline --no-audit --no-optional && \
    npm cache clean --force && \
    rm -rf /root/.npm /tmp/*

FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json next.config.mjs tsconfig.json postcss.config.mjs tailwind.config.ts ./
COPY src ./src
COPY public ./public
COPY content ./content

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build && \
    rm -rf node_modules/.cache /tmp/*

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV BLOG_DATA_ROOT=/var/lib/blog-navigation
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache su-exec && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /var/lib/blog-navigation/articles /var/lib/blog-navigation/navigation && \
    chown -R nextjs:nodejs /var/lib/blog-navigation && \
    rm -rf /var/cache/apk/* /tmp/*

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/content/seeds ./content/seeds
COPY docker-entrypoint.sh /usr/local/bin/

ENTRYPOINT ["docker-entrypoint.sh"]

EXPOSE 3000

CMD ["node", "server.js"]

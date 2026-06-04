import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();

function resolveRepoPath(...segments: string[]) {
    return path.join(repoRoot, ...segments);
}

describe('repository structure migration', () => {
    it('moves application source into src and publishes runtime assets from stable paths', () => {
        const requiredPaths = [
            resolveRepoPath('src', 'app', 'page.tsx'),
            resolveRepoPath('src', 'app', 'layout.tsx'),
            resolveRepoPath('src', 'lib', 'markdown.ts'),
            resolveRepoPath('src', 'middleware.ts'),
            resolveRepoPath('content', 'seeds', 'posts'),
            resolveRepoPath('content', 'seeds', 'navigation', 'data', 'tools.json'),
            resolveRepoPath('public', 'logo.svg'),
            resolveRepoPath('public', 'favicon.ico'),
            resolveRepoPath('compose.yaml'),
            resolveRepoPath('.nvmrc'),
        ];

        requiredPaths.forEach((targetPath) => {
            expect(fs.existsSync(targetPath), `${targetPath} should exist`).toBe(true);
        });
    });

    it('removes legacy root source directories after the migration', () => {
        const legacyPaths = [
            resolveRepoPath('app'),
            resolveRepoPath('lib'),
            resolveRepoPath('middleware.ts'),
        ];

        legacyPaths.forEach((targetPath) => {
            expect(fs.existsSync(targetPath), `${targetPath} should be removed`).toBe(false);
        });
    });

    it('uses resource endpoints for remote backup actions while isolating legacy action dispatch', () => {
        const remoteRoute = fs.readFileSync(resolveRepoPath('src', 'app', 'api', 'data', 'backup', 'remote', 'route.ts'), 'utf8');
        const editorHome = fs.readFileSync(resolveRepoPath('src', 'app', 'editor', '(authenticated)', 'page.tsx'), 'utf8');
        const r2SettingsPanel = fs.readFileSync(
            resolveRepoPath('src', 'app', 'editor', '(authenticated)', 'settings', 'CloudflareR2SettingsPanel.tsx'),
            'utf8'
        );

        expect(fs.existsSync(resolveRepoPath('src', 'app', 'api', 'data', 'backup', 'remote', 'sync', 'route.ts'))).toBe(true);
        expect(fs.existsSync(resolveRepoPath('src', 'app', 'api', 'data', 'backup', 'remote', 'restore', 'route.ts'))).toBe(true);
        expect(remoteRoute).toContain('parseRemoteBackupAction');
        expect(editorHome).toContain('/api/data/backup/remote/sync');
        expect(editorHome).toContain('/api/data/backup/remote/restore');
        expect(r2SettingsPanel).toContain('/api/data/backup/remote/${action}');
        expect(editorHome).not.toContain("JSON.stringify({ action: 'sync'");
        expect(editorHome).not.toContain("JSON.stringify({ action: 'restore'");
        expect(r2SettingsPanel).not.toContain('JSON.stringify({ action, currentManifest })');
    });

    it('keeps public request paths on asynchronous data reads', () => {
        const publicEntryFiles = [
            resolveRepoPath('src', 'app', 'page.tsx'),
            resolveRepoPath('src', 'app', 'blog', 'page.tsx'),
            resolveRepoPath('src', 'app', 'posts', '[...slug]', 'page.tsx'),
            resolveRepoPath('src', 'app', 'navigation', 'page.tsx'),
            resolveRepoPath('src', 'app', 'api', 'search', 'route.ts'),
            resolveRepoPath('src', 'app', 'layout.tsx'),
        ];

        publicEntryFiles.forEach((filePath) => {
            const source = fs.readFileSync(filePath, 'utf8');

            expect(source, filePath).not.toMatch(/\bgetPosts\b/);
            expect(source, filePath).not.toMatch(/\bgetPostBySlugArray\b/);
            expect(source, filePath).not.toMatch(/\bgetRelatedPosts\b/);
            expect(source, filePath).not.toMatch(/\breadNavigationFromDisk\b/);
            expect(source, filePath).not.toMatch(/\breadSiteSettingsFromDisk\b/);
        });

        expect(fs.readFileSync(resolveRepoPath('src', 'app', 'page.tsx'), 'utf8')).toContain('getPostsAsync');
        expect(fs.readFileSync(resolveRepoPath('src', 'app', 'navigation', 'page.tsx'), 'utf8')).toContain('readNavigationFromDiskAsync');
        expect(fs.readFileSync(resolveRepoPath('src', 'app', 'api', 'search', 'route.ts'), 'utf8')).toContain('readNavigationFromDiskAsync');
    });

    it('keeps production deployment and data migration boundaries explicit', () => {
        const dockerIgnore = fs.readFileSync(resolveRepoPath('.dockerignore'), 'utf8');
        const dockerfile = fs.readFileSync(resolveRepoPath('Dockerfile'), 'utf8');
        const dockerEntrypoint = fs.readFileSync(resolveRepoPath('deploy', 'docker-entrypoint.sh'), 'utf8');
        const localCompose = fs.readFileSync(resolveRepoPath('compose.yaml'), 'utf8');
        const dockerDocs = fs.readFileSync(resolveRepoPath('docs', 'deploy', 'Docker补充说明.md'), 'utf8');
        const envExample = fs.readFileSync(resolveRepoPath('.env.example'), 'utf8');
        const nodeVersion = fs.readFileSync(resolveRepoPath('.nvmrc'), 'utf8').trim();
        const packageJson = JSON.parse(fs.readFileSync(resolveRepoPath('package.json'), 'utf8')) as {
            packageManager?: string;
            scripts?: Record<string, string>;
        };
        const nextConfig = fs.readFileSync(resolveRepoPath('next.config.mjs'), 'utf8');
        const deployCompose = fs.readFileSync(resolveRepoPath('deploy', 'compose.prod.yaml'), 'utf8');
        const deployScript = fs.readFileSync(resolveRepoPath('deploy', 'git-deploy.sh'), 'utf8');
        const deployWorkflow = fs.readFileSync(resolveRepoPath('.github', 'workflows', 'docker-deploy.yml'), 'utf8');
        const uiSmokeWorkflow = fs.readFileSync(resolveRepoPath('.github', 'workflows', 'ui-smoke.yml'), 'utf8');
        const readme = fs.readFileSync(resolveRepoPath('README.md'), 'utf8');
        const r2Docs = fs.readFileSync(resolveRepoPath('docs', 'deploy', 'Cloudflare-R2备份.md'), 'utf8');
        const serverDocs = fs.readFileSync(resolveRepoPath('docs', 'deploy', '服务器部署.md'), 'utf8');
        const migrationDocs = fs.readFileSync(resolveRepoPath('docs', 'deploy', '数据迁移.md'), 'utf8');

        expect(dockerIgnore).toMatch(/^data$/m);
        expect(dockerIgnore).toMatch(/^output$/m);
        expect(dockerIgnore).toMatch(/^\.env$/m);
        expect(dockerIgnore).toMatch(/^\.env\.\*$/m);
        expect(nodeVersion).toBe('24');
        expect(packageJson.packageManager).toBe('npm@11.6.2');
        expect(packageJson.scripts?.start).toBe('node scripts/start-standalone.mjs');
        expect(packageJson.scripts?.check).toContain('npm run check:env');
        expect(packageJson.scripts?.['check:env']).toBe('node scripts/test/check-env-files.mjs');
        expect(fs.readFileSync(resolveRepoPath('scripts', 'test', 'check-env-files.mjs'), 'utf8')).toContain('.env.local');
        expect(dockerfile).toContain('FROM node:24-alpine AS deps');
        expect(dockerfile).toContain('FROM node:24-alpine AS builder');
        expect(dockerfile).toContain('FROM node:24-alpine AS runner');
        expect(dockerfile).toContain('RUN npm ci --prefer-offline --no-audit');
        expect(dockerfile).not.toContain('--legacy-peer-deps');
        expect(dockerfile).toContain('npm run lint');
        expect(dockerfile).toContain('npm run typecheck');
        expect(dockerfile).toContain('npm run build');
        expect(dockerfile).not.toContain('ignoreDuringBuilds: true');
        expect(dockerfile).not.toContain('ignoreBuildErrors: true');
        expect(dockerfile).not.toContain('--no-optional');
        expect(dockerfile).toContain('COPY package.json package-lock.json next.config.mjs tsconfig.json postcss.config.mjs tailwind.config.ts vitest.config.ts eslint.config.mjs ./');
        expect(dockerfile).toContain('COPY tests ./tests');
        expect(dockerIgnore).not.toMatch(/^tests$/m);
        expect(dockerIgnore).not.toMatch(/^\*\.test\.ts$/m);
        expect(dockerIgnore).not.toMatch(/^\*\.test\.tsx$/m);
        expect(dockerIgnore).not.toMatch(/^eslint\.config\.mjs$/m);
        expect(dockerIgnore).not.toMatch(/^vitest\.config\.ts$/m);
        expect(dockerfile).toContain('COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./');
        expect(dockerfile).toContain('COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static');
        expect(dockerfile).toContain('COPY --from=builder --chown=nextjs:nodejs /app/public ./public');
        expect(dockerfile).toContain('COPY --from=builder --chown=nextjs:nodejs /app/content/seeds ./content/seeds');
        expect(dockerfile).toContain('COPY --chmod=755 deploy/docker-entrypoint.sh /usr/local/bin/');
        expect(dockerfile).toContain('ENTRYPOINT ["docker-entrypoint.sh"]');
        expect(dockerfile).toContain('CMD ["node", "server.js"]');
        expect(dockerEntrypoint).toContain('mkdir -p "$DATA_ROOT/articles" "$DATA_ROOT/navigation" "$DATA_ROOT/settings"');
        expect(dockerEntrypoint).toContain('chown -R nextjs:nodejs "$DATA_ROOT"');
        expect(dockerEntrypoint).toContain('exec su-exec nextjs "$@"');
        expect(localCompose).toContain('COOKIE_SECURE: ${COOKIE_SECURE:-true}');
        expect(localCompose).toContain('127.0.0.1:${APP_PORT:-3000}:3000');
        expect(localCompose).toContain('NEXT_PUBLIC_SITE_URL: ${NEXT_PUBLIC_SITE_URL:-}');
        expect(localCompose).toContain('TRUSTED_PROXY_IPS: ${TRUSTED_PROXY_IPS:-}');
        expect(localCompose).toContain('R2_BACKUP_ENCRYPTION_KEY: ${R2_BACKUP_ENCRYPTION_KEY:-}');
        expect(localCompose).toContain('R2_ALLOW_PLAINTEXT_BACKUP: ${R2_ALLOW_PLAINTEXT_BACKUP:-false}');
        expect(localCompose).not.toContain('EDITOR_AUTH_INTERNAL_ORIGIN');
        expect(envExample).toContain('EDITOR_ACCESS_TOKEN=local-dev-only-secret');
        expect(envExample).toContain('COOKIE_SECURE=false');
        expect(envExample).toContain('TRUSTED_PROXY_IPS=');
        expect(envExample).toContain('NEXT_PUBLIC_SITE_URL=http://localhost:3000');
        expect(envExample).toContain('R2_BACKUP_ENCRYPTION_KEY=');
        expect(envExample).toContain('R2_ALLOW_PLAINTEXT_BACKUP=false');
        expect(envExample).not.toContain('EDITOR_ACCESS_TOKEN=change-me');
        expect(dockerDocs).toContain('EDITOR_ACCESS_TOKEN="$(openssl rand -base64 32)"');
        expect(dockerDocs).not.toContain('EDITOR_AUTH_INTERNAL_ORIGIN');
        expect(dockerDocs).toContain('-e COOKIE_SECURE=false');
        expect(dockerDocs).toContain('deploy/compose.prod.yaml');
        expect(dockerDocs).not.toContain('EDITOR_ACCESS_TOKEN=change-me');
        expect(nextConfig).toContain('Referrer-Policy');
        expect(nextConfig).toContain('strict-origin-when-cross-origin');
        expect(nextConfig).toContain('X-Content-Type-Options');
        expect(nextConfig).toContain('nosniff');
        expect(nextConfig).toContain('X-Frame-Options');
        expect(nextConfig).toContain('DENY');
        expect(nextConfig).toContain('Permissions-Policy');
        expect(nextConfig).toContain('camera=(), microphone=(), geolocation=()');
        const middleware = fs.readFileSync(resolveRepoPath('src', 'middleware.ts'), 'utf8');
        expect(middleware).toContain('Content-Security-Policy');
        expect(middleware).toContain("default-src 'self'");
        expect(middleware).toContain("'nonce-${nonce}'");
        expect(middleware).toContain('strict-dynamic');
        expect(nextConfig).not.toContain("script-src 'self';");
        expect(nextConfig).not.toContain('ignoreDuringBuilds');
        expect(nextConfig).not.toContain('unoptimized: true');
        expect(deployCompose).toContain('BLOG_DATA_ROOT: /var/lib/blog-navigation');
        expect(deployCompose).toContain('./data:/var/lib/blog-navigation');
        expect(deployCompose).toContain('NEXT_PUBLIC_SITE_URL: ${NEXT_PUBLIC_SITE_URL:-}');
        expect(deployCompose).toContain('COOKIE_SECURE: ${COOKIE_SECURE:-true}');
        expect(deployCompose).not.toContain('COOKIE_SECURE: ${COOKIE_SECURE:-false}');
        expect(deployCompose).toContain('TRUSTED_PROXY_IPS: ${TRUSTED_PROXY_IPS:-}');
        expect(deployCompose).toContain('R2_BACKUP_ENCRYPTION_KEY: ${R2_BACKUP_ENCRYPTION_KEY:-}');
        expect(deployCompose).toContain('R2_ALLOW_PLAINTEXT_BACKUP: ${R2_ALLOW_PLAINTEXT_BACKUP:-false}');
        expect(deployScript).toContain('NEXT_PUBLIC_SITE_URL=');
        expect(deployWorkflow).toContain('# actions/checkout@v6');
        expect(deployWorkflow).toContain('# actions/setup-node@v6');
        expect(deployWorkflow).toContain('npm run check:env');
        expect(deployWorkflow).toContain('npm run test:coverage');
        expect(deployWorkflow).not.toContain('npm run test:run');
        expect(deployWorkflow).toContain('# docker/setup-buildx-action@v4');
        expect(deployWorkflow).toContain('# docker/login-action@v4');
        expect(deployWorkflow).toContain('# docker/metadata-action@v6');
        expect(deployWorkflow).toContain('# docker/build-push-action@v7');
        expect(deployWorkflow).not.toMatch(/uses:\s+[^@\n]+@v\d+/);
        expect(deployWorkflow).toContain('docker compose -f compose.prod.yaml port app 3000');
        expect(deployWorkflow).toContain('HEALTHCHECK_URL');
        expect(deployWorkflow).toContain('Build did not produce an image digest; refusing to deploy.');
        expect(deployWorkflow).toContain('wait_for_healthcheck "${HEALTHCHECK_URL}" "deployment"');
        expect(deployWorkflow).toContain('wait_for_healthcheck "${ROLLBACK_HEALTHCHECK_URL}" "rollback"');
        expect(deployWorkflow).toContain('No valid previous image digest is available; rollback skipped.');
        expect(deployWorkflow).toContain("PREV_IMAGE=$(docker inspect --format='{{.Config.Image}}'");
        expect(deployWorkflow).toContain('PREV_IMAGE_ID=$(docker inspect');
        expect(deployWorkflow).toContain('docker image inspect');
        expect(deployWorkflow).not.toMatch(/curl[^\n]+http:\/\/127\.0\.0\.1:3000\//);
        expect(uiSmokeWorkflow).not.toContain('EDITOR_AUTH_INTERNAL_ORIGIN');
        expect(uiSmokeWorkflow).not.toMatch(/uses:\s+[^@\n]+@v\d+/);
        expect(uiSmokeWorkflow).toContain('run: npm ci');
        expect(uiSmokeWorkflow).toContain('npm run start');
        expect(uiSmokeWorkflow).not.toContain('next start');
        expect(migrationDocs).toContain('data .env compose.prod.yaml');
        expect(migrationDocs).toContain('npm run data:verify -- /opt/blog-nevigation/data');
        expect(readme).toContain('data/settings/cloudflare-r2.json');
        expect(readme).toContain('完整优先于 `.env`');
        expect(r2Docs).toContain('完整的 R2 配置来源');
        expect(r2Docs).toContain('不会作为字段级 fallback');
        expect(r2Docs).toContain('快速失败');
        expect(r2Docs).toContain('R2_BACKUP_ENCRYPTION_KEY');
        expect(r2Docs).toContain('默认必须配置');
        expect(r2Docs).toContain('R2_ALLOW_PLAINTEXT_BACKUP=true');
        expect(serverDocs).toContain('构建没有发布不可变镜像 digest 时拒绝启动');
        expect(serverDocs).toContain('执行同样的健康检查');
        expect(serverDocs).toContain('同一个数据目录');
        expect(serverDocs).toContain('openssl rand -base64 32');
        expect(serverDocs).toContain('COOKIE_SECURE=true');
        expect(serverDocs).toContain('NEXT_PUBLIC_SITE_URL=https://your-domain.example');
        expect(serverDocs).toContain('生成 metadata、robots 和 sitemap');
        expect(serverDocs).toContain('TRUSTED_PROXY_IPS');
        expect(serverDocs).not.toContain('EDITOR_ACCESS_TOKEN=change-me');
        expect(migrationDocs).toContain('生产工具 URL 必须是 HTTPS');
        expect(migrationDocs).toContain('无效备份包会在替换目标运行时数据前失败');
    });
});

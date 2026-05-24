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

    it('keeps production deployment and data migration boundaries explicit', () => {
        const dockerIgnore = fs.readFileSync(resolveRepoPath('.dockerignore'), 'utf8');
        const dockerfile = fs.readFileSync(resolveRepoPath('Dockerfile'), 'utf8');
        const dockerEntrypoint = fs.readFileSync(resolveRepoPath('docker-entrypoint.sh'), 'utf8');
        const nextConfig = fs.readFileSync(resolveRepoPath('next.config.mjs'), 'utf8');
        const deployCompose = fs.readFileSync(resolveRepoPath('deploy', 'compose.prod.yaml'), 'utf8');
        const deployWorkflow = fs.readFileSync(resolveRepoPath('.github', 'workflows', 'docker-deploy.yml'), 'utf8');
        const readme = fs.readFileSync(resolveRepoPath('README.md'), 'utf8');
        const r2Docs = fs.readFileSync(resolveRepoPath('docs', 'deploy', 'cloudflare-r2.md'), 'utf8');
        const serverDocs = fs.readFileSync(resolveRepoPath('docs', 'deploy', 'server.md'), 'utf8');
        const migrationDocs = fs.readFileSync(resolveRepoPath('docs', 'deploy', 'migration.md'), 'utf8');

        expect(dockerIgnore).toMatch(/^data$/m);
        expect(dockerIgnore).toMatch(/^output$/m);
        expect(dockerIgnore).toMatch(/^\.env$/m);
        expect(dockerIgnore).toMatch(/^\.env\.\*$/m);
        expect(dockerfile).toContain('FROM node:24-alpine AS deps');
        expect(dockerfile).toContain('FROM node:24-alpine AS builder');
        expect(dockerfile).toContain('FROM node:24-alpine AS runner');
        expect(dockerfile).toContain('COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./');
        expect(dockerfile).toContain('COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static');
        expect(dockerfile).toContain('COPY --from=builder --chown=nextjs:nodejs /app/public ./public');
        expect(dockerfile).toContain('COPY --from=builder --chown=nextjs:nodejs /app/content/seeds ./content/seeds');
        expect(dockerfile).toContain('ENTRYPOINT ["docker-entrypoint.sh"]');
        expect(dockerfile).toContain('CMD ["node", "server.js"]');
        expect(dockerEntrypoint).toContain('mkdir -p "$DATA_ROOT/articles" "$DATA_ROOT/navigation" "$DATA_ROOT/settings"');
        expect(dockerEntrypoint).toContain('chown -R nextjs:nodejs "$DATA_ROOT"');
        expect(dockerEntrypoint).toContain('exec su-exec nextjs "$@"');
        expect(nextConfig).toContain('Referrer-Policy');
        expect(nextConfig).toContain('strict-origin-when-cross-origin');
        expect(nextConfig).toContain('X-Content-Type-Options');
        expect(nextConfig).toContain('nosniff');
        expect(nextConfig).toContain('X-Frame-Options');
        expect(nextConfig).toContain('DENY');
        expect(nextConfig).toContain('Permissions-Policy');
        expect(nextConfig).toContain('camera=(), microphone=(), geolocation=()');
        expect(deployCompose).toContain('BLOG_DATA_ROOT: /var/lib/blog-navigation');
        expect(deployCompose).toContain('./data:/var/lib/blog-navigation');
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
        expect(migrationDocs).toContain('data .env compose.prod.yaml');
        expect(migrationDocs).toContain('npm run data:verify -- /opt/blog-nevigation/data');
        expect(readme).toContain('data/settings/cloudflare-r2.json');
        expect(readme).toContain('完整优先于 `.env`');
        expect(r2Docs).toContain('complete R2');
        expect(r2Docs).toContain('configuration source');
        expect(r2Docs).toContain('not used as field fallbacks');
        expect(serverDocs).toContain('refuses to start if the build did not publish an immutable');
        expect(serverDocs).toContain('then runs the same health check');
        expect(serverDocs).toContain('against the rollback container');
        expect(migrationDocs).toContain('tool URLs must be HTTPS');
        expect(migrationDocs).toContain('Invalid backup packages fail before');
        expect(migrationDocs).toContain('replacing the target runtime data');
    });
});

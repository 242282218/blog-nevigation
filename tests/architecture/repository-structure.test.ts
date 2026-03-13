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
});

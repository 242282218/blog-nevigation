import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const tempDirectories: string[] = [];

function createTempDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-navigation-data-script-'));
  tempDirectories.push(directory);
  return directory;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

afterEach(() => {
  while (tempDirectories.length > 0) {
    fs.rmSync(tempDirectories.pop() as string, { recursive: true, force: true });
  }
});

describe('runtime data migration scripts', () => {
  it('exports and imports the portable backup envelope', () => {
    const sourceRoot = createTempDirectory();
    const targetRoot = createTempDirectory();
    const backupPath = path.join(createTempDirectory(), 'backup.json');
    const article = {
      id: 'article-1',
      title: 'Portable Article',
      date: '2026-05-22',
      description: 'Migration test',
      tags: ['migration'],
      content: '# Portable Article',
      createdAt: 1,
      updatedAt: 2,
    };
    const navigation = [
      {
        name: 'Docs',
        icon: 'book',
        slug: 'docs',
        tools: [],
      },
    ];
    const settings = {
      siteName: 'Portable Site',
      siteDescription: 'Portable settings',
      workspaceLabel: 'workspace / portable',
      heroTitleLineOne: 'Portable',
      heroTitleLineTwo: 'Runtime Data',
      heroDescription: 'Settings travel with the backup envelope.',
    };

    writeJson(path.join(sourceRoot, 'articles', 'articles.json'), [article]);
    writeJson(path.join(sourceRoot, 'navigation', 'tools.json'), navigation);
    writeJson(path.join(sourceRoot, 'settings', 'site.json'), settings);

    execFileSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'data', 'export-runtime-data.mjs'), sourceRoot, backupPath],
      { encoding: 'utf8' }
    );

    const payload = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    expect(payload).toEqual(
      expect.objectContaining({
        version: 1,
        source: 'local',
        data: {
          articles: [
            expect.objectContaining({
              ...article,
              slug: expect.any(String),
            }),
          ],
          navigation,
          settings,
        },
      })
    );

    execFileSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'data', 'import-runtime-data.mjs'), backupPath, targetRoot],
      { encoding: 'utf8' }
    );

    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'articles', 'articles.json'), 'utf8'))).toEqual([
      expect.objectContaining({
        ...article,
        slug: expect.any(String),
      }),
    ]);
    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'navigation', 'tools.json'), 'utf8'))).toEqual(navigation);
    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'settings', 'site.json'), 'utf8'))).toEqual(settings);
  });
});

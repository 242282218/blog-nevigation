import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getArticles, PUT as putArticles } from '@/app/api/data/articles/route';
import { GET as getNavigation, PUT as putNavigation } from '@/app/api/data/navigation/route';
import { GET as getSettings, PUT as putSettings } from '@/app/api/data/settings/route';
import { syncCurrentBackupToRemote } from '@/lib/editor-remote-backup';
import {
  cleanupTempDirectories,
  createAuthedEditorRequest,
  createTempDirectory,
  restoreEnv,
} from '../helpers/api-route';

vi.mock('@/lib/editor-remote-backup', () => ({
  syncCurrentBackupToRemote: vi.fn(),
}));

const mockedSyncCurrentBackupToRemote = vi.mocked(syncCurrentBackupToRemote);
const ORIGINAL_ENV = {
  BLOG_DATA_ROOT: process.env.BLOG_DATA_ROOT,
  EDITOR_ACCESS_TOKEN: process.env.EDITOR_ACCESS_TOKEN,
};
const tempDirectories: string[] = [];

function resetEnv(): void {
  restoreEnv(ORIGINAL_ENV);
}

function createTempDataRoot(): string {
  const directory = createTempDirectory('blog-navigation-editor-data-route-');
  tempDirectories.push(directory);
  return directory;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function writeText(filePath: string, value: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}

function createArticle(id: string, title: string) {
  return {
    id,
    title,
    date: '2026-05-24',
    description: `${title} description`,
    tags: ['test'],
    content: `# ${title}`,
    createdAt: 1,
    updatedAt: 2,
  };
}

function createSettings(siteName: string) {
  return {
    siteName,
    siteDescription: `${siteName} description`,
    workspaceLabel: 'workspace / test',
    heroTitleLineOne: 'Hero One',
    heroTitleLineTwo: 'Hero Two',
    heroDescription: 'Hero description',
  };
}

function seedRuntimeData(dataRoot: string): void {
  writeJson(path.join(dataRoot, 'articles', 'articles.json'), [createArticle('article-1', 'First Article')]);
  writeJson(path.join(dataRoot, 'navigation', 'tools.json'), []);
  writeJson(path.join(dataRoot, 'settings', 'site.json'), createSettings('Original Site'));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedSyncCurrentBackupToRemote.mockResolvedValue({
    enabled: false,
    success: false,
    message: 'R2 backup is disabled.',
  });
});

afterEach(() => {
  resetEnv();
  cleanupTempDirectories(tempDirectories);
});

describe('editor data write APIs', () => {
  it('reports corrupt article files without returning empty editor data', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    writeText(path.join(process.env.BLOG_DATA_ROOT, 'articles', 'articles.json'), '{');

    const response = await getArticles(await createAuthedEditorRequest('http://localhost/api/data/articles'));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual(
      expect.objectContaining({
        message: '服务器运行时数据文件损坏，请修复数据文件后重试。',
        resource: 'articles',
      })
    );
  });

  it('reports invalid navigation files without rewriting seed data', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    const navigationPath = path.join(process.env.BLOG_DATA_ROOT, 'navigation', 'tools.json');
    writeJson(navigationPath, { invalid: true });

    const response = await getNavigation(await createAuthedEditorRequest('http://localhost/api/data/navigation'));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual(
      expect.objectContaining({
        resource: 'navigation',
      })
    );
    expect(JSON.parse(fs.readFileSync(navigationPath, 'utf8'))).toEqual({ invalid: true });
  });

  it('reports invalid settings files without returning default settings', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    writeJson(path.join(process.env.BLOG_DATA_ROOT, 'settings', 'site.json'), {
      siteName: '',
    });

    const response = await getSettings(await createAuthedEditorRequest('http://localhost/api/data/settings'));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual(
      expect.objectContaining({
        resource: 'settings',
      })
    );
  });

  it('rejects malformed article JSON without writing or remote sync', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    seedRuntimeData(process.env.BLOG_DATA_ROOT);

    const existingArticles = fs.readFileSync(
      path.join(process.env.BLOG_DATA_ROOT, 'articles', 'articles.json'),
      'utf8'
    );

    const response = await putArticles(
      await createAuthedEditorRequest('http://localhost/api/data/articles', {
        method: 'PUT',
        body: '{',
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: '文章数据格式无效。',
      })
    );
    expect(fs.readFileSync(path.join(process.env.BLOG_DATA_ROOT, 'articles', 'articles.json'), 'utf8')).toBe(
      existingArticles
    );
    expect(mockedSyncCurrentBackupToRemote).not.toHaveBeenCalled();
  });

  it('requires the current revision before writing articles', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    seedRuntimeData(process.env.BLOG_DATA_ROOT);

    const response = await putArticles(
      await createAuthedEditorRequest('http://localhost/api/data/articles', {
        method: 'PUT',
        body: JSON.stringify({
          articles: [createArticle('article-2', 'Missing Revision Article')],
        }),
      })
    );

    expect(response.status).toBe(409);
    expect(mockedSyncCurrentBackupToRemote).not.toHaveBeenCalled();
    expect(JSON.parse(fs.readFileSync(path.join(process.env.BLOG_DATA_ROOT, 'articles', 'articles.json'), 'utf8'))).toEqual([
      expect.objectContaining({
        id: 'article-1',
      }),
    ]);
  });

  it('writes articles and triggers remote sync when the revision matches', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    seedRuntimeData(process.env.BLOG_DATA_ROOT);

    const current = await (await getArticles(await createAuthedEditorRequest('http://localhost/api/data/articles'))).json();
    const response = await putArticles(
      await createAuthedEditorRequest('http://localhost/api/data/articles', {
        method: 'PUT',
        body: JSON.stringify({
          revision: current.revision,
          articles: [createArticle('article-2', 'Next Article')],
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mockedSyncCurrentBackupToRemote).toHaveBeenCalledWith({
      reason: 'articles-write',
    });
  });

  it('rejects invalid navigation payloads without writing or remote sync', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    seedRuntimeData(process.env.BLOG_DATA_ROOT);

    const existingNavigation = fs.readFileSync(
      path.join(process.env.BLOG_DATA_ROOT, 'navigation', 'tools.json'),
      'utf8'
    );

    const response = await putNavigation(
      await createAuthedEditorRequest('http://localhost/api/data/navigation', {
        method: 'PUT',
        body: JSON.stringify({
          categories: [
            {
              name: 'Invalid',
              icon: 'book',
              slug: 'invalid',
              tools: [
                {
                  icon: 'link',
                  title: 'Insecure URL',
                  description: 'Invalid navigation payload',
                  url: 'http://example.com',
                  tags: ['test'],
                },
              ],
            },
          ],
          revision: 'stale-revision',
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: '导航数据格式无效。',
      })
    );
    expect(fs.readFileSync(path.join(process.env.BLOG_DATA_ROOT, 'navigation', 'tools.json'), 'utf8')).toBe(
      existingNavigation
    );
    expect(mockedSyncCurrentBackupToRemote).not.toHaveBeenCalled();
  });

  it('requires the current revision before writing navigation', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    seedRuntimeData(process.env.BLOG_DATA_ROOT);

    const response = await putNavigation(
      await createAuthedEditorRequest('http://localhost/api/data/navigation', {
        method: 'PUT',
        body: JSON.stringify({
          categories: [
            {
              name: 'Docs',
              icon: 'book',
              slug: 'docs',
              tools: [],
            },
          ],
        }),
      })
    );

    expect(response.status).toBe(409);
    expect(mockedSyncCurrentBackupToRemote).not.toHaveBeenCalled();
    expect(JSON.parse(fs.readFileSync(path.join(process.env.BLOG_DATA_ROOT, 'navigation', 'tools.json'), 'utf8'))).toEqual([]);
  });

  it('writes navigation and triggers remote sync when the revision matches', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    seedRuntimeData(process.env.BLOG_DATA_ROOT);

    const current = await (await getNavigation(await createAuthedEditorRequest('http://localhost/api/data/navigation'))).json();
    const response = await putNavigation(
      await createAuthedEditorRequest('http://localhost/api/data/navigation', {
        method: 'PUT',
        body: JSON.stringify({
          revision: current.revision,
          categories: [
            {
              name: 'Docs',
              icon: 'book',
              slug: 'docs',
              tools: [],
            },
          ],
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mockedSyncCurrentBackupToRemote).toHaveBeenCalledWith({
      reason: 'navigation-write',
    });
  });

  it('rejects invalid settings payloads without writing or remote sync', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    seedRuntimeData(process.env.BLOG_DATA_ROOT);

    const existingSettings = fs.readFileSync(
      path.join(process.env.BLOG_DATA_ROOT, 'settings', 'site.json'),
      'utf8'
    );

    const response = await putSettings(
      await createAuthedEditorRequest('http://localhost/api/data/settings', {
        method: 'PUT',
        body: JSON.stringify({
          settings: {
            siteName: '',
          },
          revision: 'stale-revision',
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: '站点设置格式无效。',
      })
    );
    expect(fs.readFileSync(path.join(process.env.BLOG_DATA_ROOT, 'settings', 'site.json'), 'utf8')).toBe(
      existingSettings
    );
    expect(mockedSyncCurrentBackupToRemote).not.toHaveBeenCalled();
  });

  it('requires the current revision before writing settings', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    seedRuntimeData(process.env.BLOG_DATA_ROOT);

    const response = await putSettings(
      await createAuthedEditorRequest('http://localhost/api/data/settings', {
        method: 'PUT',
        body: JSON.stringify({
          settings: createSettings('Missing Revision Site'),
        }),
      })
    );

    expect(response.status).toBe(409);
    expect(mockedSyncCurrentBackupToRemote).not.toHaveBeenCalled();
    expect(JSON.parse(fs.readFileSync(path.join(process.env.BLOG_DATA_ROOT, 'settings', 'site.json'), 'utf8'))).toEqual(
      expect.objectContaining({
        siteName: 'Original Site',
      })
    );
  });

  it('writes settings and triggers remote sync when the revision matches', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    seedRuntimeData(process.env.BLOG_DATA_ROOT);

    const current = await (await getSettings(await createAuthedEditorRequest('http://localhost/api/data/settings'))).json();
    const response = await putSettings(
      await createAuthedEditorRequest('http://localhost/api/data/settings', {
        method: 'PUT',
        body: JSON.stringify({
          revision: current.revision,
          settings: createSettings('Next Site'),
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mockedSyncCurrentBackupToRemote).toHaveBeenCalledWith({
      reason: 'settings-write',
    });
  });
});

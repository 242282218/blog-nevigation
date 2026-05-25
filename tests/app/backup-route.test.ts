import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@/app/api/data/backup/route';
import { syncCurrentBackupToRemote } from '@/lib/editor-remote-backup';
import { writeArticlesToDisk } from '@/lib/editor-data-storage';
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
  const directory = createTempDirectory('blog-navigation-backup-route-');
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

function seedRuntimeData(dataRoot: string): void {
  writeJson(path.join(dataRoot, 'articles', 'articles.json'), [
    {
      id: 'article-1',
      title: 'Existing Article',
      date: '2026-05-24',
      description: 'Existing article',
      tags: [],
      content: '# Existing',
      slug: 'existing-article',
      createdAt: 1,
      updatedAt: 2,
    },
  ]);
  writeJson(path.join(dataRoot, 'navigation', 'tools.json'), []);
  writeJson(path.join(dataRoot, 'settings', 'site.json'), {
    siteName: 'Existing Site',
    siteDescription: 'Existing settings',
    workspaceLabel: 'workspace / existing',
    heroTitleLineOne: 'Existing',
    heroTitleLineTwo: 'Data',
    heroDescription: 'Existing runtime data.',
  });
}

async function readCurrentManifest(): Promise<unknown> {
  const response = await GET(await createAuthedEditorRequest('http://localhost/api/data/backup'));
  const payload = await response.json();

  expect(response.status).toBe(200);
  return payload.manifest;
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

describe('backup API', () => {
  it('rejects unauthenticated reads and writes', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();

    const getResponse = await GET(new NextRequest('http://localhost/api/data/backup'));
    const postResponse = await POST(
      new NextRequest('http://localhost/api/data/backup', {
        method: 'POST',
        body: JSON.stringify({ data: { articles: [], navigation: [] } }),
      })
    );

    expect(getResponse.status).toBe(401);
    expect(postResponse.status).toBe(401);
  });

  it('exports the current backup payload for authenticated reads', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    seedRuntimeData(process.env.BLOG_DATA_ROOT);

    const response = await GET(await createAuthedEditorRequest('http://localhost/api/data/backup'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual(
      expect.objectContaining({
        version: 1,
        source: 'local',
        persistent: true,
        data: expect.objectContaining({
          articles: expect.arrayContaining([
            expect.objectContaining({
              id: 'article-1',
            }),
          ]),
          navigation: [],
        }),
      })
    );
  });

  it('rejects backup export when runtime data is corrupt', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    seedRuntimeData(process.env.BLOG_DATA_ROOT);
    writeText(path.join(process.env.BLOG_DATA_ROOT, 'articles', 'articles.json'), '{');

    const response = await GET(await createAuthedEditorRequest('http://localhost/api/data/backup'));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual(
      expect.objectContaining({
        message: '服务器运行时数据文件损坏，请修复数据文件后重试。',
        resource: 'articles',
      })
    );
  });

  it('reports backup export lock contention as a retryable conflict', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    seedRuntimeData(process.env.BLOG_DATA_ROOT);
    fs.mkdirSync(path.join(process.env.BLOG_DATA_ROOT, '.data-write.lock'));

    const response = await GET(await createAuthedEditorRequest('http://localhost/api/data/backup'));

    expect(response.status).toBe(423);
    expect(await response.json()).toEqual({
      message: '服务器运行时数据正在写入，请稍后重试。',
    });
  }, 10000);

  it('requires BLOG_DATA_ROOT before restoring a backup', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    delete process.env.BLOG_DATA_ROOT;

    const response = await POST(
      await createAuthedEditorRequest('http://localhost/api/data/backup', {
        method: 'POST',
        body: JSON.stringify({ data: { articles: [], navigation: [] } }),
      })
    );

    expect(response.status).toBe(503);
    expect(mockedSyncCurrentBackupToRemote).not.toHaveBeenCalled();
  });

  it('rejects invalid backup payloads without remote sync', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    const currentManifest = await readCurrentManifest();

    const response = await POST(
      await createAuthedEditorRequest('http://localhost/api/data/backup', {
        method: 'POST',
        body: JSON.stringify({ currentManifest, data: { articles: 'invalid', navigation: [] } }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: '备份文件格式无效，恢复失败。',
      })
    );
    expect(mockedSyncCurrentBackupToRemote).not.toHaveBeenCalled();
  });

  it('restores valid backup payloads and writes a remote restore snapshot', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    const currentManifest = await readCurrentManifest();

    const response = await POST(
      await createAuthedEditorRequest('http://localhost/api/data/backup', {
        method: 'POST',
        body: JSON.stringify({
          currentManifest,
          version: 1,
          data: {
            articles: [
              {
                id: 'article-2',
                title: 'Restored Article',
                date: '2026-05-24',
                description: 'Restored article',
                tags: [],
                content: '# Restored',
                createdAt: 1,
                updatedAt: 2,
              },
            ],
            navigation: [],
          },
        }),
      })
    );
    const payload = await response.json();
    const restoredArticles = JSON.parse(
      fs.readFileSync(path.join(process.env.BLOG_DATA_ROOT, 'articles', 'articles.json'), 'utf8')
    );

    expect(response.status).toBe(200);
    expect(payload).toEqual(
      expect.objectContaining({
        success: true,
        counts: {
          articles: 1,
          categories: 0,
          settings: true,
        },
      })
    );
    expect(restoredArticles).toEqual([
      expect.objectContaining({
        id: 'article-2',
        slug: expect.any(String),
      }),
    ]);
    expect(mockedSyncCurrentBackupToRemote).toHaveBeenCalledWith({
      reason: 'local-restore',
      writeSnapshot: true,
    });
  });

  it('rejects stale local restores without replacing newer data', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    seedRuntimeData(process.env.BLOG_DATA_ROOT);
    const currentManifest = await readCurrentManifest();
    const newerArticle = {
      id: 'article-newer',
      title: 'Newer Article',
      date: '2026-05-25',
      description: 'Newer article',
      tags: [],
      content: '# Newer',
      slug: 'newer-article',
      createdAt: 3,
      updatedAt: 4,
    };

    writeJson(path.join(process.env.BLOG_DATA_ROOT, 'articles', 'articles.json'), [newerArticle]);

    const response = await POST(
      await createAuthedEditorRequest('http://localhost/api/data/backup', {
        method: 'POST',
        body: JSON.stringify({
          currentManifest,
          version: 1,
          data: {
            articles: [
              {
                id: 'article-old',
                title: 'Old Backup Article',
                date: '2026-05-20',
                description: 'Old backup article',
                tags: [],
                content: '# Old',
                createdAt: 1,
                updatedAt: 2,
              },
            ],
            navigation: [],
          },
        }),
      })
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: '当前数据已被其他会话更新，请刷新后重新执行恢复。',
        currentManifest: expect.any(Object),
      })
    );
    expect(JSON.parse(fs.readFileSync(path.join(process.env.BLOG_DATA_ROOT, 'articles', 'articles.json'), 'utf8'))).toEqual([
      expect.objectContaining({
        id: 'article-newer',
      }),
    ]);
    expect(mockedSyncCurrentBackupToRemote).not.toHaveBeenCalled();
  });

  it('rejects stale local restores after another manifest-backed write', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    seedRuntimeData(process.env.BLOG_DATA_ROOT);
    const currentManifest = await readCurrentManifest();
    const newerArticle = {
      id: 'article-newer-manifest',
      title: 'Newer Manifest Article',
      date: '2026-05-25',
      description: 'Newer article with manifest update',
      tags: [],
      content: '# Newer Manifest',
      slug: 'newer-manifest-article',
      createdAt: 3,
      updatedAt: 4,
    };

    writeArticlesToDisk([newerArticle]);

    const response = await POST(
      await createAuthedEditorRequest('http://localhost/api/data/backup', {
        method: 'POST',
        body: JSON.stringify({
          currentManifest,
          version: 1,
          data: {
            articles: [
              {
                id: 'article-old-manifest',
                title: 'Old Manifest Backup Article',
                date: '2026-05-20',
                description: 'Old backup article',
                tags: [],
                content: '# Old Manifest',
                createdAt: 1,
                updatedAt: 2,
              },
            ],
            navigation: [],
          },
        }),
      })
    );

    expect(response.status).toBe(409);
    expect(JSON.parse(fs.readFileSync(path.join(process.env.BLOG_DATA_ROOT, 'articles', 'articles.json'), 'utf8'))).toEqual([
      expect.objectContaining({
        id: 'article-newer-manifest',
      }),
    ]);
    expect(mockedSyncCurrentBackupToRemote).not.toHaveBeenCalled();
  });
});

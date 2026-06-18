import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EDITOR_BACKUP_VERSION,
  createEditorBackupPayload,
  parseEditorBackupData,
  restoreEditorBackupPayload,
} from '@/lib/editor-data-backup';
import { createArticleSlug } from '@/lib/article-data';
import { DEFAULT_SITE_SETTINGS } from '@/lib/site-settings';

const ORIGINAL_BLOG_DATA_ROOT = process.env.BLOG_DATA_ROOT;
const tempDirectories: string[] = [];

const article = {
  id: 'article-1',
  title: 'Runtime Article',
  date: '2026-05-22',
  description: 'Portable backup article',
  tags: ['backup'],
  content: '# Runtime Article',
  createdAt: 1,
  updatedAt: 2,
};

const navigation = [
  {
    name: '开发文档',
    icon: 'blog',
    slug: 'developer-docs',
    tools: [
      {
        icon: 'blog',
        title: 'MDN Web Docs',
        description: 'Web 平台权威文档，覆盖 HTML、CSS、JavaScript 和浏览器 API',
        url: 'https://developer.mozilla.org',
        tags: ['文档', 'Web'],
      },
    ],
  },
];

const settings = {
  ...DEFAULT_SITE_SETTINGS,
  siteName: 'Runtime Site',
};
const normalizedArticle = {
  ...article,
  slug: createArticleSlug(article),
  kind: 'essay',
  status: 'published',
  featured: false,
  sourceLinks: [],
  revisionNotes: [],
};

function createTempDataRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-navigation-backup-'));
  tempDirectories.push(root);
  return root;
}

afterEach(() => {
  vi.restoreAllMocks();

  if (ORIGINAL_BLOG_DATA_ROOT === undefined) {
    delete process.env.BLOG_DATA_ROOT;
  } else {
    process.env.BLOG_DATA_ROOT = ORIGINAL_BLOG_DATA_ROOT;
  }

  while (tempDirectories.length > 0) {
    fs.rmSync(tempDirectories.pop() as string, { recursive: true, force: true });
  }
});

describe('editor backup payload', () => {
  it('creates a versioned envelope for portable backups', () => {
    const payload = createEditorBackupPayload({
      articles: [article],
      navigation,
      settings,
    });

    expect(payload).toEqual(
      expect.objectContaining({
        version: EDITOR_BACKUP_VERSION,
        source: 'local',
        data: {
          articles: [article],
          navigation,
          settings,
        },
      })
    );
    expect(Date.parse(payload.exportedAt)).not.toBeNaN();
  });

  it('parses both envelope and legacy flat backup payloads', () => {
    const envelope = createEditorBackupPayload({
      articles: [article],
      navigation,
      settings,
    });

    expect(parseEditorBackupData(envelope)).toEqual({
      articles: [normalizedArticle],
      navigation,
      settings,
    });

    expect(
      parseEditorBackupData({
        version: 1,
        articles: [article],
        navigation,
      })
    ).toEqual({
      articles: [normalizedArticle],
      navigation,
      settings: DEFAULT_SITE_SETTINGS,
    });
  });

  it('parses legacy envelope backup payloads without settings', () => {
    expect(
      parseEditorBackupData({
        version: 1,
        data: {
          articles: [article],
          navigation,
        },
      })
    ).toEqual({
      articles: [normalizedArticle],
      navigation,
      settings: DEFAULT_SITE_SETTINGS,
    });
  });

  it('rejects backup payloads with invalid settings', () => {
    expect(
      parseEditorBackupData({
        version: 1,
        data: {
          articles: [article],
          navigation,
          settings: {
            ...settings,
            siteName: '',
          },
        },
      })
    ).toBeNull();
  });

  it('restores valid backup payloads into BLOG_DATA_ROOT', async () => {
    const dataRoot = createTempDataRoot();
    process.env.BLOG_DATA_ROOT = dataRoot;

    const result = await restoreEditorBackupPayload(
      createEditorBackupPayload({
        articles: [article],
        navigation,
        settings,
      })
    );

    expect(result).toEqual({
      articles: 1,
      categories: 1,
      settings: true,
      media: 0,
    });
    expect(JSON.parse(fs.readFileSync(path.join(dataRoot, 'articles', 'articles.json'), 'utf8'))).toEqual([normalizedArticle]);
    expect(JSON.parse(fs.readFileSync(path.join(dataRoot, 'navigation', 'tools.json'), 'utf8'))).toEqual(navigation);
    expect(JSON.parse(fs.readFileSync(path.join(dataRoot, 'settings', 'site.json'), 'utf8'))).toEqual(settings);
    expect(JSON.parse(fs.readFileSync(path.join(dataRoot, 'manifest.json'), 'utf8'))).toEqual(
      expect.objectContaining({
        version: 1,
        resources: expect.objectContaining({
          articles: expect.objectContaining({
            hash: expect.any(String),
            revision: expect.any(String),
          }),
          navigation: expect.objectContaining({
            hash: expect.any(String),
            revision: expect.any(String),
          }),
          settings: expect.objectContaining({
            hash: expect.any(String),
            revision: expect.any(String),
          }),
        }),
      })
    );
    expect(fs.readdirSync(dataRoot).some((entry) => entry.startsWith('.restore-'))).toBe(false);
  });

  it('rolls back existing files when restore replacement fails midway', async () => {
    const dataRoot = createTempDataRoot();
    process.env.BLOG_DATA_ROOT = dataRoot;
    const existingPayload = createEditorBackupPayload({
      articles: [article],
      navigation,
      settings,
    });

    await expect(restoreEditorBackupPayload(existingPayload)).resolves.toEqual({
      articles: 1,
      categories: 1,
      settings: true,
      media: 0,
    });

    const existingArticles = fs.readFileSync(path.join(dataRoot, 'articles', 'articles.json'), 'utf8');
    const existingNavigation = fs.readFileSync(path.join(dataRoot, 'navigation', 'tools.json'), 'utf8');
    const existingSettings = fs.readFileSync(path.join(dataRoot, 'settings', 'site.json'), 'utf8');
    const existingManifest = fs.readFileSync(path.join(dataRoot, 'manifest.json'), 'utf8');
    const replacementArticle = {
      ...article,
      id: 'replacement-article-1',
      title: 'Replacement Article',
    };
    let stagedReplaceCount = 0;
    const renameSync = fs.renameSync;

    vi.spyOn(fs, 'renameSync').mockImplementation((oldPath, newPath) => {
      const oldPathText = String(oldPath);

      if (oldPathText.includes('.restore-staging') && !oldPathText.endsWith('.tmp')) {
        stagedReplaceCount += 1;
      }

      if (stagedReplaceCount === 2) {
        throw new Error('Simulated replacement failure.');
      }

      return renameSync(oldPath, newPath);
    });

    await expect(
      restoreEditorBackupPayload(
        createEditorBackupPayload({
          articles: [replacementArticle],
          navigation: [],
          settings: {
            ...settings,
            siteName: 'Replacement Site',
          },
        })
      )
    ).rejects.toThrow('Simulated replacement failure.');

    expect(fs.readFileSync(path.join(dataRoot, 'articles', 'articles.json'), 'utf8')).toBe(existingArticles);
    expect(fs.readFileSync(path.join(dataRoot, 'navigation', 'tools.json'), 'utf8')).toBe(existingNavigation);
    expect(fs.readFileSync(path.join(dataRoot, 'settings', 'site.json'), 'utf8')).toBe(existingSettings);
    expect(fs.readFileSync(path.join(dataRoot, 'manifest.json'), 'utf8')).toBe(existingManifest);
    expect(fs.readdirSync(dataRoot).some((entry) => entry.startsWith('.restore-'))).toBe(false);
  });
});

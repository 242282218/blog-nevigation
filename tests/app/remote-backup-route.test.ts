import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@/app/api/data/backup/remote/route';
import {
  downloadLatestBackupPayloadFromR2,
  getR2BackupStatus,
  R2BackupSettingsInvalidError,
} from '@/lib/r2-backup-storage';
import { syncCurrentBackupToRemote } from '@/lib/editor-remote-backup';
import {
  cleanupTempDirectories,
  createAuthedEditorRequest,
  createTempDirectory,
  restoreEnv,
} from '../helpers/api-route';

vi.mock('@/lib/r2-backup-storage', () => {
  class R2BackupNotConfiguredError extends Error {
    constructor(message = 'Cloudflare R2 backup is not configured.') {
      super(message);
      this.name = 'R2BackupNotConfiguredError';
    }
  }

  class R2BackupSettingsInvalidError extends Error {
    constructor(public readonly filePath = 'cloudflare-r2.json') {
      super('Stored Cloudflare R2 settings are invalid.');
      this.name = 'R2BackupSettingsInvalidError';
    }
  }

  return {
    R2BackupNotConfiguredError,
    R2BackupSettingsInvalidError,
    downloadLatestBackupPayloadFromR2: vi.fn(),
    getR2BackupStatus: vi.fn(),
  };
});

vi.mock('@/lib/editor-remote-backup', () => ({
  syncCurrentBackupToRemote: vi.fn(),
}));

const mockedGetR2BackupStatus = vi.mocked(getR2BackupStatus);
const mockedDownloadLatestBackupPayloadFromR2 = vi.mocked(downloadLatestBackupPayloadFromR2);
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
  const directory = createTempDirectory('blog-navigation-remote-backup-route-');
  tempDirectories.push(directory);
  return directory;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

async function readCurrentManifest(): Promise<unknown> {
  const { GET: getBackup } = await import('@/app/api/data/backup/route');
  const response = await getBackup(await createAuthedEditorRequest('http://localhost/api/data/backup'));
  const payload = await response.json();

  expect(response.status).toBe(200);
  return payload.manifest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetR2BackupStatus.mockReturnValue({
    enabled: false,
    configured: false,
    bucket: null,
    prefix: 'blog-navigation',
    endpoint: null,
    snapshotOnWrite: false,
    hasAccessKeyId: false,
    hasSecretAccessKey: false,
    source: 'default',
    message: null,
  });
});

afterEach(() => {
  resetEnv();
  cleanupTempDirectories(tempDirectories);
});

describe('remote backup API', () => {
  it('rejects unauthenticated reads and writes', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();

    const getResponse = await GET(new NextRequest('http://localhost/api/data/backup/remote'));
    const postResponse = await POST(
      new NextRequest('http://localhost/api/data/backup/remote', {
        method: 'POST',
        body: JSON.stringify({ action: 'sync' }),
      })
    );

    expect(getResponse.status).toBe(401);
    expect(postResponse.status).toBe(401);
  });

  it('returns the R2 status for authenticated reads', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';

    const response = await GET(await createAuthedEditorRequest('http://localhost/api/data/backup/remote'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        enabled: false,
        configured: false,
      })
    );
  });

  it('reports corrupt R2 settings for authenticated reads', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    mockedGetR2BackupStatus.mockImplementation(() => {
      throw new R2BackupSettingsInvalidError('cloudflare-r2.json');
    });

    const response = await GET(await createAuthedEditorRequest('http://localhost/api/data/backup/remote'));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: 'Cloudflare R2 配置文件损坏，请修复或删除后重试。',
      })
    );
  });

  it('requires BLOG_DATA_ROOT before mutating remote backups', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    delete process.env.BLOG_DATA_ROOT;

    const response = await POST(
      await createAuthedEditorRequest('http://localhost/api/data/backup/remote', {
        method: 'POST',
        body: JSON.stringify({ action: 'sync' }),
      })
    );

    expect(response.status).toBe(503);
    expect(mockedSyncCurrentBackupToRemote).not.toHaveBeenCalled();
  });

  it('rejects unknown actions without running a sync fallback', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();

    const response = await POST(
      await createAuthedEditorRequest('http://localhost/api/data/backup/remote', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete-all' }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: '远端备份操作无效。',
      })
    );
    expect(mockedSyncCurrentBackupToRemote).not.toHaveBeenCalled();
    expect(mockedDownloadLatestBackupPayloadFromR2).not.toHaveBeenCalled();
  });

  it('rejects malformed action JSON without running remote operations', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();

    const response = await POST(
      await createAuthedEditorRequest('http://localhost/api/data/backup/remote', {
        method: 'POST',
        body: '{',
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: '远端备份操作无效。',
      })
    );
    expect(mockedSyncCurrentBackupToRemote).not.toHaveBeenCalled();
    expect(mockedDownloadLatestBackupPayloadFromR2).not.toHaveBeenCalled();
  });

  it('reports disabled R2 sync without treating it as success', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    mockedSyncCurrentBackupToRemote.mockResolvedValue({
      enabled: false,
      success: false,
      message: 'R2 backup is disabled.',
    });

    const response = await POST(
      await createAuthedEditorRequest('http://localhost/api/data/backup/remote', {
        method: 'POST',
        body: JSON.stringify({ action: 'sync' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual(
      expect.objectContaining({
        success: false,
        remoteBackup: expect.objectContaining({
          enabled: false,
        }),
      })
    );
  });

  it('reports corrupt R2 settings during manual sync', async () => {
    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = createTempDataRoot();
    mockedSyncCurrentBackupToRemote.mockResolvedValue({
      enabled: true,
      success: false,
      invalidConfiguration: true,
      message: 'Cloudflare R2 配置文件损坏，请修复或删除后重试。',
    });

    const response = await POST(
      await createAuthedEditorRequest('http://localhost/api/data/backup/remote', {
        method: 'POST',
        body: JSON.stringify({ action: 'sync' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual(
      expect.objectContaining({
        success: false,
        remoteBackup: expect.objectContaining({
          invalidConfiguration: true,
        }),
      })
    );
  });

  it('rejects invalid R2 restore payloads without replacing local data', async () => {
    const dataRoot = createTempDataRoot();
    const existingArticle = {
      id: 'existing-article-1',
      title: 'Existing Article',
      date: '2026-05-24',
      description: 'Existing data must survive invalid R2 restores',
      tags: [],
      content: '# Existing',
      slug: 'existing-article',
      createdAt: 1,
      updatedAt: 2,
    };

    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = dataRoot;
    writeJson(path.join(dataRoot, 'articles', 'articles.json'), [existingArticle]);
    writeJson(path.join(dataRoot, 'navigation', 'tools.json'), []);
    writeJson(path.join(dataRoot, 'settings', 'site.json'), {
      siteName: 'Existing Site',
      siteDescription: 'Existing settings',
      workspaceLabel: 'workspace / existing',
      heroTitleLineOne: 'Existing',
      heroTitleLineTwo: 'Data',
      heroDescription: 'Invalid restore should not replace this.',
    });
    const currentManifest = await readCurrentManifest();
    mockedDownloadLatestBackupPayloadFromR2.mockResolvedValue({
      version: 1,
      data: {
        articles: 'invalid-articles',
        navigation: [],
      },
    });

    const existingArticles = fs.readFileSync(path.join(dataRoot, 'articles', 'articles.json'), 'utf8');
    const response = await POST(
      await createAuthedEditorRequest('http://localhost/api/data/backup/remote', {
        method: 'POST',
        body: JSON.stringify({ action: 'restore', currentManifest }),
      })
    );

    expect(response.status).toBe(400);
    expect(fs.readFileSync(path.join(dataRoot, 'articles', 'articles.json'), 'utf8')).toBe(existingArticles);
    expect(mockedSyncCurrentBackupToRemote).not.toHaveBeenCalled();
  });

  it('reports corrupt R2 settings before restoring remote data', async () => {
    const dataRoot = createTempDataRoot();

    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = dataRoot;
    writeJson(path.join(dataRoot, 'articles', 'articles.json'), []);
    writeJson(path.join(dataRoot, 'navigation', 'tools.json'), []);
    writeJson(path.join(dataRoot, 'settings', 'site.json'), {
      siteName: 'Existing Site',
      siteDescription: 'Existing settings',
      workspaceLabel: 'workspace / existing',
      heroTitleLineOne: 'Existing',
      heroTitleLineTwo: 'Data',
      heroDescription: 'Existing data.',
    });
    const currentManifest = await readCurrentManifest();
    mockedDownloadLatestBackupPayloadFromR2.mockRejectedValue(
      new R2BackupSettingsInvalidError('cloudflare-r2.json')
    );

    const response = await POST(
      await createAuthedEditorRequest('http://localhost/api/data/backup/remote', {
        method: 'POST',
        body: JSON.stringify({ action: 'restore', currentManifest }),
      })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        message: 'Cloudflare R2 配置文件损坏，请修复或删除后重试。',
      })
    );
    expect(mockedSyncCurrentBackupToRemote).not.toHaveBeenCalled();
  });

  it('rejects stale R2 restores without replacing newer local data', async () => {
    const dataRoot = createTempDataRoot();
    const existingArticle = {
      id: 'existing-article-1',
      title: 'Existing Article',
      date: '2026-05-24',
      description: 'Existing data',
      tags: [],
      content: '# Existing',
      slug: 'existing-article',
      createdAt: 1,
      updatedAt: 2,
    };
    const newerArticle = {
      ...existingArticle,
      id: 'newer-article-1',
      title: 'Newer Article',
      slug: 'newer-article',
      updatedAt: 3,
    };

    process.env.EDITOR_ACCESS_TOKEN = 'test-editor-token';
    process.env.BLOG_DATA_ROOT = dataRoot;
    writeJson(path.join(dataRoot, 'articles', 'articles.json'), [existingArticle]);
    writeJson(path.join(dataRoot, 'navigation', 'tools.json'), []);
    writeJson(path.join(dataRoot, 'settings', 'site.json'), {
      siteName: 'Existing Site',
      siteDescription: 'Existing settings',
      workspaceLabel: 'workspace / existing',
      heroTitleLineOne: 'Existing',
      heroTitleLineTwo: 'Data',
      heroDescription: 'Existing data.',
    });
    const currentManifest = await readCurrentManifest();
    writeJson(path.join(dataRoot, 'articles', 'articles.json'), [newerArticle]);
    mockedDownloadLatestBackupPayloadFromR2.mockResolvedValue({
      version: 1,
      data: {
        articles: [existingArticle],
        navigation: [],
      },
    });

    const response = await POST(
      await createAuthedEditorRequest('http://localhost/api/data/backup/remote', {
        method: 'POST',
        body: JSON.stringify({ action: 'restore', currentManifest }),
      })
    );

    expect(response.status).toBe(409);
    expect(JSON.parse(fs.readFileSync(path.join(dataRoot, 'articles', 'articles.json'), 'utf8'))).toEqual([
      expect.objectContaining({
        id: 'newer-article-1',
      }),
    ]);
    expect(mockedSyncCurrentBackupToRemote).not.toHaveBeenCalled();
  });
});

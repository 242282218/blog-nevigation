import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

const repoRoot = process.cwd();
const tempDirectories: string[] = [];
const defaultIntroCardSettings = {
  showIntroCard: true,
  introCardEyebrow: 'about this desk',
  introCardTitle: '你好，这里是我的公开工作日志',
  introCardDescription:
    '我把正在做、正在学、反复查的东西整理成可回看的笔记。每篇尽量保留背景、判断过程和最后可复用的结论。',
  introCardMetaOneLabel: '最近在想',
  introCardMetaOneValue: '前端体验、工程效率、AI 辅助开发',
  introCardMetaTwoLabel: '写作原则',
  introCardMetaTwoValue: '从真实问题出发，写清背景、取舍和后续',
  introCardMetaThreeLabel: '适合阅读',
  introCardMetaThreeValue: '快速了解我怎么做项目、选工具、处理问题',
  introCardStartLabel: 'start here',
};
const validSettings = {
  siteName: 'Runtime Site',
  siteDescription: 'Runtime settings',
  workspaceLabel: 'workspace / runtime',
  heroTitleLineOne: 'Runtime',
  heroTitleLineTwo: 'Data',
  heroDescription: 'Runtime data scripts require complete settings when the file exists.',
  ...defaultIntroCardSettings,
};

function createTempDirectory(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-navigation-data-script-'));
  tempDirectories.push(directory);
  return directory;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);

  return `{${entries.join(',')}}`;
}

function hashJson(value: unknown): string {
  return createHash('sha256')
    .update(stableStringify(value))
    .digest('hex');
}

afterEach(() => {
  vi.restoreAllMocks();

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
      ...defaultIntroCardSettings,
    };

    writeJson(path.join(sourceRoot, 'articles', 'articles.json'), [article]);
    writeJson(path.join(sourceRoot, 'navigation', 'tools.json'), navigation);
    writeJson(path.join(sourceRoot, 'settings', 'site.json'), settings);
    writeJson(path.join(sourceRoot, 'settings', 'cloudflare-r2.json'), {
      enabled: true,
      accountId: '0123456789abcdef0123456789abcdef',
      bucket: 'blog-data',
      accessKeyId: 'access-key',
      secretAccessKey: 'source-secret-key',
      prefix: 'blog-navigation',
      endpoint: '',
      snapshotOnWrite: false,
    });
    writeJson(path.join(targetRoot, 'settings', 'cloudflare-r2.json'), {
      enabled: true,
      accountId: '22222222222222222222222222222222',
      bucket: 'target-blog-data',
      accessKeyId: 'target-access-key',
      secretAccessKey: 'target-secret-key',
      prefix: 'target-prefix',
      endpoint: '',
      snapshotOnWrite: true,
    });

    execFileSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'data', 'export-runtime-data.mjs'), sourceRoot, backupPath],
      { encoding: 'utf8' }
    );

    const payload = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    expect(JSON.stringify(payload)).not.toContain('source-secret-key');
    expect(JSON.stringify(payload)).not.toContain('cloudflare-r2');
    expect(payload).toEqual(
      expect.objectContaining({
        version: 1,
        schemaVersion: 1,
        source: 'local',
        manifest: expect.objectContaining({
          version: 1,
          schemaVersion: 1,
          resources: expect.objectContaining({
            articles: expect.objectContaining({
              revision: expect.any(String),
              hash: expect.any(String),
            }),
            navigation: expect.objectContaining({
              revision: expect.any(String),
              hash: expect.any(String),
            }),
            settings: expect.objectContaining({
              revision: expect.any(String),
              hash: expect.any(String),
            }),
          }),
        }),
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
    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'settings', 'cloudflare-r2.json'), 'utf8'))).toEqual(
      expect.objectContaining({
        accountId: '22222222222222222222222222222222',
        secretAccessKey: 'target-secret-key',
      })
    );
    const importedArticles = JSON.parse(fs.readFileSync(path.join(targetRoot, 'articles', 'articles.json'), 'utf8'));
    const importedNavigation = JSON.parse(fs.readFileSync(path.join(targetRoot, 'navigation', 'tools.json'), 'utf8'));
    const importedSettings = JSON.parse(fs.readFileSync(path.join(targetRoot, 'settings', 'site.json'), 'utf8'));
    const importedManifest = JSON.parse(fs.readFileSync(path.join(targetRoot, 'manifest.json'), 'utf8'));

    expect(importedManifest).toEqual(
      expect.objectContaining({
        version: 1,
        schemaVersion: 1,
        resources: expect.objectContaining({
          articles: expect.objectContaining({
            revision: expect.any(String),
          }),
        }),
      })
    );
    expect(importedManifest.resources.articles.hash).toBe(hashJson(importedArticles));
    expect(importedManifest.resources.navigation.hash).toBe(hashJson(importedNavigation));
    expect(importedManifest.resources.settings.hash).toBe(hashJson(importedSettings));

    const verifyOutput = execFileSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'data', 'verify-runtime-data.mjs'), targetRoot],
      { encoding: 'utf8' }
    );

    expect(JSON.parse(verifyOutput)).toEqual(
      expect.objectContaining({
        ok: true,
        articles: 1,
        categories: 1,
        settings: true,
        manifest: true,
      })
    );
  });

  it('rejects backups from newer schema versions without replacing existing runtime data', () => {
    const targetRoot = createTempDirectory();
    const backupPath = path.join(createTempDirectory(), 'future-backup.json');
    const existingArticle = {
      id: 'existing-article',
      title: 'Existing Article',
      date: '2026-05-22',
      description: 'Existing runtime data',
      tags: ['runtime'],
      content: '# Existing',
      createdAt: 1,
      updatedAt: 2,
    };

    writeJson(path.join(targetRoot, 'articles', 'articles.json'), [existingArticle]);
    writeJson(path.join(targetRoot, 'navigation', 'tools.json'), []);
    writeJson(path.join(targetRoot, 'settings', 'site.json'), validSettings);
    writeJson(backupPath, {
      version: 1,
      schemaVersion: 999,
      data: {
        articles: [],
        navigation: [],
        settings: validSettings,
      },
    });

    const result = spawnSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'data', 'import-runtime-data.mjs'), backupPath, targetRoot],
      { encoding: 'utf8' }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('schemaVersion 999 is newer than supported 1');
    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'articles', 'articles.json'), 'utf8'))).toEqual([
      existingArticle,
    ]);
  });

  it('creates and restores an encrypted GitHub backup package', () => {
    const sourceRoot = createTempDirectory();
    const targetRoot = createTempDirectory();
    const encryptedBackupPath = path.join(createTempDirectory(), 'backup.enc.json');
    const secret = 'test-secret-for-encrypted-backup';
    const article = {
      id: 'encrypted-article-1',
      title: 'Encrypted Article',
      date: '2026-05-23',
      description: 'Encrypted migration test',
      tags: ['backup'],
      content: '# Encrypted Article',
      createdAt: 1,
      updatedAt: 2,
    };
    const navigation = [
      {
        name: 'Backup',
        icon: 'shield',
        slug: 'backup',
        tools: [],
      },
    ];

    writeJson(path.join(sourceRoot, 'articles', 'articles.json'), [article]);
    writeJson(path.join(sourceRoot, 'navigation', 'tools.json'), navigation);

    const backupOutput = execFileSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'data', 'backup-to-github.mjs'), sourceRoot, encryptedBackupPath],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          GITHUB_BACKUP_ENCRYPTION_KEY: secret,
        },
      }
    );

    expect(JSON.parse(backupOutput)).toEqual(
      expect.objectContaining({
        dataRoot: sourceRoot,
        outputPath: encryptedBackupPath,
        encrypted: true,
      })
    );

    const encryptedPayload = JSON.parse(fs.readFileSync(encryptedBackupPath, 'utf8'));
    expect(encryptedPayload).toEqual(
      expect.objectContaining({
        magic: 'blog-navigation-encrypted-backup',
        version: 1,
        algorithm: 'aes-256-gcm',
        keyDerivation: 'scrypt',
        salt: expect.any(String),
        iv: expect.any(String),
        authTag: expect.any(String),
        ciphertext: expect.any(String),
      })
    );
    expect(JSON.stringify(encryptedPayload)).not.toContain('Encrypted Article');

    execFileSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'data', 'restore-encrypted-backup.mjs'), encryptedBackupPath, targetRoot],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          GITHUB_BACKUP_ENCRYPTION_KEY: secret,
        },
      }
    );

    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'articles', 'articles.json'), 'utf8'))).toEqual([
      expect.objectContaining({
        ...article,
        slug: expect.any(String),
      }),
    ]);
    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'navigation', 'tools.json'), 'utf8'))).toEqual(navigation);
    expect(fs.readdirSync(targetRoot).some((entry) => entry.startsWith('.restore-'))).toBe(false);
  });

  it('keeps existing runtime data when encrypted restore uses the wrong key', () => {
    const sourceRoot = createTempDirectory();
    const targetRoot = createTempDirectory();
    const encryptedBackupPath = path.join(createTempDirectory(), 'backup.enc.json');
    const existingArticle = {
      id: 'existing-encrypted-restore-article-1',
      title: 'Existing Encrypted Restore Article',
      date: '2026-05-24',
      description: 'Existing data must survive failed encrypted restores',
      tags: ['existing'],
      content: '# Existing Encrypted Restore Article',
      slug: 'existing-encrypted-restore-article',
      createdAt: 1,
      updatedAt: 2,
    };
    const existingNavigation = [
      {
        name: 'Existing',
        icon: 'book',
        slug: 'existing',
        tools: [],
      },
    ];
    const existingSettings = {
      siteName: 'Existing Encrypted Restore Site',
      siteDescription: 'Existing settings',
      workspaceLabel: 'workspace / existing-encrypted-restore',
      heroTitleLineOne: 'Existing',
      heroTitleLineTwo: 'Encrypted Restore',
      heroDescription: 'This should not be overwritten when decryption fails.',
    };

    writeJson(path.join(sourceRoot, 'articles', 'articles.json'), [
      {
        id: 'replacement-encrypted-restore-article-1',
        title: 'Replacement Encrypted Restore Article',
        date: '2026-05-24',
        description: 'Replacement data',
        tags: ['replacement'],
        content: '# Replacement Encrypted Restore Article',
        createdAt: 1,
        updatedAt: 2,
      },
    ]);
    writeJson(path.join(sourceRoot, 'navigation', 'tools.json'), []);
    writeJson(path.join(targetRoot, 'articles', 'articles.json'), [existingArticle]);
    writeJson(path.join(targetRoot, 'navigation', 'tools.json'), existingNavigation);
    writeJson(path.join(targetRoot, 'settings', 'site.json'), existingSettings);

    execFileSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'data', 'verify-runtime-data.mjs'), targetRoot, '--write-manifest'],
      { encoding: 'utf8' }
    );

    const existingArticles = fs.readFileSync(path.join(targetRoot, 'articles', 'articles.json'), 'utf8');
    const existingNavigationData = fs.readFileSync(path.join(targetRoot, 'navigation', 'tools.json'), 'utf8');
    const existingSettingsData = fs.readFileSync(path.join(targetRoot, 'settings', 'site.json'), 'utf8');
    const existingManifest = fs.readFileSync(path.join(targetRoot, 'manifest.json'), 'utf8');

    execFileSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'data', 'backup-to-github.mjs'), sourceRoot, encryptedBackupPath],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          GITHUB_BACKUP_ENCRYPTION_KEY: 'correct-encrypted-restore-key',
        },
      }
    );

    const restoreResult = spawnSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'data', 'restore-encrypted-backup.mjs'), encryptedBackupPath, targetRoot],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          GITHUB_BACKUP_ENCRYPTION_KEY: 'wrong-encrypted-restore-key',
        },
      }
    );

    expect(restoreResult.status).toBe(1);
    expect(restoreResult.stderr).toContain('Encrypted backup restore failed:');

    expect(fs.readFileSync(path.join(targetRoot, 'articles', 'articles.json'), 'utf8')).toBe(existingArticles);
    expect(fs.readFileSync(path.join(targetRoot, 'navigation', 'tools.json'), 'utf8')).toBe(existingNavigationData);
    expect(fs.readFileSync(path.join(targetRoot, 'settings', 'site.json'), 'utf8')).toBe(existingSettingsData);
    expect(fs.readFileSync(path.join(targetRoot, 'manifest.json'), 'utf8')).toBe(existingManifest);
    expect(fs.readdirSync(targetRoot).some((entry) => entry.startsWith('.restore-'))).toBe(false);
  });

  it('copies encrypted backups into a local Git backup repository without pushing by default', () => {
    const sourceRoot = createTempDirectory();
    const backupRepo = createTempDirectory();
    const encryptedBackupPath = path.join(createTempDirectory(), 'backup.enc.json');
    const secret = 'test-secret-for-git-backup-repository';
    const article = {
      id: 'repository-backup-article-1',
      title: 'Repository Backup Article',
      date: '2026-05-23',
      description: 'Repository backup test',
      tags: ['backup'],
      content: '# Repository Backup Article',
      createdAt: 1,
      updatedAt: 2,
    };

    writeJson(path.join(sourceRoot, 'articles', 'articles.json'), [article]);
    writeJson(path.join(sourceRoot, 'navigation', 'tools.json'), []);
    execFileSync('git', ['init'], { cwd: backupRepo, encoding: 'utf8' });
    execFileSync('git', ['config', 'user.email', 'backup@example.test'], { cwd: backupRepo, encoding: 'utf8' });
    execFileSync('git', ['config', 'user.name', 'Backup Bot'], { cwd: backupRepo, encoding: 'utf8' });

    const backupOutput = execFileSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'data', 'backup-to-github.mjs'), sourceRoot, encryptedBackupPath],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          GITHUB_BACKUP_ENCRYPTION_KEY: secret,
          GITHUB_BACKUP_REPO_PATH: backupRepo,
          GITHUB_BACKUP_PUSH: 'false',
        },
      }
    );
    const parsedOutput = JSON.parse(backupOutput);
    const repositoryTarget = path.join(backupRepo, 'backups', path.basename(encryptedBackupPath));

    expect(parsedOutput.repositoryBackup).toEqual({
      targetPath: repositoryTarget,
      committed: true,
      pushed: false,
    });
    expect(fs.existsSync(repositoryTarget)).toBe(true);
    expect(JSON.stringify(JSON.parse(fs.readFileSync(repositoryTarget, 'utf8')))).not.toContain(
      'Repository Backup Article'
    );

    const committedFiles = execFileSync('git', ['show', '--name-only', '--format=', 'HEAD'], {
      cwd: backupRepo,
      encoding: 'utf8',
    });

    expect(committedFiles).toContain(`backups/${path.basename(encryptedBackupPath)}`);
  });

  it('keeps existing runtime data when staged import verification fails', () => {
    const targetRoot = createTempDirectory();
    const backupPath = path.join(createTempDirectory(), 'invalid-backup.json');
    const existingArticle = {
      id: 'existing-article-1',
      title: 'Existing Article',
      date: '2026-05-23',
      description: 'Existing data must survive failed imports',
      tags: ['existing'],
      content: '# Existing Article',
      slug: 'existing-article',
      createdAt: 1,
      updatedAt: 2,
    };
    const existingNavigation = [
      {
        name: 'Existing',
        icon: 'book',
        slug: 'existing',
        tools: [],
      },
    ];
    const existingSettings = {
      siteName: 'Existing Site',
      siteDescription: 'Existing settings',
      workspaceLabel: 'workspace / existing',
      heroTitleLineOne: 'Existing',
      heroTitleLineTwo: 'Data',
      heroDescription: 'This should not be overwritten by a failed import.',
    };

    writeJson(path.join(targetRoot, 'articles', 'articles.json'), [existingArticle]);
    writeJson(path.join(targetRoot, 'navigation', 'tools.json'), existingNavigation);
    writeJson(path.join(targetRoot, 'settings', 'site.json'), existingSettings);

    execFileSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'data', 'verify-runtime-data.mjs'), targetRoot, '--write-manifest'],
      { encoding: 'utf8' }
    );

    const existingManifest = JSON.parse(fs.readFileSync(path.join(targetRoot, 'manifest.json'), 'utf8'));

    writeJson(backupPath, {
      version: 1,
      data: {
        articles: [
          {
            id: 'duplicate-1',
            title: 'Duplicate',
            date: '2026-05-23',
            description: 'Invalid duplicate slug',
            tags: [],
            content: '# Duplicate 1',
            slug: 'duplicate',
            createdAt: 1,
            updatedAt: 2,
          },
          {
            id: 'duplicate-2',
            title: 'Duplicate',
            date: '2026-05-23',
            description: 'Invalid duplicate slug',
            tags: [],
            content: '# Duplicate 2',
            slug: 'duplicate',
            createdAt: 1,
            updatedAt: 2,
          },
        ],
        navigation: [],
        settings: existingSettings,
      },
    });

    expect(() => {
      execFileSync(
        process.execPath,
        [path.join(repoRoot, 'scripts', 'data', 'import-runtime-data.mjs'), backupPath, targetRoot],
        { encoding: 'utf8', stdio: 'pipe' }
      );
    }).toThrow();

    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'articles', 'articles.json'), 'utf8'))).toEqual([
      existingArticle,
    ]);
    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'navigation', 'tools.json'), 'utf8'))).toEqual(
      existingNavigation
    );
    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'settings', 'site.json'), 'utf8'))).toEqual(
      existingSettings
    );
    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'manifest.json'), 'utf8'))).toEqual(existingManifest);
    expect(fs.readdirSync(targetRoot).some((entry) => entry.startsWith('.restore-'))).toBe(false);
  });

  it('rejects invalid article backups without replacing existing runtime data', () => {
    const targetRoot = createTempDirectory();
    const backupPath = path.join(createTempDirectory(), 'invalid-article-backup.json');
    const existingArticle = {
      id: 'existing-invalid-article-1',
      title: 'Existing Invalid Article Guard',
      date: '2026-05-25',
      description: 'Existing data must survive invalid article imports',
      tags: ['existing'],
      content: '# Existing Invalid Article Guard',
      slug: 'existing-invalid-article-guard',
      createdAt: 1,
      updatedAt: 2,
    };
    const existingNavigation = [
      {
        name: 'Existing',
        icon: 'book',
        slug: 'existing',
        tools: [],
      },
    ];
    const existingSettings = {
      ...validSettings,
      siteName: 'Existing Invalid Article Guard Site',
    };

    writeJson(path.join(targetRoot, 'articles', 'articles.json'), [existingArticle]);
    writeJson(path.join(targetRoot, 'navigation', 'tools.json'), existingNavigation);
    writeJson(path.join(targetRoot, 'settings', 'site.json'), existingSettings);

    execFileSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'data', 'verify-runtime-data.mjs'), targetRoot, '--write-manifest'],
      { encoding: 'utf8' }
    );

    const existingManifest = JSON.parse(fs.readFileSync(path.join(targetRoot, 'manifest.json'), 'utf8'));

    writeJson(backupPath, {
      version: 1,
      data: {
        articles: [
          {
            id: 'invalid-article-1',
            title: 'Invalid Article',
            date: '2026-05-25',
            description: 'createdAt has the wrong type.',
            tags: ['invalid'],
            content: '# Invalid Article',
            slug: 'invalid-article',
            createdAt: '1',
            updatedAt: 2,
          },
        ],
        navigation: [],
        settings: existingSettings,
      },
    });

    expect(() => {
      execFileSync(
        process.execPath,
        [path.join(repoRoot, 'scripts', 'data', 'import-runtime-data.mjs'), backupPath, targetRoot],
        { encoding: 'utf8', stdio: 'pipe' }
      );
    }).toThrow();

    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'articles', 'articles.json'), 'utf8'))).toEqual([
      existingArticle,
    ]);
    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'navigation', 'tools.json'), 'utf8'))).toEqual(
      existingNavigation
    );
    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'settings', 'site.json'), 'utf8'))).toEqual(
      existingSettings
    );
    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'manifest.json'), 'utf8'))).toEqual(existingManifest);
    expect(fs.readdirSync(targetRoot).some((entry) => entry.startsWith('.restore-'))).toBe(false);
  });

  it('rejects invalid navigation backups without replacing existing runtime data', () => {
    const targetRoot = createTempDirectory();
    const backupPath = path.join(createTempDirectory(), 'invalid-navigation-backup.json');
    const existingNavigation = [
      {
        name: 'Existing',
        icon: 'book',
        slug: 'existing',
        tools: [],
      },
    ];

    writeJson(path.join(targetRoot, 'articles', 'articles.json'), []);
    writeJson(path.join(targetRoot, 'navigation', 'tools.json'), existingNavigation);
    writeJson(path.join(targetRoot, 'settings', 'site.json'), {
      siteName: 'Existing Site',
      siteDescription: 'Existing settings',
      workspaceLabel: 'workspace / existing',
      heroTitleLineOne: 'Existing',
      heroTitleLineTwo: 'Data',
      heroDescription: 'Invalid navigation imports must not replace this.',
    });
    writeJson(backupPath, {
      version: 1,
      data: {
        articles: [],
        navigation: [
          {
            name: 'Invalid',
            icon: 'book',
            slug: 'invalid',
            tools: [
              {
                icon: 'book',
                title: 'Insecure URL',
                description: 'Navigation tools must use HTTPS URLs.',
                url: 'http://example.com',
                tags: ['docs'],
              },
            ],
          },
        ],
      },
    });

    expect(() => {
      execFileSync(
        process.execPath,
        [path.join(repoRoot, 'scripts', 'data', 'import-runtime-data.mjs'), backupPath, targetRoot],
        { encoding: 'utf8', stdio: 'pipe' }
      );
    }).toThrow();

    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'navigation', 'tools.json'), 'utf8'))).toEqual(
      existingNavigation
    );
    expect(fs.readdirSync(targetRoot).some((entry) => entry.startsWith('.restore-'))).toBe(false);
  });

  it('fails verification when runtime navigation data violates the public contract', () => {
    const targetRoot = createTempDirectory();

    writeJson(path.join(targetRoot, 'articles', 'articles.json'), []);
    writeJson(path.join(targetRoot, 'navigation', 'tools.json'), [
      {
        name: 'Invalid',
        icon: 'book',
        slug: 'invalid',
        tools: [
          {
            icon: 'book',
            title: 'Missing Tags',
            description: 'Navigation tools require tags.',
            url: 'https://example.com',
            tags: [],
          },
        ],
      },
    ]);

    expect(() => {
      execFileSync(
        process.execPath,
        [path.join(repoRoot, 'scripts', 'data', 'verify-runtime-data.mjs'), targetRoot],
        { encoding: 'utf8', stdio: 'pipe' }
      );
    }).toThrow();
  });

  it('fails verification when runtime article data violates the public contract', () => {
    const targetRoot = createTempDirectory();

    writeJson(path.join(targetRoot, 'articles', 'articles.json'), [
      {
        id: 'invalid-runtime-article-1',
        title: 'Invalid Runtime Article',
        date: '2026-05-25',
        tags: ['invalid'],
        content: '# Invalid Runtime Article',
        slug: 'invalid-runtime-article',
        createdAt: 1,
        updatedAt: 2,
      },
    ]);
    writeJson(path.join(targetRoot, 'navigation', 'tools.json'), []);

    expect(() => {
      execFileSync(
        process.execPath,
        [path.join(repoRoot, 'scripts', 'data', 'verify-runtime-data.mjs'), targetRoot],
        { encoding: 'utf8', stdio: 'pipe' }
      );
    }).toThrow();
  });

  it('fails verification when runtime settings data is incomplete', () => {
    const targetRoot = createTempDirectory();

    writeJson(path.join(targetRoot, 'articles', 'articles.json'), []);
    writeJson(path.join(targetRoot, 'navigation', 'tools.json'), []);
    writeJson(path.join(targetRoot, 'settings', 'site.json'), {
      ...validSettings,
      heroDescription: '',
    });

    expect(() => {
      execFileSync(
        process.execPath,
        [path.join(repoRoot, 'scripts', 'data', 'verify-runtime-data.mjs'), targetRoot],
        { encoding: 'utf8', stdio: 'pipe' }
      );
    }).toThrow();
  });

  it('rejects invalid settings backups without replacing existing runtime data', () => {
    const targetRoot = createTempDirectory();
    const backupPath = path.join(createTempDirectory(), 'invalid-settings-backup.json');
    const existingArticle = {
      id: 'existing-settings-article-1',
      title: 'Existing Settings Article',
      date: '2026-05-25',
      description: 'Existing data must survive invalid settings imports',
      tags: ['existing'],
      content: '# Existing Settings Article',
      slug: 'existing-settings-article',
      createdAt: 1,
      updatedAt: 2,
    };
    const existingNavigation = [
      {
        name: 'Existing',
        icon: 'book',
        slug: 'existing',
        tools: [],
      },
    ];
    const existingSettings = {
      ...validSettings,
      siteName: 'Existing Settings Site',
    };

    writeJson(path.join(targetRoot, 'articles', 'articles.json'), [existingArticle]);
    writeJson(path.join(targetRoot, 'navigation', 'tools.json'), existingNavigation);
    writeJson(path.join(targetRoot, 'settings', 'site.json'), existingSettings);

    execFileSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'data', 'verify-runtime-data.mjs'), targetRoot, '--write-manifest'],
      { encoding: 'utf8' }
    );

    const existingManifest = JSON.parse(fs.readFileSync(path.join(targetRoot, 'manifest.json'), 'utf8'));

    writeJson(backupPath, {
      version: 1,
      data: {
        articles: [],
        navigation: [],
        settings: {
          ...validSettings,
          siteName: ' ',
        },
      },
    });

    expect(() => {
      execFileSync(
        process.execPath,
        [path.join(repoRoot, 'scripts', 'data', 'import-runtime-data.mjs'), backupPath, targetRoot],
        { encoding: 'utf8', stdio: 'pipe' }
      );
    }).toThrow();

    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'articles', 'articles.json'), 'utf8'))).toEqual([
      existingArticle,
    ]);
    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'navigation', 'tools.json'), 'utf8'))).toEqual(
      existingNavigation
    );
    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'settings', 'site.json'), 'utf8'))).toEqual(
      existingSettings
    );
    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'manifest.json'), 'utf8'))).toEqual(existingManifest);
    expect(fs.readdirSync(targetRoot).some((entry) => entry.startsWith('.restore-'))).toBe(false);
  });

  it('imports legacy backups without settings using default settings', () => {
    const targetRoot = createTempDirectory();
    const backupPath = path.join(createTempDirectory(), 'legacy-backup.json');

    writeJson(backupPath, {
      version: 1,
      data: {
        articles: [],
        navigation: [],
      },
    });

    execFileSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'data', 'import-runtime-data.mjs'), backupPath, targetRoot],
      { encoding: 'utf8' }
    );

    expect(JSON.parse(fs.readFileSync(path.join(targetRoot, 'settings', 'site.json'), 'utf8'))).toEqual({
      siteName: '我的技术书桌',
      siteDescription: '记录工程实践、项目复盘和长期资料的个人博客',
      workspaceLabel: 'personal notes / engineering blog',
      heroTitleLineOne: '把解决过的问题，',
      heroTitleLineTwo: '整理成下次还能用的笔记',
      heroDescription:
        '这里记录我在前端体验、工程效率、AI 工具和个人知识管理里的真实问题：背景、判断、试错和最后留下的做法。它不是教程合集，更像一份持续校准的工作日志。',
      ...defaultIntroCardSettings,
    });
  });

  it('rolls back existing runtime files when restore replacement fails midway', async () => {
    const targetRoot = createTempDirectory();
    const existingArticle = {
      id: 'existing-article-1',
      title: 'Existing Article',
      date: '2026-05-23',
      description: 'Existing data must survive failed restores',
      tags: ['existing'],
      content: '# Existing Article',
      slug: 'existing-article',
      createdAt: 1,
      updatedAt: 2,
    };
    const existingNavigation = [
      {
        name: 'Existing',
        icon: 'book',
        slug: 'existing',
        tools: [],
      },
    ];
    const existingSettings = {
      siteName: 'Existing Site',
      siteDescription: 'Existing settings',
      workspaceLabel: 'workspace / existing',
      heroTitleLineOne: 'Existing',
      heroTitleLineTwo: 'Data',
      heroDescription: 'This should be restored after a failed replacement.',
    };

    writeJson(path.join(targetRoot, 'articles', 'articles.json'), [existingArticle]);
    writeJson(path.join(targetRoot, 'navigation', 'tools.json'), existingNavigation);
    writeJson(path.join(targetRoot, 'settings', 'site.json'), existingSettings);

    execFileSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'data', 'verify-runtime-data.mjs'), targetRoot, '--write-manifest'],
      { encoding: 'utf8' }
    );

    const existingArticles = fs.readFileSync(path.join(targetRoot, 'articles', 'articles.json'), 'utf8');
    const existingNavigationData = fs.readFileSync(path.join(targetRoot, 'navigation', 'tools.json'), 'utf8');
    const existingSettingsData = fs.readFileSync(path.join(targetRoot, 'settings', 'site.json'), 'utf8');
    const existingManifest = fs.readFileSync(path.join(targetRoot, 'manifest.json'), 'utf8');
    const runtimeDataModule = await import(
      pathToFileURL(path.join(repoRoot, 'scripts', 'data', 'runtime-data.mjs')).href
    );
    const restoreRuntimeDataAtomically = runtimeDataModule.restoreRuntimeDataAtomically as (
      dataRoot: string,
      data: {
        articles: unknown[];
        navigation: unknown[];
        settings: Record<string, unknown>;
      }
    ) => void;
    let stagedReplaceCount = 0;
    const renameSync = fs.renameSync;

    vi.spyOn(fs, 'renameSync').mockImplementation((oldPath, newPath) => {
      const oldPathText = String(oldPath);

      if (oldPathText.includes('.restore-staging') && !oldPathText.endsWith('.tmp')) {
        stagedReplaceCount += 1;
      }

      if (stagedReplaceCount === 2) {
        throw new Error('Simulated runtime replacement failure.');
      }

      return renameSync(oldPath, newPath);
    });

    expect(() => {
      restoreRuntimeDataAtomically(targetRoot, {
        articles: [
          {
            id: 'replacement-article-1',
            title: 'Replacement Article',
            date: '2026-05-23',
            description: 'Replacement data',
            tags: [],
            content: '# Replacement',
            slug: 'replacement-article',
            createdAt: 1,
            updatedAt: 2,
          },
        ],
        navigation: [],
        settings: {
          ...existingSettings,
          siteName: 'Replacement Site',
        },
      });
    }).toThrow('Simulated runtime replacement failure.');

    expect(fs.readFileSync(path.join(targetRoot, 'articles', 'articles.json'), 'utf8')).toBe(existingArticles);
    expect(fs.readFileSync(path.join(targetRoot, 'navigation', 'tools.json'), 'utf8')).toBe(existingNavigationData);
    expect(fs.readFileSync(path.join(targetRoot, 'settings', 'site.json'), 'utf8')).toBe(existingSettingsData);
    expect(fs.readFileSync(path.join(targetRoot, 'manifest.json'), 'utf8')).toBe(existingManifest);
    expect(fs.readdirSync(targetRoot).some((entry) => entry.startsWith('.restore-'))).toBe(false);
  });
});

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const MANIFEST_VERSION = 1;

export const DEFAULT_SITE_SETTINGS = {
  siteName: '个人技术博客导航',
  siteDescription: '个人技术文章、常用链接和知识入口',
  workspaceLabel: 'workspace / blog-navigation',
  heroTitleLineOne: '技术博客与常用链接的',
  heroTitleLineTwo: '个人工作台',
  heroDescription:
    '把长期文章、开发文档、工具入口和编辑数据放在一个轻量系统里，公开阅读和服务器迁移都保持清晰。',
};

const SITE_SETTING_KEYS = [
  'siteName',
  'siteDescription',
  'workspaceLabel',
  'heroTitleLineOne',
  'heroTitleLineTwo',
  'heroDescription',
];

export function resolveDataRoot(input) {
  return path.resolve(input || process.env.BLOG_DATA_ROOT || 'data');
}

export function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

export function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const parsed = readJsonFile(filePath);

  if (!Array.isArray(parsed)) {
    throw new Error(`${filePath} must contain a JSON array.`);
  }

  return parsed;
}

export function readJsonObject(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  const parsed = readJsonFile(filePath);

  if (!isRecord(parsed) || Array.isArray(parsed)) {
    throw new Error(`${filePath} must contain a JSON object.`);
  }

  return parsed;
}

export function createDefaultSiteSettings() {
  return { ...DEFAULT_SITE_SETTINGS };
}

function normalizeSlugPart(value) {
  return String(value)
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function normalizeIdSuffix(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(-6) || 'entry';
}

export function createArticleSlug(article) {
  const base = normalizeSlugPart(article.title) || 'article';
  return `${base}-${normalizeIdSuffix(article.id)}`;
}

function normalizeArticleSlug(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const slug = normalizeSlugPart(value);
  return slug.length > 0 ? slug : null;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeArticle(article) {
  if (!isRecord(article) || Array.isArray(article)) {
    throw new Error('Article data must contain JSON objects.');
  }

  if (
    typeof article.id !== 'string' ||
    typeof article.title !== 'string' ||
    typeof article.date !== 'string' ||
    typeof article.description !== 'string' ||
    !isStringArray(article.tags) ||
    typeof article.content !== 'string' ||
    !isFiniteNumber(article.createdAt) ||
    !isFiniteNumber(article.updatedAt) ||
    (article.slug !== undefined && typeof article.slug !== 'string')
  ) {
    throw new Error(
      'Articles must include id, title, date, description, tags, content, createdAt, and updatedAt with valid types.'
    );
  }

  return {
    ...article,
    slug: normalizeArticleSlug(article.slug) || createArticleSlug(article),
  };
}

export function normalizeArticles(articles) {
  const slugs = new Set();

  return articles.map((article) => {
    const normalized = normalizeArticle(article);

    if (slugs.has(normalized.slug)) {
      throw new Error(`Duplicate article slug: ${normalized.slug}`);
    }

    slugs.add(normalized.slug);
    return normalized;
  });
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function normalizeSiteSettings(value) {
  if (!isRecord(value) || Array.isArray(value)) {
    throw new Error('Site settings must contain a JSON object.');
  }

  const settings = {};

  for (const key of SITE_SETTING_KEYS) {
    if (!isNonEmptyString(value[key])) {
      throw new Error(`Site settings must include a non-empty ${key}.`);
    }

    settings[key] = value[key].trim();
  }

  return settings;
}

function readSiteSettings(filePath) {
  if (!fs.existsSync(filePath)) {
    return createDefaultSiteSettings();
  }

  return normalizeSiteSettings(readJsonFile(filePath));
}

function createNavigationSlug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{Letter}\p{Number}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeNavigationTags(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isNonEmptyString)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function isValidNavigationUrl(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }

  try {
    const url = new URL(value.trim());

    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeNavigationTool(value) {
  if (!isRecord(value) || Array.isArray(value)) {
    throw new Error('Navigation tools must contain JSON objects.');
  }

  if (
    !isNonEmptyString(value.icon) ||
    !isNonEmptyString(value.title) ||
    !isNonEmptyString(value.description) ||
    !isValidNavigationUrl(value.url)
  ) {
    throw new Error('Navigation tools must include icon, title, description, and an HTTPS url.');
  }

  const tags = normalizeNavigationTags(value.tags);

  if (tags.length === 0) {
    throw new Error('Navigation tools must include at least one tag.');
  }

  return {
    icon: value.icon.trim(),
    title: value.title.trim(),
    description: value.description.trim(),
    url: value.url.trim(),
    tags,
  };
}

function normalizeNavigationCategory(value) {
  if (!isRecord(value) || Array.isArray(value)) {
    throw new Error('Navigation categories must contain JSON objects.');
  }

  if (
    !isNonEmptyString(value.name) ||
    !isNonEmptyString(value.icon) ||
    !Array.isArray(value.tools)
  ) {
    throw new Error('Navigation categories must include name, icon, and tools array.');
  }

  const slug = createNavigationSlug(isNonEmptyString(value.slug) ? value.slug : value.name);

  if (!slug) {
    throw new Error('Navigation categories must have a valid slug.');
  }

  return {
    name: value.name.trim(),
    icon: value.icon.trim(),
    slug,
    tools: value.tools.map(normalizeNavigationTool),
  };
}

export function normalizeNavigation(navigation) {
  if (!Array.isArray(navigation)) {
    throw new Error('Navigation data must contain a JSON array.');
  }

  const slugs = new Set();

  return navigation.map((category) => {
    const normalized = normalizeNavigationCategory(category);

    if (slugs.has(normalized.slug)) {
      throw new Error(`Duplicate navigation category slug: ${normalized.slug}`);
    }

    slugs.add(normalized.slug);
    return normalized;
  });
}

export function hashJson(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

export function createResourceManifest(value) {
  const hash = hashJson(value);
  const updatedAt = new Date().toISOString();

  return {
    revision: `${Date.now().toString(36)}-${process.hrtime.bigint().toString(36)}-${hash.slice(0, 12)}`,
    hash,
    updatedAt,
  };
}

export function createManifest(data) {
  const articles = createResourceManifest(data.articles);
  const navigation = createResourceManifest(data.navigation);
  const settings = createResourceManifest(data.settings);

  return {
    version: MANIFEST_VERSION,
    updatedAt: settings.updatedAt,
    resources: {
      articles,
      navigation,
      settings,
    },
  };
}

export function readRuntimeData(dataRoot) {
  return {
    articles: normalizeArticles(readJsonArray(path.join(dataRoot, 'articles', 'articles.json'))),
    navigation: normalizeNavigation(readJsonArray(path.join(dataRoot, 'navigation', 'tools.json'))),
    settings: readSiteSettings(path.join(dataRoot, 'settings', 'site.json')),
  };
}

export function writeJsonAtomically(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  try {
    fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    fs.rmSync(tempPath, { force: true });
    throw error;
  }
}

export function writeRuntimeData(dataRoot, data) {
  writeJsonAtomically(path.join(dataRoot, 'articles', 'articles.json'), data.articles);
  writeJsonAtomically(path.join(dataRoot, 'navigation', 'tools.json'), data.navigation);
  writeJsonAtomically(path.join(dataRoot, 'settings', 'site.json'), data.settings);
}

export function writeManifest(dataRoot, manifest) {
  writeJsonAtomically(path.join(dataRoot, 'manifest.json'), manifest);
}

function createRestoreDirectory(dataRoot, name) {
  const directory = path.join(dataRoot, `${name}-${process.pid}-${Date.now()}`);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function getRuntimeDataFiles(dataRoot) {
  return [
    path.join(dataRoot, 'articles', 'articles.json'),
    path.join(dataRoot, 'navigation', 'tools.json'),
    path.join(dataRoot, 'settings', 'site.json'),
    path.join(dataRoot, 'manifest.json'),
  ];
}

function copyExistingFiles(files, fromRoot, toRoot) {
  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const relativePath = path.relative(fromRoot, filePath);
    const backupPath = path.join(toRoot, relativePath);
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(filePath, backupPath);
  }
}

function restoreFilesFromBackup(files, dataRoot, backupRoot) {
  for (const filePath of files) {
    const relativePath = path.relative(dataRoot, filePath);
    const backupPath = path.join(backupRoot, relativePath);

    if (!fs.existsSync(backupPath)) {
      fs.rmSync(filePath, { force: true });
      continue;
    }

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.copyFileSync(backupPath, filePath);
  }
}

function replaceFilesFromStaging(files, dataRoot, stagingRoot) {
  for (const filePath of files) {
    const relativePath = path.relative(dataRoot, filePath);
    const stagedPath = path.join(stagingRoot, relativePath);

    if (!fs.existsSync(stagedPath)) {
      throw new Error(`Staged restore file is missing: ${relativePath}`);
    }

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.renameSync(stagedPath, filePath);
  }
}

export function restoreRuntimeDataAtomically(dataRoot, data) {
  const manifest = createManifest(data);
  const stagingRoot = createRestoreDirectory(dataRoot, '.restore-staging');
  const backupRoot = createRestoreDirectory(dataRoot, '.restore-backup');
  const files = getRuntimeDataFiles(dataRoot);
  let backupCaptured = false;

  try {
    writeRuntimeData(stagingRoot, data);
    writeManifest(stagingRoot, manifest);

    const stagedData = readRuntimeData(stagingRoot);
    const stagedManifest = readManifest(stagingRoot);
    const problems = getManifestProblems(stagedData, stagedManifest);

    if (problems.length > 0) {
      throw new Error(`Staged restore verification failed: ${problems.join('; ')}`);
    }

    copyExistingFiles(files, dataRoot, backupRoot);
    backupCaptured = true;
    replaceFilesFromStaging(files, dataRoot, stagingRoot);

    return manifest;
  } catch (error) {
    if (backupCaptured) {
      restoreFilesFromBackup(files, dataRoot, backupRoot);
    }

    throw error;
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
    fs.rmSync(backupRoot, { recursive: true, force: true });
  }
}

export function readManifest(dataRoot) {
  const manifestPath = path.join(dataRoot, 'manifest.json');
  return fs.existsSync(manifestPath) ? readJsonFile(manifestPath) : null;
}

export function getManifestProblems(data, manifest) {
  const problems = [];

  if (!isRecord(manifest) || manifest.version !== MANIFEST_VERSION || !isRecord(manifest.resources)) {
    return ['manifest.json is missing or invalid.'];
  }

  for (const resource of ['articles', 'navigation', 'settings']) {
    const resourceManifest = manifest.resources[resource];

    if (!isRecord(resourceManifest)) {
      problems.push(`${resource} manifest is missing.`);
      continue;
    }

    if (resourceManifest.hash !== hashJson(data[resource])) {
      problems.push(`${resource} hash does not match manifest.`);
    }
  }

  return problems;
}

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

export function normalizeArticles(articles) {
  const slugs = new Set();

  return articles.map((article) => {
    if (!isRecord(article)) {
      throw new Error('Article data must contain JSON objects.');
    }

    const normalized = {
      ...article,
      slug: normalizeArticleSlug(article.slug) || createArticleSlug(article),
    };

    if (slugs.has(normalized.slug)) {
      throw new Error(`Duplicate article slug: ${normalized.slug}`);
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
    navigation: readJsonArray(path.join(dataRoot, 'navigation', 'tools.json')),
    settings: readJsonObject(path.join(dataRoot, 'settings', 'site.json'), DEFAULT_SITE_SETTINGS),
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

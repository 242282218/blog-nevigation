#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const BACKUP_VERSION = 1;
const MANIFEST_VERSION = 1;
const DEFAULT_SITE_SETTINGS = {
  siteName: '个人技术博客导航',
  siteDescription: '个人技术文章、常用链接和知识入口',
  workspaceLabel: 'workspace / blog-navigation',
  heroTitleLineOne: '技术博客与常用链接的',
  heroTitleLineTwo: '个人工作台',
  heroDescription:
    '把长期文章、开发文档、工具入口和编辑数据放在一个轻量系统里，公开阅读和服务器迁移都保持清晰。',
};

function resolveDataRoot(input) {
  return path.resolve(input || process.env.BLOG_DATA_ROOT || 'data');
}

function createDefaultOutputPath() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.resolve('output', `blog-navigation-backup-${timestamp}.json`);
}

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (!Array.isArray(parsed)) {
    throw new Error(`${filePath} must contain a JSON array.`);
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

function createArticleSlug(article) {
  const base = normalizeSlugPart(article.title) || 'article';
  return `${base}-${normalizeIdSuffix(article.id)}`;
}

function hashJson(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function createResourceManifest(value) {
  const hash = hashJson(value);
  const updatedAt = new Date().toISOString();

  return {
    revision: `${Date.now().toString(36)}-${process.hrtime.bigint().toString(36)}-${hash.slice(0, 12)}`,
    hash,
    updatedAt,
  };
}

function createManifest(data) {
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

function normalizeArticleSlug(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const slug = normalizeSlugPart(value);
  return slug.length > 0 ? slug : null;
}

function normalizeArticles(articles) {
  const slugs = new Set();

  return articles.map((article) => {
    if (!article || typeof article !== 'object' || Array.isArray(article)) {
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

function readJsonObject(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${filePath} must contain a JSON object.`);
  }

  return parsed;
}

function ensureParentDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

const [dataRootArg, outputArg] = process.argv.slice(2);
const dataRoot = resolveDataRoot(dataRootArg);
const outputPath = path.resolve(outputArg || createDefaultOutputPath());

const articles = normalizeArticles(readJsonArray(path.join(dataRoot, 'articles', 'articles.json')));
const navigation = readJsonArray(path.join(dataRoot, 'navigation', 'tools.json'));
const settings = readJsonObject(
  path.join(dataRoot, 'settings', 'site.json'),
  DEFAULT_SITE_SETTINGS
);
const manifest = createManifest({ articles, navigation, settings });
const payload = {
  version: BACKUP_VERSION,
  exportedAt: new Date().toISOString(),
  source: 'local',
  persistent: true,
  dataRoot,
  manifest,
  data: {
    articles,
    navigation,
    settings,
  },
};

ensureParentDirectory(outputPath);
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  dataRoot,
  outputPath,
  articles: articles.length,
  categories: navigation.length,
  settings: true,
  manifest: true,
}, null, 2));

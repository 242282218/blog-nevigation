#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

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

function isRecord(value) {
  return typeof value === 'object' && value !== null;
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

function parseBackupData(value) {
  if (!isRecord(value)) {
    throw new Error('Backup file must contain a JSON object.');
  }

  const source = isRecord(value.data) ? value.data : value;

  if (!Array.isArray(source.articles) || !Array.isArray(source.navigation)) {
    throw new Error('Backup file must include articles and navigation arrays.');
  }

  return {
    articles: normalizeArticles(source.articles),
    navigation: source.navigation,
    settings: isRecord(source.settings) ? source.settings : DEFAULT_SITE_SETTINGS,
  };
}

function writeJsonAtomically(filePath, value) {
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

const [backupFileArg, dataRootArg] = process.argv.slice(2);

if (!backupFileArg) {
  console.error('Usage: node scripts/data/import-runtime-data.mjs <backup-file> [data-root]');
  process.exit(1);
}

const backupFile = path.resolve(backupFileArg);
const dataRoot = resolveDataRoot(dataRootArg);
const payload = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
const data = parseBackupData(payload);

writeJsonAtomically(path.join(dataRoot, 'articles', 'articles.json'), data.articles);
writeJsonAtomically(path.join(dataRoot, 'navigation', 'tools.json'), data.navigation);
writeJsonAtomically(path.join(dataRoot, 'settings', 'site.json'), data.settings);

console.log(JSON.stringify({
  dataRoot,
  backupFile,
  articles: data.articles.length,
  categories: data.navigation.length,
  settings: true,
}, null, 2));

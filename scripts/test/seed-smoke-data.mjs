import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {
  createDefaultSiteSettings,
  normalizeArticles,
  normalizeNavigation,
  resolveDataRoot,
  restoreRuntimeDataAtomically,
} from '../data/runtime-data.mjs';

const postsDir = path.resolve('content', 'seeds', 'posts');
const toolsPath = path.resolve('content', 'seeds', 'navigation', 'data', 'tools.json');
const dataRoot = resolveDataRoot(process.env.BLOG_DATA_ROOT);

function readJsonArray(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function collectMarkdownFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'navigation') {
        results.push(...collectMarkdownFiles(fullPath));
      }
    } else if (entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

function buildArticle(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  const relativePath = path.relative(postsDir, filePath).replace(/\\/g, '/');
  const slug = relativePath.replace(/\.md$/, '').replace(/\/index$/, '');
  const dateString = data.date ? String(data.date) : '2026-01-01';
  const timestamp = Date.parse(dateString) || Date.now();

  const article = {
    id: slug,
    title: data.title || slug,
    date: dateString,
    description: data.description || '',
    tags: Array.isArray(data.tags) ? data.tags.filter((t) => typeof t === 'string') : [],
    content,
    createdAt: timestamp,
    updatedAt: timestamp,
    slug,
    kind: data.kind || 'essay',
    status: data.status || 'published',
    featured: Boolean(data.featured),
  };

  if (data.category) article.category = data.category;
  if (data.series) article.series = data.series;
  if (data.updatedDate) article.updatedDate = data.updatedDate;
  if (data.sourceLinks) article.sourceLinks = data.sourceLinks;
  if (data.revisionNotes) article.revisionNotes = data.revisionNotes;

  return article;
}

const articles = normalizeArticles(
  collectMarkdownFiles(postsDir).map(buildArticle)
);
const navigation = normalizeNavigation(readJsonArray(toolsPath));
const settings = createDefaultSiteSettings();

restoreRuntimeDataAtomically(dataRoot, { articles, navigation, settings });

console.log(
  JSON.stringify(
    {
      dataRoot,
      articles: articles.length,
      navigation: navigation.length,
      settings: true,
    },
    null,
    2
  )
);

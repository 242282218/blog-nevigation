#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const BACKUP_VERSION = 1;

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

function ensureParentDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

const [dataRootArg, outputArg] = process.argv.slice(2);
const dataRoot = resolveDataRoot(dataRootArg);
const outputPath = path.resolve(outputArg || createDefaultOutputPath());

const articles = readJsonArray(path.join(dataRoot, 'articles', 'articles.json'));
const navigation = readJsonArray(path.join(dataRoot, 'navigation', 'tools.json'));
const payload = {
  version: BACKUP_VERSION,
  exportedAt: new Date().toISOString(),
  source: 'local',
  persistent: true,
  dataRoot,
  data: {
    articles,
    navigation,
  },
};

ensureParentDirectory(outputPath);
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  dataRoot,
  outputPath,
  articles: articles.length,
  categories: navigation.length,
}, null, 2));

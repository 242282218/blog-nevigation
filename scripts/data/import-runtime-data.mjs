#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function resolveDataRoot(input) {
  return path.resolve(input || process.env.BLOG_DATA_ROOT || 'data');
}

function isRecord(value) {
  return typeof value === 'object' && value !== null;
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
    articles: source.articles,
    navigation: source.navigation,
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

console.log(JSON.stringify({
  dataRoot,
  backupFile,
  articles: data.articles.length,
  categories: data.navigation.length,
}, null, 2));

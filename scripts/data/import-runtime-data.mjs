#!/usr/bin/env node
import path from 'node:path';
import {
  createDefaultSiteSettings,
  isRecord,
  normalizeArticles,
  normalizeNavigation,
  normalizeSiteSettings,
  readJsonFile,
  restoreRuntimeDataAtomically,
  resolveDataRoot,
} from './runtime-data.mjs';

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
    navigation: normalizeNavigation(source.navigation),
    settings:
      source.settings === undefined
        ? createDefaultSiteSettings()
        : normalizeSiteSettings(source.settings),
  };
}

const [backupFileArg, dataRootArg] = process.argv.slice(2);

if (!backupFileArg) {
  console.error('Usage: node scripts/data/import-runtime-data.mjs <backup-file> [data-root]');
  process.exit(1);
}

const backupFile = path.resolve(backupFileArg);
const dataRoot = resolveDataRoot(dataRootArg);
const payload = readJsonFile(backupFile);
const data = parseBackupData(payload);

restoreRuntimeDataAtomically(dataRoot, data);

console.log(JSON.stringify({
  dataRoot,
  backupFile,
  articles: data.articles.length,
  categories: data.navigation.length,
  settings: true,
  manifest: true,
}, null, 2));

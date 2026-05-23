#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  createManifest,
  readRuntimeData,
  resolveDataRoot,
} from './runtime-data.mjs';

const BACKUP_VERSION = 1;
function createDefaultOutputPath() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.resolve('output', `blog-navigation-backup-${timestamp}.json`);
}

function ensureParentDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

const [dataRootArg, outputArg] = process.argv.slice(2);
const dataRoot = resolveDataRoot(dataRootArg);
const outputPath = path.resolve(outputArg || createDefaultOutputPath());

const data = readRuntimeData(dataRoot);
const manifest = createManifest(data);
const payload = {
  version: BACKUP_VERSION,
  exportedAt: new Date().toISOString(),
  source: 'local',
  persistent: true,
  dataRoot,
  manifest,
  data: {
    articles: data.articles,
    navigation: data.navigation,
    settings: data.settings,
  },
};

ensureParentDirectory(outputPath);
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  dataRoot,
  outputPath,
  articles: data.articles.length,
  categories: data.navigation.length,
  settings: true,
  manifest: true,
}, null, 2));

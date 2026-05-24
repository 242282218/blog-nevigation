#!/usr/bin/env node
import path from 'node:path';
import {
  DEFAULT_SITE_SETTINGS,
  isRecord,
  normalizeArticles,
  normalizeNavigation,
  readJsonFile,
  restoreRuntimeDataAtomically,
  resolveDataRoot,
} from './runtime-data.mjs';
import {
  decryptBackupPayload,
  getBackupEncryptionSecret,
} from './encrypted-backup.mjs';

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
    settings: isRecord(source.settings) ? source.settings : DEFAULT_SITE_SETTINGS,
  };
}

function main() {
  const [encryptedBackupFileArg, dataRootArg] = process.argv.slice(2);

  if (!encryptedBackupFileArg) {
    throw new Error('Usage: node scripts/data/restore-encrypted-backup.mjs <encrypted-backup-file> [data-root]');
  }

  const encryptedBackupFile = path.resolve(encryptedBackupFileArg);
  const dataRoot = resolveDataRoot(dataRootArg);
  const encryptedPayload = readJsonFile(encryptedBackupFile);
  const backupPayload = decryptBackupPayload(encryptedPayload, getBackupEncryptionSecret());
  const data = parseBackupData(backupPayload);

  restoreRuntimeDataAtomically(dataRoot, data);

  console.log(JSON.stringify({
    dataRoot,
    encryptedBackupFile,
    articles: data.articles.length,
    categories: data.navigation.length,
    settings: true,
    manifest: true,
  }, null, 2));
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Encrypted backup restore failed: ${message}`);
  process.exit(1);
}

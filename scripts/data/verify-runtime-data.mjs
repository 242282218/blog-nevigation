#!/usr/bin/env node
import {
  createManifest,
  getManifestProblems,
  readManifest,
  readRuntimeData,
  resolveDataRoot,
  writeManifest,
} from './runtime-data.mjs';

const args = process.argv.slice(2);
const writeManifestFlag = args.includes('--write-manifest');
const dataRootArg = args.find((arg) => !arg.startsWith('--'));
const dataRoot = resolveDataRoot(dataRootArg);

try {
  const data = readRuntimeData(dataRoot);
  const manifest = readManifest(dataRoot);
  const problems = getManifestProblems(data, manifest);

  if (problems.length > 0 && writeManifestFlag) {
    writeManifest(dataRoot, createManifest(data));
  }

  if (problems.length > 0 && !writeManifestFlag) {
    console.error(JSON.stringify({
      ok: false,
      dataRoot,
      problems,
      hint: 'Run npm run data:verify -- <data-root> --write-manifest to regenerate manifest.json.',
    }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({
    ok: true,
    dataRoot,
    repaired: problems.length > 0,
    articles: data.articles.length,
    categories: data.navigation.length,
    settings: true,
    manifest: true,
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    dataRoot,
    message: error instanceof Error ? error.message : 'Runtime data verification failed.',
  }, null, 2));
  process.exit(1);
}

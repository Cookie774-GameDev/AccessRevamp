import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commandInvocation } from './lib/command-platform.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDirectory = resolve(root, 'docs/evidence/baseline/2026-07-18');

const secretSafePatterns = Object.freeze([
  /\b(?:VITE_)?[A-Z][A-Z0-9_]+(?=\s*=)/g,
]);

async function readOptional(path) {
  try {
    return await readFile(resolve(root, path), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return '';
    throw error;
  }
}

function command(...args) {
  try {
    const invocation = commandInvocation(args[0], args.slice(1));
    return execFileSync(invocation.executable, invocation.args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unavailable';
  }
}

function environmentNames(source) {
  const names = new Set();
  for (const pattern of secretSafePatterns) {
    for (const match of source.matchAll(pattern)) names.add(match[0].replace(/^VITE_/, 'VITE_'));
  }
  return [...names].sort();
}

function routeInventory(source) {
  const routes = new Set();
  for (const match of source.matchAll(/^\s*['"](\/[^'"]*)['"]\s*:/gm)) routes.add(match[1]);
  return [...routes].sort();
}

async function migrationInventory() {
  const directory = resolve(root, 'supabase/migrations');
  return (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
}

async function buildInventory() {
  const assetsDirectory = resolve(root, 'dist/assets');
  const entries = [];
  try {
    for (const name of await readdir(assetsDirectory)) {
      const path = resolve(assetsDirectory, name);
      const details = await stat(path);
      if (!details.isFile()) continue;
      const bytes = await readFile(path);
      entries.push({
        path: relative(root, path).replaceAll('\\', '/'),
        bytes: bytes.byteLength,
        gzipBytes: gzipSync(bytes).byteLength,
      });
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

const [mainSource, packageSource, envSource, netlifyEnvSource] = await Promise.all([
  readOptional('src/main.js'),
  readOptional('package.json'),
  readOptional('.env.example'),
  readOptional('.env.netlify.example'),
]);
const packageJson = JSON.parse(packageSource);

const inventory = {
  capturedAt: new Date().toISOString(),
  purpose: 'secret-safe pre-rebuild inventory',
  git: {
    branch: command('git', 'branch', '--show-current'),
    commit: command('git', 'rev-parse', 'HEAD'),
  },
  runtime: {
    node: process.version,
    packageManager: command('npm', '--version'),
  },
  routes: routeInventory(mainSource),
  migrations: await migrationInventory(),
  build: await buildInventory(),
  scripts: Object.keys(packageJson.scripts || {}).sort(),
  dependencies: Object.keys(packageJson.dependencies || {}).sort(),
  devDependencies: Object.keys(packageJson.devDependencies || {}).sort(),
  environmentNames: environmentNames(`${envSource}\n${netlifyEnvSource}`),
  remoteVerification: {
    netlifyPreview: 'not verified',
    supabaseRemote: 'not verified',
    stripeTestCatalog: 'not verified',
    stripeLiveMode: 'not authorized',
  },
};

await mkdir(evidenceDirectory, { recursive: true });
const outputPath = resolve(evidenceDirectory, 'inventory.json');
await writeFile(outputPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ output: relative(root, outputPath).replaceAll('\\', '/'), ...inventory }, null, 2)}\n`);

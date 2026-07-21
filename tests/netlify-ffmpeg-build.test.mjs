import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

const optimizer = resolve('scripts/optimize-showcase-videos.mjs');
const showcaseFiles = [
  'verdant-normal.mp4',
  'verdant-cinematic.mp4',
  'northframe-normal.mp4',
  'northframe-cinematic.mp4',
  'olympus-normal.mp4',
  'olympus-cinematic.mp4',
];

async function makeFixture({ missing, bytes = 64 } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'accessrevamp-ffmpeg-'));
  const media = join(root, 'dist', 'media', 'showcases');
  await mkdir(media, { recursive: true });
  await Promise.all(showcaseFiles
    .filter((filename) => filename !== missing)
    .map((filename) => writeFile(join(media, filename), Buffer.alloc(bytes, filename.length))));
  return root;
}

function runOptimizer(root, { requireOptimization = false, maximumBytes = 0 } = {}) {
  return spawnSync(process.execPath, [optimizer], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      CI: 'true',
      FFMPEG_PATH: join(root, 'definitely-not-installed', 'ffmpeg'),
      REQUIRE_FFMPEG_OPTIMIZATION: requireOptimization ? 'true' : 'false',
      MAX_SHOWCASE_VIDEO_BYTES: maximumBytes ? String(maximumBytes) : '',
    },
  });
}

test('Netlify preserves verified scrub-ready clips when system FFmpeg is unavailable', async () => {
  const root = await makeFixture();
  try {
    const result = runOptimizer(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /checked-in scrub-ready showcase videos/i);
    const manifest = JSON.parse(await readFile(join(root, 'dist', 'showcase-optimization.json'), 'utf8'));
    assert.equal(manifest.status, 'ffmpeg-unavailable');
    assert.equal(manifest.optimizationRequired, false);
    assert.equal(manifest.files.length, showcaseFiles.length);
    assert.ok(manifest.files.every((file) => file.status === 'preserved'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('strict FFmpeg-equipped builds still fail closed when the executable is missing', async () => {
  const root = await makeFixture();
  try {
    const result = runOptimizer(root, { requireOptimization: true });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /ffmpeg is unavailable/i);
    const manifest = JSON.parse(await readFile(join(root, 'dist', 'showcase-optimization.json'), 'utf8'));
    assert.equal(manifest.optimizationRequired, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('missing showcase media fails even when re-encoding is optional', async () => {
  const root = await makeFixture({ missing: 'olympus-cinematic.mp4' });
  try {
    const result = runOptimizer(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Missing required showcase video/i);
    const manifest = JSON.parse(await readFile(join(root, 'dist', 'showcase-optimization.json'), 'utf8'));
    assert.equal(manifest.status, 'missing-media');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Netlify fails before upload when a checked-in clip exceeds the configured limit', async () => {
  const root = await makeFixture({ bytes: 256 });
  try {
    const result = runOptimizer(root, { maximumBytes: 128 });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Checked-in showcase video exceeds the deploy limit/i);
    const manifest = JSON.parse(await readFile(join(root, 'dist', 'showcase-optimization.json'), 'utf8'));
    assert.equal(manifest.status, 'oversized-media');
    assert.ok(manifest.files.every((file) => file.status === 'oversized'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Netlify deploys pre-optimized sources while controlled workflows retain strict FFmpeg builds', async () => {
  const [netlify, sourceOptimizer, sourceWorkflow, optimizeScript, production, pages, isolated] = await Promise.all([
    readFile('netlify.toml', 'utf8'),
    readFile('scripts/optimize-source-showcase-videos.mjs', 'utf8'),
    readFile('.github/workflows/optimize-source-showcases.yml', 'utf8'),
    readFile('scripts/optimize-showcase-videos.mjs', 'utf8'),
    readFile('.github/workflows/production-ci.yml', 'utf8'),
    readFile('.github/workflows/deploy-pages.yml', 'utf8'),
    readFile('.github/workflows/isolated-stress.yml', 'utf8'),
  ]);
  assert.match(netlify, /command = "npm run build"/);
  assert.match(netlify, /REQUIRE_FFMPEG_OPTIMIZATION = "false"/);
  assert.match(netlify, /MAX_SHOWCASE_VIDEO_BYTES = "9500000"/);
  assert.match(sourceOptimizer, /ENCODER_VERSION = 'accessrevamp-scrub-v5'/);
  assert.match(sourceOptimizer, /MAXIMUM_BYTES = 9_500_000/);
  assert.match(sourceOptimizer, /optimizedSha256/);
  assert.match(sourceOptimizer, /'-g', '2'/);
  assert.match(sourceOptimizer, /'-bf', '0'/);
  assert.match(sourceWorkflow, /contents: write/);
  assert.match(sourceWorkflow, /github-actions\[bot\]/);
  assert.match(optimizeScript, /MAX_SHOWCASE_VIDEO_BYTES/);
  assert.match(optimizeScript, /oversized-media/);
  assert.match(production, /REQUIRE_FFMPEG_OPTIMIZATION: "true"/);
  for (const workflow of [pages, isolated]) {
    assert.match(workflow, /REQUIRE_FFMPEG_OPTIMIZATION: "true"/);
  }
});

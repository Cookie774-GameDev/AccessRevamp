import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

const script = resolve('scripts/optimize-showcase-videos.mjs');
const showcaseFiles = [
  'verdant-normal.mp4',
  'verdant-cinematic.mp4',
  'northframe-normal.mp4',
  'northframe-cinematic.mp4',
  'olympus-normal.mp4',
  'olympus-cinematic.mp4',
];

async function makeFixture({ missing } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'accessrevamp-ffmpeg-'));
  const media = join(root, 'dist', 'media', 'showcases');
  await mkdir(media, { recursive: true });
  await Promise.all(showcaseFiles
    .filter((filename) => filename !== missing)
    .map((filename) => writeFile(join(media, filename), `checked-in-${filename}`)));
  return root;
}

function runOptimizer(root, requireOptimization) {
  return spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      CI: 'true',
      FFMPEG_PATH: join(root, 'definitely-not-installed', 'ffmpeg'),
      REQUIRE_FFMPEG_OPTIMIZATION: requireOptimization ? 'true' : 'false',
    },
  });
}

test('Netlify-style CI builds preserve verified videos when FFmpeg is unavailable', async () => {
  const root = await makeFixture();
  try {
    const result = runOptimizer(root, false);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /using the checked-in showcase videos/i);
    const manifest = JSON.parse(await readFile(join(root, 'dist', 'showcase-optimization.json'), 'utf8'));
    assert.equal(manifest.status, 'ffmpeg-unavailable');
    assert.equal(manifest.optimizationRequired, false);
    assert.equal(manifest.files.length, showcaseFiles.length);
    assert.ok(manifest.files.every((file) => file.status === 'preserved'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CI can explicitly require FFmpeg optimization', async () => {
  const root = await makeFixture();
  try {
    const result = runOptimizer(root, true);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /ffmpeg is unavailable/i);
    const manifest = JSON.parse(await readFile(join(root, 'dist', 'showcase-optimization.json'), 'utf8'));
    assert.equal(manifest.optimizationRequired, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('missing showcase media fails even when optimization is optional', async () => {
  const root = await makeFixture({ missing: 'olympus-cinematic.mp4' });
  try {
    const result = runOptimizer(root, false);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Missing required showcase video/i);
    const manifest = JSON.parse(await readFile(join(root, 'dist', 'showcase-optimization.json'), 'utf8'));
    assert.equal(manifest.status, 'missing-media');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Netlify is optional while FFmpeg-equipped GitHub builds remain strict', async () => {
  const [netlify, production, pages, isolated] = await Promise.all([
    readFile('netlify.toml', 'utf8'),
    readFile('.github/workflows/production-ci.yml', 'utf8'),
    readFile('.github/workflows/deploy-pages.yml', 'utf8'),
    readFile('.github/workflows/isolated-stress.yml', 'utf8'),
  ]);
  assert.match(netlify, /REQUIRE_FFMPEG_OPTIMIZATION = "false"/);
  for (const workflow of [production, pages, isolated]) {
    assert.match(workflow, /REQUIRE_FFMPEG_OPTIMIZATION: "true"/);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('homepage includes the supplied example gallery and all paired media', async () => {
  const [home, media] = await Promise.all([
    read('src/pages/home.js'),
    read('src/data/showcase-media.js'),
  ]);
  assert.match(home, />Example Websites</);
  assert.match(home, /Normal Websites vs\. Cinematic Scroll Experiences/);
  assert.match(home, /data-showcase-chapter/);
  assert.match(home, /data-customer-count/);
  assert.match(media, /local-brew-house\.webp/);
  assert.match(media, /blueline-plumbing\.webp/);
  assert.match(media, /spread-the-fire\.webp/);
  assert.match(media, /verdant-edge\.webp/);
  for (const name of ['verdant-normal', 'verdant-cinematic', 'northframe-normal', 'northframe-cinematic', 'olympus-normal', 'olympus-cinematic']) {
    assert.match(media, new RegExp(`${name}\\.mp4`));
    assert.match(media, new RegExp(`${name}-poster\\.webp`));
  }
});

test('showcase controller renders presented frames smoothly while limiting active decoders', async () => {
  const source = await read('src/services/showcase-comparison.js');
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /requestVideoFrameCallback/);
  assert.match(source, /cancelVideoFrameCallback/);
  assert.match(source, /loadedmetadata/);
  assert.match(source, /loadeddata/);
  assert.match(source, /setPointerCapture/);
  assert.match(source, /lostpointercapture/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /currentTime/);
  assert.match(source, /video\.src\s*=\s*originalSrc/);
  assert.match(source, /SCROLL_SMOOTHING_MS\s*=\s*360/);
  assert.match(source, /MAX_PROGRESS_PER_SECOND\s*=\s*0\.24/);
  assert.match(source, /FRAME_SETTLE_TIMEOUT_MS\s*=\s*90/);
  assert.match(source, /DESKTOP_SCROLL_DISTANCE_VH\s*=\s*520/);
  assert.match(source, /MOBILE_SCROLL_DISTANCE_VH\s*=\s*560/);
  assert.match(source, /data\.showcaseActive|dataset\.showcaseActive/);
  assert.match(source, /prepareChapter\(chapter, 'metadata'\)|preload\s*=\s*effectivePriority/);
  assert.match(source, /removeAttribute\('src'\)/);
  assert.match(source, /Math\.exp/);
  assert.doesNotMatch(source, /response\.blob\(\)/);
});

test('homepage order wizard persists progress and hands the selected tier to checkout', async () => {
  const [component, service] = await Promise.all([
    read('src/components/order-wizard.js'),
    read('src/services/order-wizard.js'),
  ]);
  assert.match(component, /data-order-wizard/);
  assert.match(component, /Full name/);
  assert.match(component, /Current website URL/);
  assert.match(component, /Reference files/);
  assert.match(component, /Review and payment/);
  assert.match(service, /localStorage/);
  assert.match(service, /data-checkout/);
  assert.match(service, /reportValidity/);
});

test('production packaging requires ffmpeg and emits scrub-ready showcase videos', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
  const [pruneScript, optimizeScript, ciWorkflow, pagesWorkflow] = await Promise.all([
    readFile('scripts/prune-vinext-server-media.mjs', 'utf8'),
    readFile('scripts/optimize-showcase-videos.mjs', 'utf8'),
    readFile('.github/workflows/production-ci.yml', 'utf8'),
    readFile('.github/workflows/deploy-pages.yml', 'utf8'),
  ]);

  assert.match(packageJson.scripts.build, /prune-vinext-server-media\.mjs/);
  assert.match(packageJson.scripts.build, /optimize-showcase-videos\.mjs/);
  assert.match(pruneScript, /dist.*server.*media/s);
  assert.match(pruneScript, /recursive:\s*true/);
  assert.match(optimizeScript, /process\.env\.CI\s*===\s*'true'/);
  assert.match(optimizeScript, /showcase-optimization\.json/);
  assert.match(optimizeScript, /fps=24/);
  assert.match(optimizeScript, /'-g', '3'/);
  assert.match(optimizeScript, /'-bf', '0'/);
  assert.match(optimizeScript, /fastdecode/);
  assert.match(optimizeScript, /\+faststart/);
  assert.match(ciWorkflow, /Install FFmpeg for scrub-ready media/);
  assert.match(pagesWorkflow, /Install FFmpeg for scrub-ready media/);
});

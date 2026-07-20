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

test('showcase controller streams and smoothly synchronizes both videos across a longer scroll distance', async () => {
  const source = await read('src/services/showcase-comparison.js');
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /loadedmetadata/);
  assert.match(source, /loadeddata/);
  assert.match(source, /setPointerCapture/);
  assert.match(source, /lostpointercapture/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /currentTime/);
  assert.match(source, /video\.src\s*=\s*originalSrc/);
  assert.match(source, /SCROLL_SMOOTHING_MS\s*=\s*180/);
  assert.match(source, /MAX_PROGRESS_PER_SECOND\s*=\s*0\.9/);
  assert.match(source, /DESKTOP_SCROLL_DISTANCE_VH\s*=\s*520/);
  assert.match(source, /MOBILE_SCROLL_DISTANCE_VH\s*=\s*560/);
  assert.match(source, /Math\.exp/);
  assert.match(source, /seeked/);
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

test('production packaging keeps showcase video outside the Sites worker bundle', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
  const pruneScript = await readFile('scripts/prune-vinext-server-media.mjs', 'utf8');

  assert.match(packageJson.scripts.build, /prune-vinext-server-media\.mjs/);
  assert.match(pruneScript, /dist.*server.*media/s);
  assert.match(pruneScript, /recursive:\s*true/);
});

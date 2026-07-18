import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { page as greenline } from '../src/demos/greenline/page.js';
import { page as firejar } from '../src/demos/firejar/page.js';
import { page as clearflow } from '../src/demos/clearflow/page.js';

test('home renders an image-led hero and all expandable lenses', async () => {
  const source = await readFile(new URL('../src/pages/home.js', import.meta.url), 'utf8');
  assert.match(source, /class="hero-visual-stack"/);
  assert.match(source, /data-lens-grid/);
  assert.match(source, /class="lens-tile/);
  assert.match(source, /aria-expanded="false"/);
  assert.match(source, />Before</);
  assert.match(source, />Evidence</);
  assert.match(source, />After</);
});

test('portfolio and every fictional demo include meaningful local imagery', async () => {
  const portfolio = await readFile(new URL('../src/pages/work.js', import.meta.url), 'utf8');
  assert.match(portfolio, /demo-card__image/);
  for (const html of [greenline(), firejar(), clearflow()]) {
    assert.match(html, /<picture/);
    assert.match(html, /loading="lazy"/);
    assert.match(html, /Original working demo — not a client engagement\./);
  }
});

test('homepage lifecycle binds and cleans the dedicated experience module', async () => {
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /import \{ setupHomeExperience \} from '\.\/pages\/home-interactions\.js';/);
  assert.match(main, /pathname === '\/'\) cleanups\.push\(setupHomeExperience\(app\)\)/);
});

test('generated imagery ships only optimized web formats', async () => {
  const files = await readdir(new URL('../public/assets/generated/', import.meta.url));
  assert.equal(files.some((file) => file.endsWith('.png')), false);

  const helper = await readFile(new URL('../src/data/visual-assets.js', import.meta.url), 'utf8');
  const cinematic = await readFile(new URL('../src/pages/cinematic.js', import.meta.url), 'utf8');
  assert.doesNotMatch(helper, /assetRecord\.png/);
  assert.doesNotMatch(cinematic, /generated\/\$\{image\}\.png/);
});

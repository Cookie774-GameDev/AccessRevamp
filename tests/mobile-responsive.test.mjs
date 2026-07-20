import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('the mobile stylesheet is loaded last and cannot change desktop layouts', async () => {
  const [main, mobile] = await Promise.all([
    read('src/main.js'),
    read('src/styles/mobile.css'),
  ]);

  const styleImports = [...main.matchAll(/import ['"](\.\/styles\/[^'"]+\.css)['"];?/g)].map((match) => match[1]);
  assert.equal(styleImports.at(-1), './styles/mobile.css');
  assert.match(mobile, /@media \(max-width: 1000px\)/);
  assert.match(mobile, /@media \(max-width: 760px\)/);
  assert.match(mobile, /@media \(max-width: 420px\)/);
  const withoutComments = mobile.replace(/\/\*[\s\S]*?\*\//g, '').trimStart();
  assert.ok(withoutComments.startsWith('@media'), 'mobile overrides must begin inside a media query');
});

test('mobile layouts protect every major public and customer surface', async () => {
  const mobile = await read('src/styles/mobile.css');

  for (const pattern of [
    /\.site-header \.mobile-nav/,
    /\.page-hero__split/,
    /\.service-row/,
    /\.pricing-page \.pricing-grid/,
    /\.work-card__meta/,
    /\.dashboard-head/,
    /\.contact-form/,
    /\.project-intake-form/,
    /\.order-wizard__panel/,
    /\.order-file-list li/,
    /\.showcase-pair/,
    /\.cinematic-beats article/,
    /\.footer-links/,
  ]) assert.match(mobile, pattern);

  assert.match(mobile, /font-size:\s*16px/);
  assert.match(mobile, /overflow-wrap:\s*anywhere/);
  assert.match(mobile, /body::before\s*\{\s*display:\s*none/);
  assert.match(mobile, /min-height:\s*0;\s*padding:\s*1\.25rem/);
  assert.match(mobile, /orientation:\s*landscape/);
  assert.match(mobile, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(mobile, /env\(safe-area-inset-bottom\)/);
});

test('mobile navigation closes safely and restores ordinary page scrolling', async () => {
  const main = await read('src/main.js');

  assert.match(main, /matchMedia\?\.\('\(max-width: 1000px\)'\)/);
  assert.match(main, /mobile-menu-open/);
  assert.match(main, /event\.key !== 'Escape'/);
  assert.match(main, /event\.target\.closest\('a'\)/);
  assert.match(main, /event\.target\.closest\('\.site-header'\)/);
  assert.match(main, /menu\.toggleAttribute\('inert', !open\)/);
  assert.match(main, /focus\(\{ preventScroll: true \}\)/);
  assert.match(main, /removeEventListener\('pointerdown'/);
  assert.match(main, /setOpen\(false\);/);
});

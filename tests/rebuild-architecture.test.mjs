import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(path, 'utf8');

test('the application has one module entry and no mutation-driven page patches', async () => {
  const [index, main, offerDetails, legacyPortfolio, cinematic] = await Promise.all([
    read('index.html'),
    read('src/main.js'),
    read('src/offer-details.js').catch(() => ''),
    read('src/portfolio.js').catch(() => ''),
    read('src/cinematic-scroll.js'),
  ]);

  assert.equal((index.match(/<script[^>]+type="module"/g) || []).length, 1);
  assert.match(index, /src="\/src\/main\.js"/);
  assert.match(main, /createRouter/);
  assert.doesNotMatch(`${main}\n${offerDetails}\n${legacyPortfolio}\n${cinematic}`, /MutationObserver/);
});

test('routing supports direct work details, browser history, and cleanup', async () => {
  const [router, metadata, lifecycle] = await Promise.all([
    read('src/app/router.js'),
    read('src/app/metadata.js'),
    read('src/app/lifecycle.js'),
  ]);

  assert.match(router, /popstate/);
  assert.match(router, /\/work\/:slug/);
  assert.match(router, /history\.pushState/);
  assert.match(router, /destroy/);
  assert.match(lifecycle, /cleanup/);
  assert.match(metadata, /'\/work'/);
  assert.match(metadata, /'\/services'/);
  assert.match(metadata, /'\/process'/);
  assert.match(metadata, /'\/cinematic-scroll'/);
});


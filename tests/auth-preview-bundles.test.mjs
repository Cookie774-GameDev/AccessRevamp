import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractJavaScriptBundleUrls,
  fetchJavaScriptBundleGraph,
} from '../scripts/quality/auth-preview-bundles.mjs';

test('production auth verifier discovers Vinext and conventional JavaScript bundles', () => {
  const html = `
    <link rel="modulepreload" href="/assets/accessrevamp-client-A1.js" crossorigin>
    <script src="/assets/legacy-B2.js"></script>
    <script>import("/assets/index-C3.js")</script>
    <link rel="modulepreload" href="/assets/accessrevamp-client-A1.js">
  `;

  assert.deepEqual(
    extractJavaScriptBundleUrls(html, 'https://accessrevamp.com/signup'),
    [
      'https://accessrevamp.com/assets/legacy-B2.js',
      'https://accessrevamp.com/assets/accessrevamp-client-A1.js',
      'https://accessrevamp.com/assets/index-C3.js',
    ],
  );
});

test('production auth verifier follows bounded dynamic bundle imports', async () => {
  const sources = new Map([
    ['https://accessrevamp.com/assets/entry.js', 'import(`./main.js`)'],
    ['https://accessrevamp.com/assets/main.js', 'const marker = "accessrevamp.auth.recovery.v1";'],
  ]);

  const text = await fetchJavaScriptBundleGraph(
    ['https://accessrevamp.com/assets/entry.js'],
    async (url) => {
      assert.equal(sources.has(url), true);
      return sources.get(url);
    },
  );

  assert.match(text, /accessrevamp\.auth\.recovery\.v1/);
});

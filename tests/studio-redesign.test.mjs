import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('studio redesign centralizes the production scale and section rhythm', async () => {
  const tokens = await read('src/styles/tokens.css');
  for (const token of ['--content-max:', '--page-gutter:', '--section-space:', '--ease-editorial:', '--layer-nav:']) {
    assert.match(tokens, new RegExp(token.replaceAll('-', '\\-')));
  }
});

test('homepage uses the Atlas reveal and keeps disclosure in project metadata', async () => {
  const home = await read('src/pages/home.js');
  assert.match(home, /data-reveal-hero/);
  assert.match(home, /data-reveal-gold/);
  assert.match(home, /data-reveal-cursor/);
  assert.match(home, /Original working demo — not a client engagement\./);
  assert.doesNotMatch(home, /Original fictional brand image|sample business/i);
});

test('eleven lenses use structured data and unique code-native visuals', async () => {
  const dataFiles = await readdir('src/data');
  const componentFiles = await readdir('src/components');
  assert.ok(dataFiles.includes('lenses.js'), 'src/data/lenses.js must exist');
  assert.ok(componentFiles.includes('lens-visuals.js'), 'src/components/lens-visuals.js must exist');
  const lenses = await read('src/data/lenses.js');
  const visualKeys = [...lenses.matchAll(/visual:\s*'([^']+)'/g)].map((match) => match[1]);
  assert.equal(visualKeys.length, 11);
  assert.equal(new Set(visualKeys).size, 11);
});

test('customer browser services use same-origin Sites API routes', async () => {
  const serviceFiles = ['contact.js', 'free-snapshot.js', 'checkout.js', 'account-projects.js', 'pricing-context.js'];
  const source = (await Promise.all(serviceFiles.map((file) => read(`src/services/${file}`)))).join('\n');
  assert.doesNotMatch(source, /\.netlify\/functions/);
  for (const endpoint of ['/api/contact', '/api/free-snapshot', '/api/create-checkout', '/api/account-projects', '/api/pricing-context']) {
    assert.match(source, new RegExp(endpoint.replaceAll('/', '\\/')));
  }
});

test('contact exposes a real free snapshot preselection helper', async () => {
  const source = await read('src/pages/contact.js');
  assert.match(source, /export function readContactInterest/);
  assert.match(source, /free_snapshot/);
  assert.match(source, /name="interest"/);
});

test('portfolio artwork removes watermark copy while metadata keeps the exact disclosure', async () => {
  const demoFiles = ['greenline/page.js', 'firejar/page.js', 'clearflow/page.js'];
  const artwork = (await Promise.all(demoFiles.map((file) => read(`src/demos/${file}`)))).join('\n');
  assert.doesNotMatch(artwork, /Original fictional brand imagery|Original fictional brand image|sample business/i);
  const shell = await read('src/demos/shared/demo-shell.js');
  assert.match(shell, /Original working demo — not a client engagement\./);
});

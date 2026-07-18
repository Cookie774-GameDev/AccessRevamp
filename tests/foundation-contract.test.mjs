import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const REQUIRED_DESIGN_TOKENS = Object.freeze([
  '#0B1020',
  '#05070C',
  '#F6F1E8',
  '#FF5A3D',
  '#A7F3D0',
  '#F7D154',
  '#6B7280',
]);

const REQUIRED_DEEP_DOCS = Object.freeze([
  'PRODUCT',
  'ARCHITECTURE',
  'DESIGN',
  'PAYMENTS',
  'DATA_MODEL',
  'SECURITY',
  'OUTREACH',
  'QUALITY',
  'DEPLOYMENT',
  'THIRD_PARTY',
]);

test('required execution and design contracts exist', async () => {
  for (const path of [
    'AGENTS.md',
    'design.md',
    'docs/adr/0001-retain-vite-netlify-supabase-stripe.md',
  ]) {
    const source = await readFile(path, 'utf8');
    assert.ok(source.length > 500, `${path} must be substantive`);
  }

  const design = await readFile('design.md', 'utf8');
  for (const token of REQUIRED_DESIGN_TOKENS) {
    assert.match(design, new RegExp(token, 'i'));
  }
});

test('the baseline command is secret-safe and browser-complete', async () => {
  const [packageSource, inventoryScript, browserScript] = await Promise.all([
    readFile('package.json', 'utf8'),
    readFile('scripts/capture-baseline.mjs', 'utf8'),
    readFile('scripts/capture-baseline-browser.mjs', 'utf8'),
  ]);

  assert.match(packageSource, /"baseline"\s*:/);
  for (const width of ['375', '768', '1024', '1440']) {
    assert.match(browserScript, new RegExp(`\\b${width}\\b`));
  }
  assert.match(browserScript, /axe/i);
  assert.match(browserScript, /lighthouse/i);
  assert.match(inventoryScript, /redact|secret-safe|safeValue/i);
  assert.doesNotMatch(`${inventoryScript}\n${browserScript}`, /console\.log\([^)]*process\.env/i);
});

test('deep operating documents use truthful implementation status markers', async () => {
  for (const name of REQUIRED_DEEP_DOCS) {
    const source = await readFile(`docs/${name}.md`, 'utf8');
    assert.ok(source.length > 600, `docs/${name}.md must be substantive`);
    assert.match(source, /Status:/);
    for (const marker of ['IMPLEMENTED', 'PLANNED', 'EXTERNALLY BLOCKED', 'LAUNCH-ONLY']) {
      assert.match(source, new RegExp(`\\b${marker}\\b`), `docs/${name}.md must define ${marker}`);
    }
    assert.match(source, /superpowers\/specs\/2026-07-18-accessrevamp-production-rebuild-design\.md/);
    assert.match(source, /superpowers\/plans\//);
    assert.doesNotMatch(source, /(production deployed|live payment verified|fully compliant)/i);
  }
});

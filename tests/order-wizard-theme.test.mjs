import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('the five-step order wizard loads a light high-contrast theme before the final mobile layer', async () => {
  const [main, css, component] = await Promise.all([
    read('src/main.js'),
    read('src/styles/order-wizard-light.css'),
    read('src/components/order-wizard.js'),
  ]);

  const styleImports = [...main.matchAll(/^import '([^']+\.css)';$/gm)].map((match) => match[1]);
  assert.equal(styleImports.at(-1), './styles/mobile.css');
  assert.equal(styleImports.at(-2), './styles/order-wizard-light.css');

  assert.match(component, /data-order-panel="0"/);
  assert.match(component, /data-order-panel="1"/);
  assert.match(component, /data-order-panel="2"/);
  assert.match(component, /data-order-panel="3"/);
  assert.match(component, /data-order-panel="4"/);

  assert.match(css, /\.renaissance-home \.order-flow-section\s*\{/);
  assert.match(css, /background:\s*linear-gradient\(180deg,\s*#f4eadc/);
  assert.match(css, /\.renaissance-home \.order-wizard\s*\{/);
  assert.match(css, /background:\s*var\(--order-paper\)/);
  assert.match(css, /\.renaissance-home \.order-wizard__panel\s*\{/);
  assert.match(css, /\.renaissance-home \.order-fields :is\(input, textarea, select\)/);
  assert.match(css, /background:\s*#fff;/);
  assert.match(css, /color:\s*var\(--order-ink\)/);
  assert.match(css, /\.renaissance-home \.order-plan:has\(input:checked\)/);
  assert.match(css, /\.renaissance-home \.order-summary\s*\{/);
  assert.match(css, /\.renaissance-home \.order-payment\s*\{/);
  assert.match(css, /\.renaissance-home \.order-wizard__actions\s*\{/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

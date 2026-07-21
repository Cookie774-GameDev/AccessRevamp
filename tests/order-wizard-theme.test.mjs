import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('the five-step order wizard keeps its black UI with explicit high-contrast text', async () => {
  const [main, css, layout, component, service] = await Promise.all([
    read('src/main.js'),
    read('src/styles/order-wizard-dark-contrast.css'),
    read('src/styles/cinematic-renaissance.css'),
    read('src/components/order-wizard.js'),
    read('src/services/order-wizard.js'),
  ]);

  const styleImports = [...main.matchAll(/^import '([^']+\.css)';$/gm)].map((match) => match[1]);
  assert.equal(styleImports.at(-1), './styles/mobile.css');
  assert.equal(styleImports.at(-2), './styles/order-wizard-dark-contrast.css');
  assert.doesNotMatch(main, /order-wizard-light\.css/);

  assert.match(component, /data-order-panel="0"/);
  assert.match(component, /data-order-panel="1"/);
  assert.match(component, /data-order-panel="2"/);
  assert.match(component, /data-order-panel="3"/);
  assert.match(component, /data-order-panel="4"/);
  assert.match(component, /plan\.features\.map\(\(feature\) =>/);
  assert.match(component, /class="order-plan__perks"/);
  assert.match(component, /class="order-plan__perk"/);
  assert.match(component, /icon\('check', 'order-plan__perk-icon'\)/);
  assert.match(component, /class="order-summary order-question-plan order-fields__wide"/);
  assert.match(component, /data-order-question-plan/);
  assert.match(service, /const questionPlan = form\.querySelector\('\[data-order-question-plan\]'\)/);
  assert.match(service, /const renderQuestionPlan = \(\) =>/);
  assert.match(service, /questionPlan\.innerHTML = .*Every included perk/);
  assert.match(service, /if \(current === 2\) renderQuestionPlan\(\)/);

  assert.match(css, /--order-dark:\s*#101114/);
  assert.match(css, /--order-panel:\s*#17181b/);
  assert.match(css, /--order-text:\s*#fffdf8/);
  assert.match(css, /\.renaissance-home \.order-flow-section\s*\{/);
  assert.match(css, /background:\s*var\(--order-dark\)/);
  assert.match(css, /\.renaissance-home \.order-wizard\s*\{/);
  assert.match(css, /background:\s*var\(--order-panel\)/);
  assert.match(css, /\.renaissance-home \.order-wizard__heading h3\s*\{/);
  assert.match(css, /color:\s*#fff/);
  assert.match(css, /\.renaissance-home \.order-plan b\s*\{/);
  assert.match(css, /\.renaissance-home \.order-plan strong\s*\{/);
  assert.match(css, /\.renaissance-home \.order-plan small\s*\{/);
  assert.match(css, /\.renaissance-home \.order-plan__perks\s*\{/);
  assert.match(css, /\.renaissance-home \.order-plan__perk\s*\{/);
  assert.match(css, /\.renaissance-home \.order-plan__perk-icon\s*\{/);
  assert.match(css, /\.renaissance-home \.order-plan input:checked \+ span/);
  assert.match(css, /\.renaissance-home \.order-fields :is\(input, textarea, select\)/);
  assert.match(css, /background:\s*#fbf5ea/);
  assert.match(css, /\.renaissance-home \.order-summary\s*\{/);
  assert.match(css, /\.renaissance-home \.order-payment\s*\{/);
  assert.match(css, /\.renaissance-home \.order-wizard__actions\s*\{/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(layout, /\.order-summary\{display:grid;grid-template-columns:1fr 1fr;gap:2rem\}/);
  assert.match(layout, /@media\(max-width:1000px\)[\s\S]*?\.order-summary\{grid-template-columns:1fr\}/);
});

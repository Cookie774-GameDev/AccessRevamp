import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');

test('dark button hover surfaces always receive light text while light ghost hovers stay dark', async () => {
  const [components, renaissance] = await Promise.all([
    read('src/styles/components.css'),
    read('src/styles/cinematic-renaissance.css'),
  ]);

  assert.match(components, /\.button:hover\s*\{[^}]*background:\s*var\(--near-black\);[^}]*color:\s*var\(--white\)/s);
  assert.match(components, /\.button--ghost:hover\s*\{[^}]*background:\s*var\(--surface\);[^}]*color:\s*var\(--ink\)/s);
  assert.match(renaissance, /\.renaissance-home \.button:hover\s*\{[^}]*background:var\(--ar-charcoal\);[^}]*color:#fff/s);
});

test('selected complete and cinematic plans have distinct premium moving borders with accessible fallbacks', async () => {
  const css = await read('src/styles/order-wizard-dark-contrast.css');

  assert.match(css, /@property --order-plan-angle/);
  assert.match(css, /@keyframes order-plan-border-orbit/);
  assert.match(css, /\.order-plan input:checked \+ span\s*\{[^}]*border-color:\s*var\(--order-gold-soft\)/s);
  assert.match(css, /\.order-plan:is\(\[data-order-plan="complete_revamp"\],\s*\[data-order-plan="cinematic_scroll"\]\) input:checked \+ span/);
  assert.match(css, /data-order-plan="complete_revamp"[\s\S]*input:checked \+ span[\s\S]*linear-gradient\([^;]*#f0d18c/s);
  assert.match(css, /data-order-plan="cinematic_scroll"[\s\S]*input:checked \+ span[\s\S]*#d87575/s);
  assert.match(css, /animation:\s*order-plan-border-orbit/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.order-plan input:checked \+ span[\s\S]*animation:\s*none/s);
  assert.match(css, /@media \(forced-colors: active\)[\s\S]*\.order-plan input:checked \+ span[\s\S]*outline:/s);
});

test('hero reveal uses current geometry and does not capture touch scrolling or reveal navigation under the pointer', async () => {
  const source = await read('src/pages/home-interactions.js');

  assert.doesNotMatch(source, /let heroRect/);
  assert.match(source, /const rect = hero\.getBoundingClientRect\(\)/);
  assert.doesNotMatch(source, /event\.clientY\s*<=\s*104/);
  assert.doesNotMatch(source, /event\.pointerType !== 'touch' && event\.pointerType !== 'pen'/);
  assert.match(source, /if \(event\.pointerType !== 'pen'\) return/);
  assert.match(source, /const handleHomeScroll = \(\) => \{[\s\S]*scheduleNavVisibility\(\);[\s\S]*startHeroLoop\(\);[\s\S]*\}/);
  assert.match(source, /listen\(globalThis, 'scroll', handleHomeScroll/);
});

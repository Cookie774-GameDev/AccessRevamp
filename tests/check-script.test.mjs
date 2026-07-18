import assert from 'node:assert/strict';
import test from 'node:test';

import { isPolicyScannable } from '../scripts/lib/scannable-file.mjs';

test('static policy checks scan text artifacts and skip binary evidence', () => {
  for (const path of ['src/main.js', 'docs/QUALITY.md', 'supabase/migration.sql', '.env.example']) {
    assert.equal(isPolicyScannable(path), true, `${path} should be scanned`);
  }
  for (const path of ['docs/evidence/home.png', 'public/hero.webp', 'report.pdf', 'font.woff2']) {
    assert.equal(isPolicyScannable(path), false, `${path} should be skipped`);
  }
});

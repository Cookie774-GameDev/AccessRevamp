import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

test('the seven-page commercial boundary is consistent across product, intake, policy, and database', async () => {
  const migrations = await readdir('supabase/migrations');
  const migrationName = migrations.find((name) => name.endsWith('_expand_project_intake_to_seven_pages.sql'));
  assert.ok(migrationName, 'a forward-only seven-page intake migration must exist');

  const [catalog, product, pricing, intakePage, intakeService, validation, legal, migration] = await Promise.all([
    readFile('src/config/tier-catalog.js', 'utf8'),
    readFile('docs/PRODUCT.md', 'utf8'),
    readFile('src/pages/pricing.js', 'utf8'),
    readFile('src/pages/project-intake.js', 'utf8'),
    readFile('src/services/project-intake.js', 'utf8'),
    readFile('netlify/functions/_shared/validation.mjs', 'utf8'),
    readFile('src/pages/legal.js', 'utf8'),
    readFile(`supabase/migrations/${migrationName}`, 'utf8'),
  ]);

  for (const source of [catalog, product, pricing, intakePage, intakeService]) {
    assert.match(source, /seven/i);
    assert.doesNotMatch(source, /up to five|one and five/i);
  }
  assert.match(validation, /pages:[\s\S]*\.max\(7\)/);
  assert.match(legal, /up to seven agreed individual pages/i);
  assert.match(legal, /up to seven selected page requests/i);
  assert.match(migration, /drop constraint if exists project_intakes_selected_pages_check/i);
  assert.match(migration, /cardinality\s*\(\s*selected_pages\s*\)\s+between\s+1\s+and\s+7/i);
});

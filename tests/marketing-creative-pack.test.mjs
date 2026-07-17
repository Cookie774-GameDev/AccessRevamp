import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [config, index, offerDetails, readme, standard, migration] = await Promise.all([
  readFile('src/config.js', 'utf8'),
  readFile('index.html', 'utf8'),
  readFile('src/offer-details.js', 'utf8'),
  readFile('README.md', 'utf8'),
  readFile('docs/MARKETING_CREATIVE_PACK.md', 'utf8'),
  readFile('supabase/migrations/202607170006_add_marketing_creative_pack.sql', 'utf8'),
]);

test('Quick Fix remains $199 one time while adding ten creative variations', () => {
  assert.match(config, /quick_fix[\s\S]*amount:\s*19900\b/);
  assert.match(config, /quick_fix[\s\S]*cadence:\s*'one-time'/);
  assert.match(config, /totalVariations:\s*10\b/);
  assert.match(config, /masterDirections:\s*2\b/);
  assert.match(config, /formatsPerDirection:\s*5\b/);
  assert.match(index, /src\/offer-details\.js/);
  assert.match(offerDetails, /\$\{pack\.totalVariations\} Canva-ready marketing creative variations/);
  assert.match(offerDetails, /10-piece AI-assisted Canva-ready marketing creative pack/);
});

test('creative production is bounded and inexpensive by design', () => {
  assert.match(standard, /one business, one campaign, and one promoted offer/i);
  assert.match(standard, /Canva Free-compatible/i);
  assert.match(standard, /one consolidated revision round/i);
  assert.match(standard, /does not include:[\s\S]*Ad spend/i);
  assert.match(readme, /AI-assisted concept and copy generation with human review/i);
  assert.doesNotMatch(readme, /recurring creative|monthly creative|creative subscription/i);
});

test('database tracks exactly ten human-reviewed Quick Fix creatives', () => {
  assert.match(migration, /create table if not exists public\.marketing_creatives/);
  assert.match(migration, /creative_number between 1 and 10/);
  assert.match(migration, /master_direction between 1 and 2/);
  assert.match(migration, /v_plan_key <> 'quick_fix'/);
  assert.match(migration, /rights_review_status/);
  assert.match(migration, /marketing_creatives_select_own/);
  assert.match(migration, /grant select on table public\.marketing_creatives to authenticated/);
  assert.match(migration, /revoke all on table public\.marketing_creatives from public, anon, authenticated/);
});

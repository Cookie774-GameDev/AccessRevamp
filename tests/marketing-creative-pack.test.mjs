import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [catalog, cards, readme, standard, migration] = await Promise.all([
  readFile('src/config/tier-catalog.js', 'utf8'),
  readFile('src/components/cards.js', 'utf8'),
  readFile('README.md', 'utf8'),
  readFile('docs/MARKETING_CREATIVE_PACK.md', 'utf8'),
  readFile('supabase/migrations/202607170006_add_marketing_creative_pack.sql', 'utf8'),
]);

test('Complete Website Revamp is the canonical $200 one-time implementation tier', () => {
  assert.match(catalog, /complete_revamp[\s\S]*name:\s*'Complete Website Revamp'/);
  assert.match(catalog, /complete_revamp[\s\S]*listPriceCents:\s*20000\b/);
  assert.match(catalog, /complete_revamp[\s\S]*cadence:\s*'one-time'/);
  assert.match(catalog, /Up to five agreed standard pages/);
  assert.match(cards, /plan\.features\.map/);
});

test('creative production is bounded and inexpensive by design', () => {
  assert.match(standard, /one business, one campaign, and one promoted offer/i);
  assert.match(standard, /Canva Free-compatible/i);
  assert.match(standard, /one consolidated revision round/i);
  assert.match(standard, /does not include:[\s\S]*Ad spend/i);
  assert.match(readme, /AI-assisted concept and copy generation with human review/i);
  assert.doesNotMatch(readme, /recurring creative|monthly creative|creative subscription/i);
});

test('legacy database records preserve exactly ten human-reviewed creative variations', () => {
  assert.match(migration, /create table if not exists public\.marketing_creatives/);
  assert.match(migration, /creative_number between 1 and 10/);
  assert.match(migration, /master_direction between 1 and 2/);
  assert.match(migration, /v_plan_key <> 'quick_fix'/);
  assert.match(migration, /rights_review_status/);
  assert.match(migration, /marketing_creatives_select_own/);
  assert.match(migration, /grant select on table public\.marketing_creatives to authenticated/);
  assert.match(migration, /revoke all on table public\.marketing_creatives from public, anon, authenticated/);
});

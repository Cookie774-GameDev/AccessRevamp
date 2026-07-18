import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { isPolicyScannable } from './lib/scannable-file.mjs';
import { TIERS, TIER_KEYS } from '../src/config/tier-catalog.js';

const roots = ['src', 'netlify', 'supabase', 'docs', 'README.md', '.env.example', 'netlify.toml'];
const files = [];
async function collect(path) {
  const stat = await import('node:fs/promises').then(({ stat }) => stat(path));
  if (stat.isDirectory()) {
    for (const entry of await readdir(path)) await collect(join(path, entry));
  } else if (isPolicyScannable(path)) files.push(path);
}
for (const root of roots) await collect(root);

const forbidden = [
  /\$\s*79\b/i,
  /\$\s*80\b/i,
  /\$\s*400\b/i,
  /\$\s*999\b/i,
  /\$\s*2,?500\b/i,
  /\$\s*99\s*(?:-|to)\s*\$?\s*300\s*\/\s*month/i,
  /guaranteed\s+(?:compliance|security|revenue|sales)/i,
];
const failures = [];
for (const file of files) {
  const text = await readFile(file, 'utf8');
  for (const pattern of forbidden) if (pattern.test(text)) failures.push(file + ' matched ' + pattern);
}
const expectedCatalog = Object.freeze({
  free_snapshot: 0,
  homepage_reveal: 5000,
  complete_revamp: 20000,
  cinematic_scroll: 25000,
});
if (TIER_KEYS.length !== 4) failures.push('The canonical catalog must contain exactly four tiers.');
for (const [key, cents] of Object.entries(expectedCatalog)) {
  if (TIERS[key]?.listPriceCents !== cents) failures.push(`${key} must be exactly ${cents} cents.`);
  if (TIERS[key]?.cadence !== 'one-time') failures.push(`${key} must be one-time.`);
}
const migration = await readFile('supabase/migrations/202607170001_accessrevamp.sql', 'utf8');
if (!/daily_limit[^\n]+20/.test(migration) || !/Daily outreach limit of 20 reached/.test(migration)) failures.push('Database outreach ceiling is missing.');
if (!/suppression_list/.test(migration)) failures.push('Permanent suppression list is missing.');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Static policy and catalog checks passed across ' + files.length + ' files.');

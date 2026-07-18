import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const roots = ['src', 'netlify', 'supabase', 'docs', 'README.md', '.env.example', 'netlify.toml'];
const files = [];
async function collect(path) {
  const stat = await import('node:fs/promises').then(({ stat }) => stat(path));
  if (stat.isDirectory()) {
    for (const entry of await readdir(path)) await collect(join(path, entry));
  } else files.push(path);
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
const config = await readFile('src/config.js', 'utf8');
if (!/amount:\s*5000\b/.test(config)) failures.push('Homepage Reveal must be exactly 5000 cents.');
if (!/amount:\s*19900\b/.test(config)) failures.push('Quick Fix must be exactly 19900 cents.');
if (!/amount:\s*25000\b/.test(config)) failures.push('Cinematic Scroll Site must be exactly 25000 cents.');
if ((config.match(/cadence:\s*'one-time'/g) || []).length !== 3) failures.push('All three catalog entries must be one-time.');
const migration = await readFile('supabase/migrations/202607170001_accessrevamp.sql', 'utf8');
if (!/daily_limit[^\n]+20/.test(migration) || !/Daily outreach limit of 20 reached/.test(migration)) failures.push('Database outreach ceiling is missing.');
if (!/suppression_list/.test(migration)) failures.push('Permanent suppression list is missing.');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Static policy and catalog checks passed across ' + files.length + ' files.');

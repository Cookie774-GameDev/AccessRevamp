import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const roots = [
  'src',
  'netlify',
  'supabase',
  'scripts',
  'tests',
  'docs',
  'README.md',
  '.env.example',
  '.env.netlify.example',
  'netlify.toml',
];
const files = [];

async function collect(path) {
  const details = await stat(path);
  if (details.isDirectory()) {
    for (const entry of await readdir(path)) await collect(join(path, entry));
  } else {
    files.push(path);
  }
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
  for (const pattern of forbidden) {
    if (pattern.test(text)) failures.push(`${file} matched ${pattern}`);
  }
}

const config = await readFile('src/config.js', 'utf8');
if (!/amount:\s*5000\b/.test(config)) failures.push('Homepage Reveal must be exactly 5000 cents.');
if (!/amount:\s*19900\b/.test(config)) failures.push('Quick Fix must be exactly 19900 cents.');
if ((config.match(/cadence:\s*'one-time'/g) || []).length !== 2) {
  failures.push('Both catalog entries must be one-time.');
}

const migrationPath = 'supabase/migrations/202607170001_accessrevamp.sql';
const migration = await readFile(migrationPath, 'utf8');
const reviewMigration = await readFile(
  'supabase/migrations/202607170002_review_attribution.sql',
  'utf8',
);
const requiredMigrationPatterns = [
  [/create table if not exists public\.ar_orders/, 'Isolated order table is missing.'],
  [/create table if not exists public\.ar_suppression_list/, 'Permanent suppression list is missing.'],
  [/create table if not exists public\.ar_outreach_messages/, 'Isolated outreach table is missing.'],
  [/v_daily_approved >= 20/, 'Database outreach ceiling is missing.'],
  [/daily outreach approval limit of 20 reached/i, 'Daily outreach ceiling error is missing.'],
  [/staff\.active = true/, 'Active-staff approval enforcement is missing.'],
  [/follow_up_count between 0 and 1/, 'One-follow-up ceiling is missing.'],
  [/security_invoker = true/, 'Customer views must be security-invoker views.'],
  [/email_confirmed_at is not null/, 'Confirmed-email order claiming is missing.'],
  [/revoke all on function public\.ar_link_paid_order\(uuid\) from public, anon, authenticated/, 'Paid-order linker is not server-only.'],
  [/new\.status in \('opted_out', 'suppressed', 'cancelled'\)/, 'Terminal outreach state handling is missing.'],
];
for (const [pattern, message] of requiredMigrationPatterns) {
  if (!pattern.test(migration)) failures.push(message);
}

const requiredReviewPatterns = [
  [/human_reviewed_by uuid references auth\.users/, 'Verified findings need reviewer attribution.'],
  [/human_approved_by uuid references auth\.users/, 'Approved previews need approver attribution.'],
  [/preview approver must be an active AccessRevamp staff member/i, 'Active-staff preview approval is missing.'],
  [/finding_staff\.active = true/, 'Verified finding reviewer must remain active staff.'],
  [/drop trigger if exists ar_preview_guardrails/, 'Private preview trigger is missing.'],
  [/approved outreach requires an active-staff-reviewed finding and private preview/i, 'Outreach review chain is incomplete.'],
];
for (const [pattern, message] of requiredReviewPatterns) {
  if (!pattern.test(reviewMigration)) failures.push(message);
}

const forbiddenGenericDeclarations = [
  /create table if not exists public\.profiles\b/,
  /create table if not exists public\.orders\b/,
  /create table if not exists public\.customer_projects\b/,
  /create table if not exists public\.prospects\b/,
  /create table if not exists public\.outreach_queue\b/,
  /create table if not exists public\.suppression_list\b/,
  /create table if not exists public\.stripe_events\b/,
];
for (const pattern of forbiddenGenericDeclarations) {
  if (pattern.test(`${migration}\n${reviewMigration}`)) {
    failures.push(`Migration contains a non-isolated declaration: ${pattern}`);
  }
}

const operationalFiles = files.filter((file) =>
  file.startsWith('netlify/functions/') || file.startsWith('scripts/'));
const legacyRuntimeQuery = /\.from\('(orders|profiles|customer_projects|prospects|findings|previews|outreach_queue|suppression_list|stripe_events|contact_submissions)'\)/;
for (const file of operationalFiles) {
  const text = await readFile(file, 'utf8');
  if (legacyRuntimeQuery.test(text)) {
    failures.push(`${file} still queries a non-isolated runtime table.`);
  }
}

const environmentTemplate = await readFile('.env.netlify.example', 'utf8');
for (const variable of [
  'CONTACT_RATE_LIMIT_SECRET',
  'PREVIEW_TOKEN_SECRET',
  'UNSUBSCRIBE_SECRET',
  'SENDER_FULL_NAME',
  'SENDER_EMAIL',
  'BUSINESS_POSTAL_ADDRESS',
]) {
  if (!environmentTemplate.includes(`${variable}=`)) {
    failures.push(`.env.netlify.example is missing ${variable}.`);
  }
}

const tokenUtilities = await readFile('netlify/functions/_shared/secure-tokens.mjs', 'utf8');
if (!/createHmac\('sha256'/.test(tokenUtilities) || !/timingSafeEqual/.test(tokenUtilities)) {
  failures.push('Private preview and opt-out tokens must use keyed hashes and timing-safe verification.');
}

const approvalScript = await readFile('scripts/approve-outreach.mjs', 'utf8');
if (/nodemailer|sendgrid|resend\.emails|gmail\.users\.messages\.send/i.test(approvalScript)) {
  failures.push('The approval script must not contain a mail transport.');
}
if (!/from\('ar_staff'\)/.test(approvalScript) || !/createUnsubscribeToken/.test(approvalScript)) {
  failures.push('Approval must verify active staff and create a signed opt-out link.');
}
if (!/assertOutreachDraft/.test(approvalScript)) {
  failures.push('Human-edited outreach must pass content guardrails before approval.');
}

const allText = await Promise.all(files.map((file) => readFile(file, 'utf8')));
if (/sending_enabled/i.test(allText.join('\n'))) {
  failures.push('The repository must not imply that a nonexistent sending_enabled flag activates email.');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Static policy, isolation, and catalog checks passed across ${files.length} files.`);

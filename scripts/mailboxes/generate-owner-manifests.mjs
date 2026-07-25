import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const root = resolve(import.meta.dirname, '..', '..');
const outputDirectory = resolve(root, 'docs/agent-system/mailbox-owners');
const supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase service configuration is required.');

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const { data: assignments, error } = await client
  .from('accessrevamp_mailbox_owner_assignments')
  .select('owner_code,position,accessrevamp_mailbox_owners(display_name),accessrevamp_mailboxes(id,address,provider,provider_mailbox_id,status,cold_daily_limit,warm_daily_limit,outbound_authorized,reply_handling_authorized)')
  .order('owner_code')
  .order('position');
if (error) throw error;

const owners = new Map();
for (const assignment of assignments || []) {
  const mailbox = assignment.accessrevamp_mailboxes;
  if (!mailbox) throw new Error('Mailbox assignment is missing its mailbox.');
  const list = owners.get(assignment.owner_code) || [];
  list.push({
    position: assignment.position,
    ownerDisplayName: assignment.accessrevamp_mailbox_owners?.display_name,
    ...mailbox,
  });
  owners.set(assignment.owner_code, list);
}
if (owners.size !== 5 || [...owners.values()].some((mailboxes) => mailboxes.length !== 20)) {
  throw new Error('Expected five mailbox owners with twenty mailboxes each.');
}

await mkdir(outputDirectory, { recursive: true });
const requiredReading = [
  '../mainagent.md',
  '../subagentforcustomer.md',
  '../skills/outreach/SKILL.md',
  '../../OUTREACH_REPLY_GUIDE.md',
];
for (const [ownerCode, mailboxes] of owners) {
  const title = mailboxes[0].ownerDisplayName || (ownerCode[0].toUpperCase() + ownerCode.slice(1));
  const rows = mailboxes.map((mailbox) => (
    `| ${mailbox.position} | ${mailbox.address} | ${mailbox.id} | ${mailbox.provider_mailbox_id || 'not-synced'} | ${mailbox.provider} | ${mailbox.status} | ${mailbox.cold_daily_limit} | ${mailbox.outbound_authorized} | ${mailbox.reply_handling_authorized} |`
  )).join('\n');
  const manifest = `# ${title} — Permanent Mailbox Manifest

Owner code: \`${ownerCode}\`

These twenty mailboxes are permanent. Supabase is authoritative. Never exchange, borrow, or operate another owner's mailbox. Credentials are intentionally excluded.

## Required reading before every run

${requiredReading.map((path) => `- [${path.split('/').at(-1)}](${path})`).join('\n')}

## Daily preflight

- Confirm all twenty IDs and addresses still match Supabase.
- Confirm each mailbox is active, healthy, and explicitly authorized before use.
- Process existing replies before new outreach.
- Respect the five combined cold/reply messages per mailbox daily limit.
- Record every draft, send result, provider message ID, reply, opt-out, bounce, complaint, and handoff.
- Stop on sender mismatch, missing context, suppression, quota, or ambiguous ownership.

## Mailboxes

| # | Address | Internal ID | Provider mailbox ID | Provider | Status | Cold/reply limit | Outbound authorized | Reply authorized |
|---:|---|---|---|---|---|---:|---|---|
${rows}
`;
  await writeFile(resolve(outputDirectory, `${ownerCode}.md`), manifest, 'utf8');
}

console.log(JSON.stringify({ owners: owners.size, mailboxes: assignments.length, credentialsPrinted: false }));

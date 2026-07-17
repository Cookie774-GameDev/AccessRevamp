import { createClient } from '@supabase/supabase-js';
import { writeFile } from 'node:fs/promises';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { 'x-application-name': 'accessrevamp-approved-export' } },
});

const { data: messages, error: messagesError } = await supabase
  .from('ar_outreach_messages')
  .select('id,prospect_id,contact_email,subject,body_text,unsubscribe_url,source,follow_up_count')
  .eq('status', 'approved')
  .order('human_approved_at', { ascending: true })
  .limit(20);
if (messagesError) throw messagesError;

const prospectIds = [...new Set((messages || []).map((item) => item.prospect_id).filter(Boolean))];
let prospectMap = new Map();
if (prospectIds.length) {
  const { data: prospects, error: prospectsError } = await supabase
    .from('ar_prospects')
    .select('id,business_name,website_url,contact_source_url')
    .in('id', prospectIds);
  if (prospectsError) throw prospectsError;
  prospectMap = new Map((prospects || []).map((prospect) => [prospect.id, prospect]));
}

const quote = (value) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
const rows = [[
  'queue_id',
  'business_name',
  'website_url',
  'contact_source_url',
  'recipient_email',
  'subject',
  'body_text',
  'unsubscribe_url',
  'follow_up_count',
  'source',
]];

for (const item of messages || []) {
  const prospect = prospectMap.get(item.prospect_id) || {};
  rows.push([
    item.id,
    prospect.business_name,
    prospect.website_url,
    prospect.contact_source_url,
    item.contact_email,
    item.subject,
    item.body_text,
    item.unsubscribe_url,
    item.follow_up_count,
    item.source,
  ]);
}

const csv = rows.map((row) => row.map(quote).join(',')).join('\n') + '\n';
const output = process.argv[2] || 'approved-outreach.csv';
await writeFile(output, csv, 'utf8');
console.log('Exported ' + Math.max(rows.length - 1, 0) + ' approved rows to ' + output + '. No email was sent.');

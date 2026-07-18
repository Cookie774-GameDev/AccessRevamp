import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error('Usage: node scripts/approve-outreach.mjs outreach-decisions.jsonl');
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const decisionSchema = z.object({
  queueId: z.string().uuid(),
  approvedBy: z.string().trim().min(2).max(160),
  decision: z.enum(['approve', 'reject']),
  subject: z.string().trim().min(8).max(120).optional(),
  bodyText: z.string().trim().min(80).max(8000).optional(),
  reviewNotes: z.string().trim().max(2000).optional(),
}).strict();

const lines = (await readFile(inputPath, 'utf8'))
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

if (lines.length === 0) throw new Error('The decision file is empty.');
if (lines.length > 20) throw new Error('A single approval batch is limited to 20 decisions.');

const decisions = lines.map((line, index) => {
  try {
    return decisionSchema.parse(JSON.parse(line));
  } catch (error) {
    throw new Error(`Invalid decision on line ${index + 1}: ${error.message}`);
  }
});

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { 'x-application-name': 'accessrevamp-human-approval' } },
});

const { data: settings, error: settingsError } = await supabase
  .from('outreach_settings')
  .select('sender_name,sender_email,postal_address,site_url')
  .eq('singleton', true)
  .single();
if (settingsError) throw settingsError;

const missingSettings = [
  ['sender_name', settings.sender_name],
  ['sender_email', settings.sender_email],
  ['postal_address', settings.postal_address],
  ['site_url', settings.site_url],
].filter(([, value]) => !String(value || '').trim()).map(([key]) => key);

if (decisions.some((item) => item.decision === 'approve') && missingSettings.length) {
  throw new Error(`Outreach settings are incomplete: ${missingSettings.join(', ')}`);
}

const results = [];
for (const decision of decisions) {
  const { data: item, error: itemError } = await supabase
    .from('outreach_queue')
    .select('id,recipient_email,subject,body_text,status,opt_out_token')
    .eq('id', decision.queueId)
    .single();
  if (itemError) throw itemError;
  if (item.status !== 'draft') {
    throw new Error(`Queue item ${item.id} is ${item.status}, not draft.`);
  }

  if (decision.decision === 'reject') {
    const { error } = await supabase
      .from('outreach_queue')
      .update({ status: 'canceled', last_error: decision.reviewNotes || 'Rejected during human review.' })
      .eq('id', item.id)
      .eq('status', 'draft');
    if (error) throw error;
    results.push({ queueId: item.id, status: 'canceled' });
    continue;
  }

  const optOutUrl = `${String(settings.site_url).replace(/\/$/, '')}/.netlify/functions/unsubscribe?token=${item.opt_out_token}`;
  let bodyText = decision.bodyText || item.body_text;
  if (bodyText.includes('{{OPT_OUT_URL}}')) {
    bodyText = bodyText.replaceAll('{{OPT_OUT_URL}}', optOutUrl);
  }

  if (!/unsubscribe|opt out/i.test(bodyText)) {
    bodyText += `\n\nTo stop future AccessRevamp outreach, use this link: ${optOutUrl}`;
  } else if (!bodyText.includes(optOutUrl)) {
    bodyText += `\nOne-click opt-out: ${optOutUrl}`;
  }

  const identityFooter = [
    '',
    '--',
    settings.sender_name,
    'AccessRevamp',
    settings.sender_email,
    settings.postal_address,
    String(settings.site_url).replace(/\/$/, ''),
  ].join('\n');

  if (!bodyText.includes(settings.postal_address)) bodyText += identityFooter;
  if (bodyText.length > 8000) {
    throw new Error(`Approved body for queue item ${item.id} exceeds 8000 characters.`);
  }

  const { error: updateError } = await supabase
    .from('outreach_queue')
    .update({
      subject: decision.subject || item.subject,
      body_text: bodyText,
      status: 'approved',
      human_approved_by: decision.approvedBy,
      human_approved_at: new Date().toISOString(),
      last_error: decision.reviewNotes || null,
    })
    .eq('id', item.id)
    .eq('status', 'draft');
  if (updateError) throw updateError;

  results.push({ queueId: item.id, status: 'approved' });
}

console.log(JSON.stringify({ processed: results.length, results }, null, 2));
console.error('No email was sent. Approved records may now be exported for the separately configured sender.');

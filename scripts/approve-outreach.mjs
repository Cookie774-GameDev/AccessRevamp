import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { createUnsubscribeToken } from '../netlify/functions/_shared/secure-tokens.mjs';
import { assertOutreachDraft } from './lib/outreach-guardrails.mjs';

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
  approvedByUserId: z.string().uuid(),
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

const siteUrl = String(process.env.VITE_SITE_URL || process.env.SITE_URL || process.env.URL || '')
  .replace(/\/$/, '');
const senderName = String(process.env.SENDER_FULL_NAME || '').trim();
const senderEmail = String(process.env.SENDER_EMAIL || process.env.VITE_CONTACT_EMAIL || '').trim();
const postalAddress = String(process.env.BUSINESS_POSTAL_ADDRESS || '').trim();
const approving = decisions.some((item) => item.decision === 'approve');

if (approving) {
  const missing = [
    ['HTTPS site URL', /^https:\/\//i.test(siteUrl)],
    ['SENDER_FULL_NAME', senderName],
    ['SENDER_EMAIL', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)],
    ['BUSINESS_POSTAL_ADDRESS', postalAddress],
    ['UNSUBSCRIBE_SECRET', (process.env.UNSUBSCRIBE_SECRET || '').length >= 32],
  ].filter(([, value]) => !value).map(([label]) => label);
  if (missing.length) {
    throw new Error(`Outreach identity or opt-out configuration is incomplete: ${missing.join(', ')}`);
  }
}

const results = [];
for (const decision of decisions) {
  const { data: staff, error: staffError } = await supabase
    .from('ar_staff')
    .select('user_id,role,active')
    .eq('user_id', decision.approvedByUserId)
    .maybeSingle();
  if (staffError) throw staffError;
  if (!staff?.active) {
    throw new Error(`Approver ${decision.approvedByUserId} is not an active AccessRevamp staff member.`);
  }

  const { data: item, error: itemError } = await supabase
    .from('ar_outreach_messages')
    .select('id,prospect_id,contact_email,subject,body_text,status,follow_up_count')
    .eq('id', decision.queueId)
    .single();
  if (itemError) throw itemError;
  if (item.status !== 'draft') {
    throw new Error(`Outreach item ${item.id} is ${item.status}, not draft.`);
  }

  if (decision.decision === 'reject') {
    const { error } = await supabase
      .from('ar_outreach_messages')
      .update({
        status: 'cancelled',
        review_notes: decision.reviewNotes || 'Rejected during human review.',
      })
      .eq('id', item.id)
      .eq('status', 'draft');
    if (error) throw error;
    results.push({ queueId: item.id, status: 'cancelled' });
    continue;
  }

  const { data: prospect, error: prospectError } = await supabase
    .from('ar_prospects')
    .select('domain')
    .eq('id', item.prospect_id)
    .single();
  if (prospectError) throw prospectError;

  const token = createUnsubscribeToken({
    messageId: item.id,
    email: item.contact_email.toLowerCase(),
  });
  const optOutUrl = `${siteUrl}/.netlify/functions/unsubscribe?token=${encodeURIComponent(token)}`;
  const subject = decision.subject || item.subject;
  let bodyText = decision.bodyText || item.body_text;
  bodyText = bodyText.replaceAll('{{OPT_OUT_URL}}', optOutUrl);

  if (!/unsubscribe|opt out/i.test(bodyText)) {
    bodyText += `\n\nTo stop future AccessRevamp outreach, use this link: ${optOutUrl}`;
  } else if (!bodyText.includes(optOutUrl)) {
    bodyText += `\nOne-click opt-out: ${optOutUrl}`;
  }

  const identityFooter = [
    '',
    '--',
    senderName,
    'AccessRevamp',
    senderEmail,
    postalAddress,
    siteUrl,
    'Commercial outreach from AccessRevamp.',
  ].join('\n');

  if (!bodyText.includes(postalAddress)) bodyText += identityFooter;
  if (bodyText.length > 8000) {
    throw new Error(`Approved body for outreach item ${item.id} exceeds 8000 characters.`);
  }

  assertOutreachDraft({
    subject,
    bodyText,
    reviewedDomain: prospect.domain,
  });

  const { error: updateError } = await supabase
    .from('ar_outreach_messages')
    .update({
      subject,
      body_text: bodyText,
      unsubscribe_url: optOutUrl,
      status: 'approved',
      human_approved_by: decision.approvedByUserId,
      human_approved_at: new Date().toISOString(),
      review_notes: decision.reviewNotes || null,
    })
    .eq('id', item.id)
    .eq('status', 'draft');
  if (updateError) throw updateError;

  results.push({ queueId: item.id, status: 'approved', followUp: item.follow_up_count === 1 });
}

console.log(JSON.stringify({ processed: results.length, results }, null, 2));
console.error('No email was sent. Approved records may only be exported to a separately reviewed sender workflow.');

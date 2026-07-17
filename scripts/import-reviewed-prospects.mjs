import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error('Usage: node scripts/import-reviewed-prospects.mjs reviewed-prospects.jsonl');
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const publicUrl = z.string().trim().url().refine((value) => {
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol)
    && !['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase());
}, 'A public HTTP(S) URL is required.');

const recordSchema = z.object({
  businessName: z.string().trim().min(1).max(160),
  websiteUrl: publicUrl,
  recipientEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  contactSourceUrl: publicUrl,
  finding: z.object({
    category: z.enum([
      'accessibility',
      'usability',
      'performance',
      'content',
      'seo',
      'security_hygiene',
      'conversion',
    ]),
    title: z.string().trim().min(5).max(180),
    summary: z.string().trim().min(20).max(2000),
    evidence: z.string().trim().min(20).max(4000),
    referenceUrl: publicUrl.optional(),
    reviewedBy: z.string().trim().min(2).max(160),
  }).strict(),
  subject: z.string().trim().min(8).max(120),
  bodyText: z.string().trim().min(80).max(8000),
}).strict();

function normalizeWebsite(value) {
  const url = new URL(value);
  url.hash = '';
  if (url.pathname === '/') url.pathname = '';
  return url.toString().replace(/\/$/, '');
}

const raw = await readFile(inputPath, 'utf8');
const lines = raw
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

if (lines.length === 0) throw new Error('The input file is empty.');
if (lines.length > 20) {
  throw new Error('A single reviewed-prospect import is limited to 20 records.');
}

const records = lines.map((line, index) => {
  try {
    return recordSchema.parse(JSON.parse(line));
  } catch (error) {
    throw new Error(`Invalid JSONL record on line ${index + 1}: ${error.message}`);
  }
});

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { 'x-application-name': 'accessrevamp-reviewed-import' } },
});

const results = [];
for (const record of records) {
  const websiteUrl = normalizeWebsite(record.websiteUrl);
  const recipientEmail = record.recipientEmail.toLowerCase();

  const { data: suppression, error: suppressionError } = await supabase
    .from('suppression_list')
    .select('id')
    .ilike('email', recipientEmail)
    .maybeSingle();
  if (suppressionError) throw suppressionError;
  if (suppression) {
    results.push({ websiteUrl, recipientEmail, status: 'skipped_suppressed' });
    continue;
  }

  let { data: prospect, error: prospectLookupError } = await supabase
    .from('prospects')
    .select('id')
    .eq('website_url', websiteUrl)
    .maybeSingle();
  if (prospectLookupError) throw prospectLookupError;

  if (!prospect) {
    const { data, error } = await supabase
      .from('prospects')
      .insert({
        business_name: record.businessName,
        website_url: websiteUrl,
        contact_email: recipientEmail,
        contact_source_url: record.contactSourceUrl,
        public_contact_verified_at: new Date().toISOString(),
        review_status: 'approved',
        notes: 'Imported from a human-reviewed JSONL record.',
      })
      .select('id')
      .single();
    if (error) throw error;
    prospect = data;
  } else {
    const { error } = await supabase
      .from('prospects')
      .update({
        business_name: record.businessName,
        contact_email: recipientEmail,
        contact_source_url: record.contactSourceUrl,
        public_contact_verified_at: new Date().toISOString(),
        review_status: 'approved',
      })
      .eq('id', prospect.id);
    if (error) throw error;
  }

  const { error: findingError } = await supabase.from('findings').insert({
    prospect_id: prospect.id,
    category: record.finding.category,
    title: record.finding.title,
    summary: record.finding.summary,
    evidence: record.finding.evidence,
    reference_url: record.finding.referenceUrl || websiteUrl,
    status: 'verified',
    reviewed_by: record.finding.reviewedBy,
    reviewed_at: new Date().toISOString(),
  });
  if (findingError) throw findingError;

  const { data: queueItem, error: queueError } = await supabase
    .from('outreach_queue')
    .insert({
      prospect_id: prospect.id,
      recipient_email: recipientEmail,
      subject: record.subject,
      body_text: record.bodyText,
      status: 'draft',
    })
    .select('id')
    .single();
  if (queueError) throw queueError;

  results.push({
    websiteUrl,
    recipientEmail,
    queueId: queueItem.id,
    status: 'draft_created',
  });
}

console.log(JSON.stringify({ imported: results.length, results }, null, 2));
console.error('No email was sent. Drafts still require explicit human approval.');

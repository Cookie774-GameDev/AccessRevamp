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
    && !url.username
    && !url.password
    && !['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase());
}, 'A public HTTP(S) URL is required.');

const findingSchema = z.object({
  category: z.enum([
    'accessibility',
    'usability',
    'performance',
    'content',
    'seo',
    'technical_quality',
    'conversion',
  ]),
  severity: z.enum(['blocking', 'serious', 'moderate', 'improvement']),
  affectedUserGroup: z.string().trim().min(3).max(240),
  affectedBusinessTask: z.string().trim().min(3).max(240),
  title: z.string().trim().min(5).max(180),
  summary: z.string().trim().min(20).max(2000),
  evidence: z.string().trim().min(20).max(4000),
  referenceUrl: publicUrl.optional(),
  ruleId: z.string().trim().max(120).optional(),
  domSelector: z.string().trim().max(1000).optional(),
  htmlExcerpt: z.string().trim().max(4000).optional(),
  wcagReference: z.string().trim().max(240).optional(),
  screenshotPath: z.string().trim().max(1000).optional(),
  repairEffort: z.enum(['small', 'medium', 'large', 'unknown']).default('unknown'),
  proposedFix: z.string().trim().min(10).max(4000),
  reviewedBy: z.string().trim().min(2).max(160),
}).strict();

const recordSchema = z.object({
  businessName: z.string().trim().min(1).max(160),
  websiteUrl: publicUrl,
  recipientEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  contactSourceUrl: publicUrl,
  finding: findingSchema,
  subject: z.string().trim().min(8).max(120),
  bodyText: z.string().trim().min(80).max(8000),
}).strict();

const scareClaimPattern = /(?:security\s+vulnerabilit|you(?:'re| are)\s+noncompliant|could\s+be\s+sued|we\s+found\s+a\s+breach|your\s+site\s+was\s+compromised)/i;
const shortenerPattern = /\b(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly)\b/i;

function normalizeWebsite(value) {
  const url = new URL(value);
  url.hash = '';
  if (url.pathname === '/') url.pathname = '';
  return url.toString().replace(/\/$/, '');
}

function validateOutreachCopy(record) {
  if (/^(?:re|fwd?):/i.test(record.subject)) throw new Error('Fake reply or forward subject prefixes are not allowed.');
  if (scareClaimPattern.test(record.subject) || scareClaimPattern.test(record.bodyText)) {
    throw new Error('Outreach cannot make unverified security, legal-compliance, breach, or lawsuit claims.');
  }
  if (shortenerPattern.test(record.bodyText)) throw new Error('URL shorteners are not allowed in outreach.');
  const reviewedHost = new URL(record.websiteUrl).hostname.replace(/^www\./, '');
  if (!record.bodyText.toLowerCase().includes(reviewedHost.toLowerCase())) {
    throw new Error(`Outreach body must name the reviewed domain (${reviewedHost}).`);
  }
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
    const record = recordSchema.parse(JSON.parse(line));
    validateOutreachCopy(record);
    return record;
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

  const prospectValues = {
    business_name: record.businessName,
    website_url: websiteUrl,
    contact_email: recipientEmail,
    contact_source_url: record.contactSourceUrl,
    public_contact_verified_at: new Date().toISOString(),
    review_status: 'approved',
    notes: 'Imported from a human-reviewed JSONL record with public contact provenance.',
  };

  if (!prospect) {
    const { data, error } = await supabase.from('prospects').insert(prospectValues).select('id').single();
    if (error) throw error;
    prospect = data;
  } else {
    const { error } = await supabase.from('prospects').update(prospectValues).eq('id', prospect.id);
    if (error) throw error;
  }

  const reviewedAt = new Date().toISOString();
  const { data: finding, error: findingError } = await supabase.from('findings').insert({
    prospect_id: prospect.id,
    category: record.finding.category,
    severity: record.finding.severity,
    confidence: 'verified',
    affected_user_group: record.finding.affectedUserGroup,
    affected_business_task: record.finding.affectedBusinessTask,
    title: record.finding.title,
    summary: record.finding.summary,
    evidence: record.finding.evidence,
    reference_url: record.finding.referenceUrl || websiteUrl,
    rule_id: record.finding.ruleId || null,
    dom_selector: record.finding.domSelector || null,
    html_excerpt: record.finding.htmlExcerpt || null,
    wcag_reference: record.finding.wcagReference || null,
    screenshot_path: record.finding.screenshotPath || null,
    repair_effort: record.finding.repairEffort,
    proposed_fix: record.finding.proposedFix,
    status: 'verified',
    reviewed_by: record.finding.reviewedBy,
    reviewed_at: reviewedAt,
  }).select('id').single();
  if (findingError) throw findingError;

  const evidenceRows = [{
    finding_id: finding.id,
    evidence_type: 'manual_note',
    source_url: record.finding.referenceUrl || websiteUrl,
    dom_selector: record.finding.domSelector || null,
    html_excerpt: record.finding.htmlExcerpt || null,
    details: {
      observation: record.finding.evidence,
      wcagReference: record.finding.wcagReference || null,
      affectedUserGroup: record.finding.affectedUserGroup,
      affectedBusinessTask: record.finding.affectedBusinessTask,
      proposedFix: record.finding.proposedFix,
      reviewedBy: record.finding.reviewedBy,
      reviewedAt,
    },
  }];
  if (record.finding.screenshotPath) {
    evidenceRows.push({
      finding_id: finding.id,
      evidence_type: 'screenshot',
      source_url: record.finding.referenceUrl || websiteUrl,
      storage_path: record.finding.screenshotPath,
      dom_selector: record.finding.domSelector || null,
      details: { reviewedBy: record.finding.reviewedBy, reviewedAt },
    });
  }
  const { error: evidenceError } = await supabase.from('finding_evidence').insert(evidenceRows);
  if (evidenceError) throw evidenceError;

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
    findingId: finding.id,
    queueId: queueItem.id,
    status: 'draft_created',
  });
}

console.log(JSON.stringify({ imported: results.length, results }, null, 2));
console.error('No email was sent. Drafts still require explicit human approval.');

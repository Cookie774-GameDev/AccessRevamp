import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import {
  createPrivateToken,
  hashPreviewToken,
} from '../netlify/functions/_shared/secure-tokens.mjs';

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error('Usage: node scripts/import-reviewed-prospects.mjs reviewed-prospects.jsonl');
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = String(process.env.VITE_SITE_URL || process.env.SITE_URL || process.env.URL || '')
  .replace(/\/$/, '');
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}
if (!/^https:\/\//i.test(siteUrl)) {
  throw new Error('VITE_SITE_URL, SITE_URL, or URL must be the deployed HTTPS AccessRevamp address.');
}
if (!process.env.PREVIEW_TOKEN_SECRET || process.env.PREVIEW_TOKEN_SECRET.length < 32) {
  throw new Error('PREVIEW_TOKEN_SECRET must contain at least 32 random characters.');
}

const publicUrl = z.string().trim().url().refine((value) => {
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol)
    && !['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase());
}, 'A public HTTP(S) URL is required.');

const conceptSchema = z.object({
  eyebrow: z.string().trim().min(2).max(100).optional(),
  headline: z.string().trim().min(10).max(180).optional(),
  subheadline: z.string().trim().min(20).max(400).optional(),
  primaryCta: z.string().trim().min(2).max(60).optional(),
  secondaryCta: z.string().trim().min(2).max(60).optional(),
  proofPoints: z.array(z.string().trim().min(2).max(120)).min(1).max(4).optional(),
}).strict();

const recordSchema = z.object({
  businessName: z.string().trim().min(1).max(160),
  websiteUrl: publicUrl,
  recipientEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  contactSourceUrl: publicUrl,
  contactName: z.string().trim().max(160).optional(),
  platform: z.enum(['shopify', 'wordpress', 'woocommerce', 'squarespace', 'custom', 'unknown']).default('unknown'),
  fitReason: z.string().trim().min(10).max(1000).default('Public U.S. storefront with a human-reviewed homepage opportunity.'),
  fitScore: z.number().int().min(0).max(100).default(70),
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
    ruleId: z.string().trim().min(2).max(160).optional(),
    title: z.string().trim().min(5).max(180),
    summary: z.string().trim().min(20).max(2000),
    evidence: z.string().trim().min(20).max(4000),
    referenceUrl: publicUrl.optional(),
    severity: z.enum(['blocking', 'serious', 'moderate', 'improvement']),
    affectedUsers: z.string().trim().min(5).max(500),
    affectedTask: z.string().trim().min(5).max(500),
    wcagCriteria: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
    repairEffort: z.enum(['small', 'medium', 'large']).default('medium'),
    suggestedFix: z.string().trim().min(10).max(3000),
    reviewedByUserId: z.string().uuid(),
    reviewedBy: z.string().trim().min(2).max(160).optional(),
  }).strict(),
  preview: conceptSchema.optional(),
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
  const now = new Date();
  const nowIso = now.toISOString();
  const websiteUrl = normalizeWebsite(record.websiteUrl);
  const website = new URL(websiteUrl);
  const domain = website.hostname.toLowerCase().replace(/^www\./, '');
  const recipientEmail = record.recipientEmail.toLowerCase();
  const recipientDomain = recipientEmail.split('@').pop();

  const [{ data: emailSuppression, error: emailSuppressionError }, { data: domainSuppression, error: domainSuppressionError }] = await Promise.all([
    supabase.from('ar_suppression_list').select('id').eq('normalized_email', recipientEmail).maybeSingle(),
    supabase.from('ar_suppression_list').select('id').eq('domain', recipientDomain).eq('scope', 'domain').limit(1).maybeSingle(),
  ]);
  if (emailSuppressionError) throw emailSuppressionError;
  if (domainSuppressionError) throw domainSuppressionError;
  if (emailSuppression || domainSuppression) {
    results.push({ websiteUrl, recipientEmail, status: 'skipped_suppressed' });
    continue;
  }

  const { data: reviewer, error: reviewerError } = await supabase
    .from('ar_staff')
    .select('user_id,role,active')
    .eq('user_id', record.finding.reviewedByUserId)
    .maybeSingle();
  if (reviewerError) throw reviewerError;
  if (!reviewer?.active) {
    throw new Error(`Reviewer ${record.finding.reviewedByUserId} is not an active AccessRevamp staff member.`);
  }

  let { data: prospect, error: prospectLookupError } = await supabase
    .from('ar_prospects')
    .select('id')
    .eq('website_url', websiteUrl)
    .maybeSingle();
  if (prospectLookupError) throw prospectLookupError;

  const prospectValues = {
    business_name: record.businessName,
    website_url: websiteUrl,
    domain,
    platform: record.platform,
    public_business_email: recipientEmail,
    public_contact_name: record.contactName || null,
    contact_source_url: record.contactSourceUrl,
    country: 'US',
    fit_reason: record.fitReason,
    fit_score: record.fitScore,
    status: 'human_reviewed',
    source: 'reviewed_jsonl_import',
    human_verified_at: nowIso,
  };

  if (!prospect) {
    const { data, error } = await supabase
      .from('ar_prospects')
      .insert(prospectValues)
      .select('id')
      .single();
    if (error) throw error;
    prospect = data;
  } else {
    const { error } = await supabase
      .from('ar_prospects')
      .update(prospectValues)
      .eq('id', prospect.id);
    if (error) throw error;
  }

  const { data: existingMessage, error: existingMessageError } = await supabase
    .from('ar_outreach_messages')
    .select('id,status')
    .eq('prospect_id', prospect.id)
    .eq('follow_up_count', 0)
    .in('status', ['draft', 'approved', 'queued', 'sent', 'replied', 'bounced'])
    .limit(1)
    .maybeSingle();
  if (existingMessageError) throw existingMessageError;
  if (existingMessage) {
    results.push({
      websiteUrl,
      recipientEmail,
      queueId: existingMessage.id,
      status: `skipped_existing_${existingMessage.status}`,
    });
    continue;
  }

  const { data: finding, error: findingError } = await supabase
    .from('ar_findings')
    .insert({
      prospect_id: prospect.id,
      rule_id: record.finding.ruleId || `manual:${record.finding.category}`,
      url: record.finding.referenceUrl || websiteUrl,
      title: record.finding.title,
      description: `${record.finding.summary}\n\nEvidence: ${record.finding.evidence}`,
      severity: record.finding.severity,
      confidence: 'verified',
      review_status: 'verified',
      affected_users: record.finding.affectedUsers,
      affected_task: record.finding.affectedTask,
      wcag_criteria: record.finding.wcagCriteria,
      repair_effort: record.finding.repairEffort,
      suggested_fix: record.finding.suggestedFix,
      evidence_url: record.finding.referenceUrl || websiteUrl,
      retest_status: 'not_tested',
      human_reviewed_at: nowIso,
      human_reviewed_by: reviewer.user_id,
    })
    .select('id')
    .single();
  if (findingError) throw findingError;

  const token = createPrivateToken();
  const tokenHash = hashPreviewToken(token);
  const expiresAt = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)).toISOString();
  const concept = record.preview || {
    eyebrow: record.businessName,
    headline: 'A clearer first impression and a simpler path to action.',
    subheadline: 'This private concept illustrates one possible first-screen direction based on the reviewed storefront.',
    primaryCta: 'Explore the collection',
    secondaryCta: 'Learn more',
    proofPoints: ['Clearer hierarchy', 'Focused primary action', 'Accessible interaction states'],
  };

  const { data: preview, error: previewError } = await supabase
    .from('ar_previews')
    .insert({
      prospect_id: prospect.id,
      finding_id: finding.id,
      token_hash: tokenHash,
      business_name: record.businessName,
      website_url: websiteUrl,
      concept,
      finding_summary: record.finding.summary,
      affected_users: record.finding.affectedUsers,
      status: 'approved',
      watermark: 'Private AccessRevamp Concept',
      noindex: true,
      approved_at: nowIso,
      human_approved_by: reviewer.user_id,
      expires_at: expiresAt,
    })
    .select('id')
    .single();
  if (previewError) throw previewError;

  const previewUrl = `${siteUrl}/.netlify/functions/preview?token=${encodeURIComponent(token)}`;
  let bodyText = record.bodyText.replaceAll('{{PRIVATE_PREVIEW_URL}}', previewUrl);
  if (!bodyText.includes(previewUrl)) {
    bodyText += `\n\nPrivate concept preview: ${previewUrl}`;
  }
  if (bodyText.length > 8000) {
    throw new Error(`Draft body for ${websiteUrl} exceeds 8000 characters after adding the private preview.`);
  }

  const { data: queueItem, error: queueError } = await supabase
    .from('ar_outreach_messages')
    .insert({
      prospect_id: prospect.id,
      preview_id: preview.id,
      contact_email: recipientEmail,
      subject: record.subject,
      body_text: bodyText,
      unsubscribe_url: 'pending-human-approval',
      status: 'draft',
      human_approval_required: true,
      follow_up_count: 0,
      source: 'reviewed_jsonl_import',
    })
    .select('id')
    .single();
  if (queueError) throw queueError;

  results.push({
    websiteUrl,
    recipientEmail,
    queueId: queueItem.id,
    previewUrl,
    expiresAt,
    reviewerUserId: reviewer.user_id,
    status: 'draft_created',
  });
}

console.log(JSON.stringify({ imported: results.length, results }, null, 2));
console.error('No email was sent. Every draft still requires an active staff member to approve it.');

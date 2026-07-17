#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  createPrivateToken,
  hashPreviewToken,
} from '../netlify/functions/_shared/secure-tokens.mjs';

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error('Usage: node scripts/create-private-preview.mjs preview.json');
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = String(
  process.env.VITE_SITE_URL || process.env.SITE_URL || process.env.URL || '',
).replace(/\/$/, '');
if (!supabaseUrl || !serviceRoleKey || !/^https:\/\//i.test(siteUrl)) {
  throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and a deployed HTTPS site URL are required.');
}
if (!process.env.PREVIEW_TOKEN_SECRET || process.env.PREVIEW_TOKEN_SECRET.length < 32) {
  throw new Error('PREVIEW_TOKEN_SECRET must contain at least 32 random characters.');
}

const schema = z.object({
  prospectId: z.string().uuid(),
  findingId: z.string().uuid(),
  approvedByUserId: z.string().uuid(),
  expiresInDays: z.number().int().min(1).max(30).default(14),
  concept: z.object({
    eyebrow: z.string().trim().min(2).max(100).optional(),
    headline: z.string().trim().min(10).max(180),
    subheadline: z.string().trim().min(20).max(400),
    primaryCta: z.string().trim().min(2).max(60).optional(),
    secondaryCta: z.string().trim().min(2).max(60).optional(),
    proofPoints: z.array(z.string().trim().min(2).max(120)).min(1).max(4),
  }).strict(),
}).strict();

const payload = schema.parse(JSON.parse(await readFile(inputPath, 'utf8')));
const now = new Date();
const expiresAt = new Date(now.getTime() + payload.expiresInDays * 86_400_000);
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { 'x-application-name': 'accessrevamp-private-preview' } },
});

const [{ data: staff, error: staffError }, { data: prospect, error: prospectError }, { data: finding, error: findingError }] = await Promise.all([
  supabase
    .from('ar_staff')
    .select('user_id,active')
    .eq('user_id', payload.approvedByUserId)
    .maybeSingle(),
  supabase
    .from('ar_prospects')
    .select('id,business_name,website_url')
    .eq('id', payload.prospectId)
    .maybeSingle(),
  supabase
    .from('ar_findings')
    .select('id,prospect_id,title,description,affected_users,confidence,review_status,human_reviewed_at,human_reviewed_by')
    .eq('id', payload.findingId)
    .maybeSingle(),
]);
if (staffError) throw staffError;
if (prospectError) throw prospectError;
if (findingError) throw findingError;
if (!staff?.active) throw new Error('The preview approver is not an active AccessRevamp staff member.');
if (!prospect) throw new Error('The AccessRevamp prospect was not found.');
if (!finding || finding.prospect_id !== prospect.id) {
  throw new Error('The verified finding does not belong to this prospect.');
}
if (
  finding.confidence !== 'verified'
  || finding.review_status !== 'verified'
  || !finding.human_reviewed_at
  || !finding.human_reviewed_by
) {
  throw new Error('The concept requires an attributed, human-verified finding.');
}

const token = createPrivateToken();
const { data, error } = await supabase
  .from('ar_previews')
  .insert({
    prospect_id: prospect.id,
    finding_id: finding.id,
    token_hash: hashPreviewToken(token),
    business_name: prospect.business_name,
    website_url: prospect.website_url,
    concept: payload.concept,
    finding_summary: finding.title || String(finding.description).slice(0, 600),
    affected_users: finding.affected_users,
    status: 'approved',
    watermark: 'Private AccessRevamp Concept',
    noindex: true,
    approved_at: now.toISOString(),
    human_approved_by: staff.user_id,
    expires_at: expiresAt.toISOString(),
  })
  .select('id,expires_at')
  .single();
if (error) throw error;

console.log(JSON.stringify({
  id: data.id,
  privatePreviewUrl: `${siteUrl}/.netlify/functions/preview?token=${encodeURIComponent(token)}`,
  expiresAt: data.expires_at,
  approvedByUserId: staff.user_id,
  note: 'The raw token is shown once and is never stored. Treat this URL as private.',
}, null, 2));

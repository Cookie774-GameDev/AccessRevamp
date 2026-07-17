#!/usr/bin/env node

import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error('Usage: node scripts/create-private-preview.mjs preview.json');
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = String(process.env.ACCESSREVAMP_SITE_URL || process.env.VITE_SITE_URL || '').replace(/\/$/, '');
if (!supabaseUrl || !serviceRoleKey || !siteUrl) {
  throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ACCESSREVAMP_SITE_URL are required.');
}

const publicUrl = z.string().trim().url().refine((value) => {
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol)
    && !url.username
    && !url.password
    && !['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase());
}, 'A public HTTP(S) URL is required.');

const schema = z.object({
  prospectId: z.string().uuid().optional(),
  sourceUrl: publicUrl,
  reviewedBy: z.string().trim().min(2).max(160),
  expiresInDays: z.number().int().min(1).max(30).default(14),
  concept: z.object({
    brandName: z.string().trim().min(1).max(80),
    eyebrow: z.string().trim().min(1).max(80).optional(),
    headline: z.string().trim().min(8).max(160),
    subheadline: z.string().trim().min(20).max(360),
    ctaLabel: z.string().trim().min(2).max(48).optional(),
    proofPoints: z.array(z.string().trim().min(2).max(90)).min(1).max(3),
    theme: z.enum(['midnight', 'ivory', 'graphite']).default('midnight'),
  }).strict(),
}).strict();

const payload = schema.parse(JSON.parse(await readFile(inputPath, 'utf8')));
const token = randomBytes(32).toString('base64url');
const tokenHash = createHash('sha256').update(token).digest('hex');
const now = new Date();
const expiresAt = new Date(now.getTime() + payload.expiresInDays * 86_400_000);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { 'x-application-name': 'accessrevamp-private-preview' } },
});

const { data, error } = await supabase
  .from('previews')
  .insert({
    prospect_id: payload.prospectId || null,
    token_hash: tokenHash,
    source_url: payload.sourceUrl,
    concept_payload: payload.concept,
    status: 'active',
    human_approved_by: payload.reviewedBy,
    human_approved_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  })
  .select('id,expires_at')
  .single();
if (error) throw error;

console.log(JSON.stringify({
  id: data.id,
  privatePreviewUrl: `${siteUrl}/preview/${token}`,
  expiresAt: data.expires_at,
  note: 'The raw token is shown once and is not stored in Supabase. Treat this URL as private.',
}, null, 2));

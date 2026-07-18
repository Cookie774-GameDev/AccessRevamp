import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { privatePricingActionSchema, privatePricingResolveSchema } from '../netlify/functions/_shared/validation.mjs';
import { createPricingContextHandler } from '../netlify/functions/pricing-context.mjs';
import { readPrivatePricingToken } from '../src/services/pricing-context.js';

const [migration, pricing, cards, service, css, worker, analytics, operator] = await Promise.all([
  'supabase/migrations/202607180005_private_pricing_contexts.sql', 'src/pages/pricing.js',
  'src/components/cards.js', 'src/services/pricing-context.js', 'src/styles/pages.css',
  'worker/index.ts', 'src/config/analytics-events.js', 'netlify/functions/operator-pricing-context.mjs',
].map((path) => readFile(path, 'utf8')));

test('private pricing storage is hash-only, expiring, revocable, indexed, and service-only', () => {
  assert.match(migration, /create table if not exists public\.private_pricing_contexts/i);
  assert.match(migration, /token_hash text not null unique/i);
  const tableDefinition = migration.match(/create table if not exists public\.private_pricing_contexts \([\s\S]*?\n\);/i)?.[0] || '';
  assert.doesNotMatch(tableDefinition, /raw_token/i);
  assert.match(migration, /gen_random_bytes\(32\)/i);
  assert.match(migration, /digest\(raw_token, 'sha256'\)/i);
  assert.match(migration, /status in \('active', 'revoked', 'expired'\)/i);
  assert.match(migration, /private_pricing_contexts_active_expiry_idx/i);
  assert.match(migration, /revoke all on table public\.private_pricing_contexts from public, anon, authenticated/i);
  assert.match(migration, /grant all on table public\.private_pricing_contexts to service_role/i);
});

test('resolution is rate-limited, audited, and projects only customer-facing fields', () => {
  assert.match(migration, /private_pricing_resolution_limits/i);
  assert.match(migration, /return attempts <= 20/i);
  assert.match(migration, /returns table \(\s*customer_label text,\s*website_url text,\s*scope_summary text,\s*recommended_tier text,\s*expires_at timestamptz/s);
  assert.doesNotMatch(migration.match(/returns table \([\s\S]*?\)\s*language plpgsql/i)?.[0] || '', /internal_reference/i);
  assert.match(migration, /pricing_context_viewed/);
});

test('private pricing input is strict, HTTPS-only, and fixed to canonical tiers', () => {
  const input = { action: 'issue', customerLabel: 'Northline Goods', websiteUrl: 'https://example.com', scopeSummary: 'Clarify the offer and make the primary request path easier to find.', recommendedTier: 'complete_revamp', expiresAt: '2026-08-01T12:00:00.000Z' };
  assert.equal(privatePricingActionSchema.parse(input).recommendedTier, 'complete_revamp');
  assert.throws(() => privatePricingActionSchema.parse({ ...input, websiteUrl: 'http://example.com' }));
  assert.throws(() => privatePricingActionSchema.parse({ ...input, recommendedTier: 'custom_499' }));
  assert.throws(() => privatePricingActionSchema.parse({ ...input, customPrice: 499 }));
  assert.equal(privatePricingResolveSchema.parse({ token: 'a'.repeat(43) }).token.length, 43);
});

test('operator issuance is allowlisted, returns a fragment link, and never returns the stored hash', () => {
  assert.match(operator, /requireOperator/); assert.match(operator, /issue_accessrevamp_pricing_context/);
  assert.match(operator, /\/pricing#quote=\$\{data\.token\}/); assert.doesNotMatch(operator, /token_hash/);
  assert.match(operator, /revoke_accessrevamp_pricing_context/);
});

test('resolver hashes the raw token and returns a minimized no-store projection', async () => {
  const originalUrl = process.env.URL; const originalSecret = process.env.CONTACT_RATE_LIMIT_SECRET;
  process.env.URL = 'https://accessrevamp.test'; process.env.CONTACT_RATE_LIMIT_SECRET = 'a-safe-test-secret-that-is-long-enough';
  let rpcArgs;
  const handler = createPricingContextHandler({ adminFactory: () => ({ rpc: async (name, args) => {
    if (name === 'consume_accessrevamp_pricing_resolution_limit') return { data: true, error: null };
    rpcArgs = args;
    return { data: [{ customer_label: 'Northline Goods', website_url: 'https://example.com', scope_summary: 'A bounded and human-reviewed private scope summary.', recommended_tier: 'cinematic_scroll', expires_at: '2026-08-01T12:00:00.000Z' }], error: null };
  } }) });
  const token = 'b'.repeat(43);
  const response = await handler(new Request('https://accessrevamp.test/.netlify/functions/pricing-context', { method: 'POST', headers: { origin: 'https://accessrevamp.test', 'content-type': 'application/json' }, body: JSON.stringify({ token }) }));
  const body = await response.json();
  assert.equal(response.status, 200); assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal(rpcArgs.p_token_hash.length, 64); assert.notEqual(rpcArgs.p_token_hash, token);
  assert.deepEqual(Object.keys(body.context).sort(), ['customer_label','expires_at','recommended_tier','scope_summary','website_url']);
  if (originalUrl === undefined) delete process.env.URL; else process.env.URL = originalUrl;
  if (originalSecret === undefined) delete process.env.CONTACT_RATE_LIMIT_SECRET; else process.env.CONTACT_RATE_LIMIT_SECRET = originalSecret;
});

test('unknown, revoked, and expired contexts share the generic unavailable response', async () => {
  const originalUrl = process.env.URL; const originalSecret = process.env.CONTACT_RATE_LIMIT_SECRET;
  process.env.URL = 'https://accessrevamp.test'; process.env.CONTACT_RATE_LIMIT_SECRET = 'a-safe-test-secret-that-is-long-enough';
  const handler = createPricingContextHandler({ adminFactory: () => ({ rpc: async (name) => name === 'consume_accessrevamp_pricing_resolution_limit' ? { data: true, error: null } : { data: [], error: null } }) });
  const response = await handler(new Request('https://accessrevamp.test/.netlify/functions/pricing-context', { method: 'POST', headers: { origin: 'https://accessrevamp.test', 'content-type': 'application/json' }, body: JSON.stringify({ token: 'c'.repeat(43) }) }));
  assert.equal(response.status, 404); assert.deepEqual(await response.json(), { error: 'Private pricing context is unavailable.' });
  if (originalUrl === undefined) delete process.env.URL; else process.env.URL = originalUrl;
  if (originalSecret === undefined) delete process.env.CONTACT_RATE_LIMIT_SECRET; else process.env.CONTACT_RATE_LIMIT_SECRET = originalSecret;
});

test('pricing has four responsive cards and a scoped premium cinematic treatment', () => {
  assert.match(cards, /data-plan-tier=/); assert.match(pricing, /data-private-pricing-context/); assert.match(pricing, /pageClass: 'pricing-page'/);
  assert.match(css, /\.pricing-page \.pricing-grid \{ grid-template-columns: repeat\(4/);
  assert.match(css, /\.pricing-page \.plan-card\[data-plan-tier="cinematic_scroll"\]/);
  assert.match(css, /@media \(max-width: 1000px\)[\s\S]*\.pricing-page \.pricing-grid \{ grid-template-columns: repeat\(2/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.pricing-page \.pricing-grid, \.private-pricing-context__inner \{ grid-template-columns: 1fr/);
});

test('fragment tokens are erased, never rendered, and analytics accepts only safe status and tier', () => {
  assert.equal(readPrivatePricingToken({ hash: `#quote=${'d'.repeat(43)}` }), 'd'.repeat(43));
  assert.equal(readPrivatePricingToken({ hash: '#quote=bad' }), null); assert.equal(readPrivatePricingToken({ hash: '' }), '');
  assert.match(service, /history\.replaceState/); assert.doesNotMatch(service, /innerHTML/);
  assert.match(analytics, /private_pricing_opened/); assert.match(worker, /\.netlify\/functions\/pricing-context/);
});

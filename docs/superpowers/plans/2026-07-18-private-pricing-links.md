# Private Pricing Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align all four pricing cards, give the $250 card a distinctive premium treatment, and resolve an expiring private customer context from an opaque link without changing canonical prices.

**Architecture:** A forward-only Supabase migration owns hash-only tokens, operator authorization, revocation, expiry, rate limiting, and audit writes. Two Netlify Functions expose a restricted issue/revoke boundary and a minimized public resolver; one browser service reads a fragment token, removes it from history, and progressively enhances the existing public pricing page.

**Tech Stack:** Vite browser JavaScript, semantic HTML/CSS, Netlify Functions, Zod, Supabase/Postgres, Node test runner, Playwright/axe, Sites/vinext.

## Global Constraints

- Work inline only; do not use subagents.
- Change only pricing presentation and the minimum private-link infrastructure.
- Keep canonical list prices exactly `$0`, `$50`, `$200`, and `$250`.
- Never let customer context change due-now value, credit, Stripe mapping, refund logic, or checkout metadata.
- Store only SHA-256 token hashes; generate at least 32 random bytes and return the raw token once.
- Use `/pricing#quote=<token>`, erase the fragment after reading it, and send the token only in a bounded same-origin POST body.
- Default to a normal usable public pricing page for missing, invalid, expired, revoked, or unavailable context.
- Do not run production migrations, activate live Stripe, send outreach, or change domains.
- Respect the user's requested order: implement all parts first, then run the consolidated test pass.

---

## File map

- Create `supabase/migrations/202607180005_private_pricing_contexts.sql`: tables, constraints, indexes, grants, issue/revoke/resolve RPCs, audit writes.
- Modify `netlify/functions/_shared/validation.mjs`: strict issue, revoke, and resolve schemas.
- Create `netlify/functions/operator-pricing-context.mjs`: allowlisted issue/revoke API.
- Create `netlify/functions/pricing-context.mjs`: rate-keyed public resolver and minimized response.
- Modify `worker/index.ts`: route the two pricing-context functions on Sites before the app-router fallback.
- Modify `src/components/cards.js`: stable `data-plan-tier` hook.
- Modify `src/pages/pricing.js`: private-context shell and pricing-specific page class.
- Create `src/services/pricing-context.js`: fragment parsing, history cleanup, resolver call, safe DOM rendering.
- Modify `src/main.js`: pricing-service lifecycle setup.
- Modify `src/config/analytics-events.js`: allow `private_pricing_opened` with existing safe `status` and `tier` properties.
- Modify `src/styles/pages.css`: four/two/one grid and premium/recommended/private-context states.
- Create `tests/private-pricing-context.test.mjs`: migration, validation, handlers, privacy, and fixed-price contracts.
- Modify `tests/e2e/public-routes.spec.mjs`: successful and unavailable private-link rendering plus grid assertions.
- Modify `docs/IMPLEMENTATION_STATUS.md` and `docs/FINAL_HANDOFF.md`: truthful local and hosted evidence.

---

### Task 1: Hash-only private pricing data model

**Files:**
- Create: `supabase/migrations/202607180005_private_pricing_contexts.sql`
- Create: `tests/private-pricing-context.test.mjs`

**Interfaces:**
- Produces `public.issue_accessrevamp_pricing_context(text,text,text,text,text,timestamptz,uuid) returns jsonb`.
- Produces `public.revoke_accessrevamp_pricing_context(uuid,uuid,text) returns void`.
- Produces `public.resolve_accessrevamp_pricing_context(text,text) returns table(customer_label text, website_url text, scope_summary text, recommended_tier text, expires_at timestamptz)`.

- [ ] **Step 1: Add migration contract tests without running them**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/202607180005_private_pricing_contexts.sql', import.meta.url), 'utf8');

test('private pricing tokens are hash-only, expiring, revocable, indexed, and service-only', () => {
  assert.match(migration, /create table public\.private_pricing_contexts/i);
  assert.match(migration, /token_hash text not null unique/i);
  assert.doesNotMatch(migration, /raw_token\s+text/i);
  assert.match(migration, /gen_random_bytes\(32\)/i);
  assert.match(migration, /digest\(raw_token,'sha256'\)/i);
  assert.match(migration, /status in \('active','revoked','expired'\)/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\.private_pricing_contexts from public,anon,authenticated/i);
  assert.match(migration, /grant all on table public\.private_pricing_contexts to service_role/i);
});

test('pricing resolution is rate-limited and returns only customer-facing fields', () => {
  assert.match(migration, /private_pricing_resolution_limits/i);
  assert.match(migration, /attempt_count >= 20/i);
  assert.match(migration, /returns table\(customer_label text,website_url text,scope_summary text,recommended_tier text,expires_at timestamptz\)/i);
  assert.doesNotMatch(migration, /returns table\([^)]*internal_reference/is);
});
```

- [ ] **Step 2: Create constrained tables and grants**

```sql
create table public.private_pricing_contexts (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  customer_label text not null check (char_length(trim(customer_label)) between 1 and 120),
  website_url text not null check (website_url ~ '^https://'),
  scope_summary text not null check (char_length(trim(scope_summary)) between 20 and 800),
  recommended_tier text not null check (recommended_tier in ('free_snapshot','homepage_reveal','complete_revamp','cinematic_scroll')),
  internal_reference text check (internal_reference is null or char_length(internal_reference) <= 240),
  status text not null default 'active' check (status in ('active','revoked','expired')),
  expires_at timestamptz not null check (expires_at > created_at),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_viewed_at timestamptz,
  check ((status = 'active' and revoked_at is null) or (status <> 'active'))
);
create index private_pricing_contexts_active_expiry_idx on public.private_pricing_contexts (expires_at) where status = 'active';
alter table public.private_pricing_contexts enable row level security;
revoke all on table public.private_pricing_contexts from public,anon,authenticated;
grant all on table public.private_pricing_contexts to service_role;
```

- [ ] **Step 3: Add rate-limit state and the three service-only RPCs**

The issue RPC must verify `accessrevamp_operators`, create a Base64URL token from `gen_random_bytes(32)`, store `encode(digest(raw_token,'sha256'),'hex')`, write `pricing_context_issued` to `accessrevamp_audit_log`, and return `jsonb_build_object('id',context_id,'token',raw_token,'expiresAt',p_expires_at)`.

The revoke RPC must lock the row, set `status='revoked'`, set `revoked_at=now()`, write `pricing_context_revoked`, and return no token.

The resolver RPC must increment a keyed 15-minute counter transactionally, raise `pricing context rate limit exceeded` on attempt 21, expire stale active rows, return only the five declared customer-facing fields for active matching hashes, update `last_viewed_at`, and write `pricing_context_viewed` without the token or customer data.

```sql
revoke all on function public.issue_accessrevamp_pricing_context(text,text,text,text,text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.issue_accessrevamp_pricing_context(text,text,text,text,text,timestamptz,uuid) to service_role;
revoke all on function public.revoke_accessrevamp_pricing_context(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.revoke_accessrevamp_pricing_context(uuid,uuid,text) to service_role;
revoke all on function public.resolve_accessrevamp_pricing_context(text,text) from public,anon,authenticated;
grant execute on function public.resolve_accessrevamp_pricing_context(text,text) to service_role;
```

- [ ] **Step 4: Commit the database contract**

```powershell
git add supabase/migrations/202607180005_private_pricing_contexts.sql tests/private-pricing-context.test.mjs
git commit -m "feat: model private pricing contexts"
```

---

### Task 2: Operator issuance and private resolver boundaries

**Files:**
- Modify: `netlify/functions/_shared/validation.mjs`
- Create: `netlify/functions/operator-pricing-context.mjs`
- Create: `netlify/functions/pricing-context.mjs`
- Modify: `worker/index.ts`
- Modify: `tests/private-pricing-context.test.mjs`

**Interfaces:**
- Consumes Task 1 RPCs.
- Produces `POST /.netlify/functions/operator-pricing-context` with `issue` and `revoke` actions.
- Produces `POST /.netlify/functions/pricing-context` accepting `{ token }` and returning `{ context }`.

- [ ] **Step 1: Add strict validation contracts without running them**

```js
export const privatePricingIssueSchema = z.object({
  action: z.literal('issue'),
  customerLabel: z.string().trim().min(1).max(120),
  websiteUrl: z.string().trim().url().refine((value) => new URL(value).protocol === 'https:'),
  scopeSummary: z.string().trim().min(20).max(800),
  recommendedTier: z.enum(['free_snapshot','homepage_reveal','complete_revamp','cinematic_scroll']),
  internalReference: z.string().trim().max(240).optional().default(''),
  expiresAt: z.string().datetime({ offset: true }),
}).strict();

export const privatePricingRevokeSchema = z.object({
  action: z.literal('revoke'), contextId: z.string().uuid(), reason: z.string().trim().min(8).max(500),
}).strict();

export const privatePricingResolveSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
}).strict();

export const privatePricingActionSchema = z.discriminatedUnion('action', [
  privatePricingIssueSchema,
  privatePricingRevokeSchema,
]);
```

Add assertions that HTTP issue requires an allowlisted confirmed operator, returns a fragment URL, never returns `token_hash`, and that resolver failures for unknown/expired/revoked records are indistinguishable.

- [ ] **Step 2: Implement operator issue/revoke function**

```js
export default async (request) => {
  try {
    assertMethod(request, 'POST'); assertSameOrigin(request); assertJsonSize(request);
    const admin = getSupabaseAdmin();
    const operator = await requireOperator(request, admin);
    const input = privatePricingActionSchema.parse(await readJsonBody(request));
    if (input.action === 'revoke') {
      const { error } = await admin.rpc('revoke_accessrevamp_pricing_context', {
        p_context_id: input.contextId, p_operator_id: operator.id, p_reason: input.reason,
      });
      if (error) throw error;
      return json({ ok: true });
    }
    const { data, error } = await admin.rpc('issue_accessrevamp_pricing_context', {
      p_customer_label: input.customerLabel, p_website_url: input.websiteUrl,
      p_scope_summary: input.scopeSummary, p_recommended_tier: input.recommendedTier,
      p_internal_reference: input.internalReference || null, p_expires_at: input.expiresAt,
      p_operator_id: operator.id,
    });
    if (error) throw error;
    const base = new URL(process.env.PUBLIC_SITE_URL || request.url);
    return json({ id: data.id, expiresAt: data.expiresAt, shareUrl: `${base.origin}/pricing#quote=${data.token}` }, 201);
  } catch (error) { return handleError(error); }
};
```

- [ ] **Step 3: Implement resolver function**

```js
export default async (request) => {
  try {
    assertMethod(request, 'POST'); assertSameOrigin(request); assertJsonSize(request);
    const { token } = privatePricingResolveSchema.parse(await readJsonBody(request));
    const secret = process.env.CONTACT_RATE_LIMIT_SECRET;
    if (!secret || secret.length < 24) throw new HttpError(503, 'Private pricing context is unavailable.');
    const rateKey = createHmac('sha256', secret).update(requestIp(request)).digest('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const { data, error } = await getSupabaseAdmin().rpc('resolve_accessrevamp_pricing_context', {
      p_token_hash: tokenHash, p_rate_key: rateKey,
    });
    if (error && /rate limit/i.test(error.message)) return json({ error: 'Too many requests.' }, 429, { 'cache-control': 'no-store' });
    if (error) throw error;
    const context = Array.isArray(data) ? data[0] : data;
    if (!context) return json({ error: 'Private pricing context is unavailable.' }, 404, { 'cache-control': 'no-store' });
    return json({ context }, 200, { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' });
  } catch (error) { return handleError(error); }
};
```

- [ ] **Step 4: Commit server boundaries**

Route only `/.netlify/functions/pricing-context` and `/.netlify/functions/operator-pricing-context` through their handlers in `worker/index.ts`; every other request continues to `vinext/server/app-router-entry`.

```powershell
git add netlify/functions/_shared/validation.mjs netlify/functions/operator-pricing-context.mjs netlify/functions/pricing-context.mjs worker/index.ts tests/private-pricing-context.test.mjs
git commit -m "feat: add private pricing link boundaries"
```

---

### Task 3: Four-card pricing layout and safe personalization

**Files:**
- Modify: `src/components/cards.js`
- Modify: `src/pages/pricing.js`
- Create: `src/services/pricing-context.js`
- Modify: `src/main.js`
- Modify: `src/config/analytics-events.js`
- Modify: `src/styles/pages.css`
- Modify: `tests/private-pricing-context.test.mjs`
- Modify: `tests/e2e/public-routes.spec.mjs`

**Interfaces:**
- Consumes `POST /.netlify/functions/pricing-context` from Task 2.
- Produces `setupPricingContext(root = document): (() => void) | undefined`.

- [ ] **Step 1: Add DOM and styling contracts without running them**

Assert that all cards expose `data-plan-tier`, pricing uses `pageClass: 'pricing-page'`, the private panel begins hidden, analytics permits `private_pricing_opened`, and CSS contains four/two/one columns plus a scoped cinematic selector.

```js
assert.match(cards, /data-plan-tier="\$\{escapeHtml\(plan\.key\)\}"/);
assert.match(pricing, /data-private-pricing-context hidden/);
assert.match(css, /\.pricing-page \.pricing-grid\s*\{[^}]*repeat\(4,/s);
assert.match(css, /\.pricing-page \.plan-card\[data-plan-tier="cinematic_scroll"\]/);
```

- [ ] **Step 2: Add stable card and page hooks**

Change the article opening tag to:

```js
return `<article data-plan-tier="${escapeHtml(plan.key)}" class="plan-card${featured ? ' plan-card--featured' : ''}${compact ? ' plan-card--compact' : ''}">`;
```

Add this before the card section and pass the pricing page class:

```html
<section class="private-pricing-context" data-private-pricing-context hidden aria-live="polite">
  <div class="container-wide private-pricing-context__inner">
    <span class="eyebrow">Private pricing context</span>
    <h2 data-private-customer></h2>
    <p data-private-scope></p>
    <p class="privacy-note">Prepared for <a data-private-website rel="noopener noreferrer"></a>. Context expires <span data-private-expiry></span>; final scope still requires human confirmation.</p>
  </div>
</section>
```

- [ ] **Step 3: Implement safe fragment resolver and DOM enhancement**

```js
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
export function readPrivatePricingToken(locationValue = location) {
  const token = new URLSearchParams(locationValue.hash.slice(1)).get('quote') || '';
  return TOKEN.test(token) ? token : token ? null : '';
}

export function setupPricingContext(root = document) {
  const host = root.querySelector('[data-private-pricing-context]');
  if (!host) return undefined;
  const token = readPrivatePricingToken();
  if (location.hash) history.replaceState(history.state, '', `${location.pathname}${location.search}`);
  if (token === '') return undefined;
  let active = true;
  const showFailure = () => { host.hidden = false; host.dataset.state = 'unavailable'; host.querySelector('[data-private-customer]').textContent = 'Private context unavailable'; host.querySelector('[data-private-scope]').textContent = 'The standard one-time prices remain available below.'; };
  if (token === null) { showFailure(); return undefined; }
  fetch('/.netlify/functions/pricing-context', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) })
    .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body.context; })
    .then((context) => {
      if (!active) return;
      host.hidden = false; host.dataset.state = 'ready';
      host.querySelector('[data-private-customer]').textContent = `Prepared for ${context.customer_label}`;
      host.querySelector('[data-private-scope]').textContent = context.scope_summary;
      const link = host.querySelector('[data-private-website]'); const url = new URL(context.website_url);
      link.href = url.href; link.textContent = url.hostname.replace(/^www\./, '');
      host.querySelector('[data-private-expiry]').textContent = new Date(context.expires_at).toLocaleDateString();
      const card = root.querySelector(`[data-plan-tier="${CSS.escape(context.recommended_tier)}"]`);
      card?.classList.add('plan-card--private-recommended');
      card?.setAttribute('aria-label', `${card.querySelector('h3')?.textContent || 'Plan'} — recommended for this private context`);
      track('private_pricing_opened', { status: 'ready', tier: context.recommended_tier });
    }).catch(() => { if (active) { showFailure(); track('private_pricing_opened', { status: 'unavailable' }); } });
  return () => { active = false; };
}
```

Register `setupPricingContext()` only when `pathname === '/pricing'`, and add `private_pricing_opened` to the analytics event allowlist.

- [ ] **Step 4: Implement the approved visual system**

```css
.pricing-page .pricing-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; }
.pricing-page .plan-card { min-width: 0; }
.pricing-page .plan-card[data-plan-tier="cinematic_scroll"] { color: #fff; border-color: color-mix(in srgb, var(--mint) 54%, #fff); background: linear-gradient(145deg, var(--ultramarine), var(--ink) 78%); box-shadow: 0 24px 64px rgba(27,48,221,.24), inset 0 0 0 1px rgba(255,255,255,.1); }
.pricing-page .plan-card[data-plan-tier="cinematic_scroll"] :is(h3,p,li,.plan-price span,.sandbox-badge) { color: #fff; }
.pricing-page .plan-card[data-plan-tier="cinematic_scroll"] .kicker { color: var(--mint); }
.pricing-page .plan-card[data-plan-tier="cinematic_scroll"] .plan-price strong { color: var(--sun); }
.pricing-page .plan-card[data-plan-tier="cinematic_scroll"] .button { background: var(--sun); color: var(--ink); }
.pricing-page .plan-card--private-recommended { outline: 3px solid var(--mint); outline-offset: 4px; }
.private-pricing-context { padding: 2rem 0; border-bottom: 1px solid var(--line); background: color-mix(in srgb, var(--mint) 16%, var(--surface)); }
.private-pricing-context__inner { display: grid; grid-template-columns: .55fr 1fr; gap: 1rem 3rem; align-items: start; }
.private-pricing-context__inner .eyebrow { grid-column: 1 / -1; }
@media (max-width: 1000px) { .pricing-page .pricing-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } .pricing-page .pricing-grid .plan-card:last-child { grid-column: auto; } }
@media (max-width: 760px) { .pricing-page .pricing-grid, .private-pricing-context__inner { grid-template-columns: 1fr; } }
@media (forced-colors: active) { .pricing-page .plan-card[data-plan-tier="cinematic_scroll"] { border: 2px solid CanvasText; } }
```

- [ ] **Step 5: Add browser scenarios without running them**

Intercept the resolver response, visit `/pricing#quote=<43-character fixture token>`, assert the fragment is erased, the private label and scope are visible, all four cards share one top row at desktop, the recommended card is announced, and no token appears in analytics event detail. Add 2×2 and one-column bounding-box assertions at tablet and 320px.

- [ ] **Step 6: Commit the complete browser experience**

```powershell
git add src/components/cards.js src/pages/pricing.js src/services/pricing-context.js src/main.js src/config/analytics-events.js src/styles/pages.css tests/private-pricing-context.test.mjs tests/e2e/public-routes.spec.mjs
git commit -m "feat: personalize private pricing links"
```

---

### Task 4: Consolidated verification after implementation

**Files:**
- Modify only files implicated by observed failures.

**Interfaces:**
- Verifies Tasks 1–3 as one finished feature, matching the user's requested execution order.

- [ ] **Step 1: Run targeted source contracts**

Run: `node --test tests/private-pricing-context.test.mjs`

Expected: all private-pricing data, server, UI, and privacy contracts pass.

- [ ] **Step 2: Run the complete source/build/security gate**

```powershell
npm run lint
npm test
npm run build
npm run verify:assets
npm run verify:requirements
npm run quality:budgets
npm run security:local
npm audit --omit=dev --audit-level=high
git diff --check
```

Expected: zero command failures, 0 high/critical dependency findings, 0 secret findings, and all existing catalog/payment contracts unchanged.

- [ ] **Step 3: Run all browser engines**

Run: `npx playwright test`

Expected: Chromium, Firefox, and WebKit pass public pricing, private context, responsive grid, keyboard, overflow, and axe checks.

- [ ] **Step 4: Update evidence documentation and commit**

Record exact counts and any nonblocking moderate advisories in `docs/IMPLEMENTATION_STATUS.md` and `docs/FINAL_HANDOFF.md`.

```powershell
git add docs/IMPLEMENTATION_STATUS.md docs/FINAL_HANDOFF.md
git commit -m "docs: record private pricing verification"
```

---

### Task 5: Save, publish, verify, and open Sites version

**Files:**
- No source edits unless deployment evidence contradicts the local build.

**Interfaces:**
- Consumes a clean verified Git commit.
- Produces a saved Sites version and successful public deployment.

- [ ] **Step 1: Confirm exact clean release state**

```powershell
git status --short
git rev-parse HEAD
```

Expected: empty status and one exact release SHA.

- [ ] **Step 2: Push that exact source state to the existing Sites project**

Reuse project `appgprj_6a5bbdf25c10819181053c8d756175ae`; never create a second site. Use short-lived per-command authentication and do not persist the token.

- [ ] **Step 3: Save and deploy one new Sites version**

Save with the exact pushed commit SHA, deploy the returned version ID, and poll the returned deployment ID until `succeeded` or `failed`.

- [ ] **Step 4: Verify and open the public page**

Confirm the production URL returns HTTP 200, visually inspect `/pricing` for the four-card row and premium $250 treatment, then open it in Chrome as the deliverable tab. Do not activate migrations, live payments, outreach, or a custom domain.

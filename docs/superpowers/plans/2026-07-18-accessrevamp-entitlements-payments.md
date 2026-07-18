# AccessRevamp Entitlements and Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement server-verified cumulative entitlements, atomic upgrade reservations, exact Stripe test checkout selection, idempotent webhook fulfillment, and refund dependency handling.

**Architecture:** Supabase is the source of truth for paid value and access. A security-definer transaction RPC locks one user’s entitlement and creates a short-lived reservation; Netlify creates Stripe Checkout only from that reservation. Webhooks call one atomic reconciliation RPC and never trust success URLs or browser metadata.

**Tech Stack:** PostgreSQL/Supabase migrations and RLS, Netlify Functions, Stripe Node SDK 22, Zod, Node test runner.

## Global Constraints

- Implement entitlement migrations before checkout behavior changes.
- Exact paid tier names are Homepage Reveal, Complete Website Revamp, and Cinematic Scroll Site.
- Browser checkout input is exactly `{targetTier, requestId}` plus an authenticated bearer token.
- Required metadata fields: `user_id`, `reservation_id`, `from_tier`, `to_tier`, `gross_cents`, `credit_cents`, `net_cents`, `source_entitlement_id`, `checkout_request_id`.
- Stripe remains test mode; actual test Price IDs are server secrets.
- Webhook verification covers mode, payment state, one line item, quantity, price, currency, amount, user, reservation, metadata, and unused reservation.
- Full and partial refunds must recalculate paid value and create operator review for dependent upgrades.
- Never grant access from a redirect, client price, typed email, local storage, or query string.
- Exact demo disclosure: “Original working demo — not a client engagement.”

---

## File responsibility map

- `supabase/migrations/202607180002_add_tier_entitlements.sql`: catalog, entitlements, reservations, dependencies, constraints, grants, and RLS.
- `supabase/migrations/202607180003_add_payment_rpcs.sql`: reservation, fulfillment, expiry, and refund reconciliation functions.
- `netlify/functions/_shared/auth.mjs`: confirmed Supabase bearer-token verification.
- `netlify/functions/_shared/checkout-contract.mjs`: reservation/metadata validation and Stripe session arguments.
- `netlify/functions/create-checkout.mjs`: authenticated reservation then Stripe session creation.
- `netlify/functions/stripe-webhook.mjs`: signature verification and event routing.
- `netlify/functions/entitlement-quote.mjs`: authenticated read-only upgrade quote.
- `tests/entitlement-migration.test.mjs`: SQL constraints, grants, RLS, and safe functions.
- `tests/checkout-contract.test.mjs`: request, quote, metadata, and price-selection contracts.
- `tests/payment-matrix.test.mjs`: all purchase, race, tamper, retry, and refund cases.

### Task 1: Tier, entitlement, reservation, and refund-dependency schema

**Files:**
- Create: `supabase/migrations/202607180002_add_tier_entitlements.sql`
- Create: `tests/entitlement-migration.test.mjs`
- Modify: `docs/DATA_MODEL.md`

**Interfaces:**
- Produces tables `tier_catalog`, `entitlements`, `upgrade_reservations`, and `refund_dependencies` with exact approved columns and states.
- Produces one active entitlement per user and one live reservation per user/target transition.

- [x] **Step 1: Write failing structural and security tests**

```js
for (const table of ['tier_catalog','entitlements','upgrade_reservations','refund_dependencies']) {
  assert.match(sql, new RegExp(`create table[^;]+public\\.${table}`, 'i'));
  assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
}
assert.match(sql, /unique[^;]+entitlements[^;]+user_id/i);
assert.match(sql, /reserved[\s\S]*checkout_created[\s\S]*paid[\s\S]*expired[\s\S]*canceled[\s\S]*reversed/i);
assert.doesNotMatch(sql, /grant\s+select.*upgrade_reservations.*authenticated/i);
```

- [x] **Step 2: Run and confirm the migration-missing failure**

Run: `node --test tests/entitlement-migration.test.mjs`

Expected: FAIL with `ENOENT`.

- [x] **Step 3: Write the forward-only schema migration**

Seed only the non-secret tier keys/ranks/list prices. Keep Stripe Price references nullable and service-only, or omit persisted Price IDs in favor of server environment mapping. Add check constraints for nonnegative monetary values, `net_cents = gross_cents - credit_cents`, ordered tiers, valid states, 30-minute expiry, and dependency resolution fields.

Revoke all browser access to reservations, dependencies, and internal catalog fields. Customer entitlement visibility must use an own-user policy exposing no Stripe reference.

- [x] **Step 4: Verify migration text and local database when available**

Run: `node --test tests/entitlement-migration.test.mjs && supabase db reset`

Expected: tests PASS; local reset applies all migrations. If the Supabase CLI/local runtime is unavailable, record that exact external/tooling gap and do not claim migration execution.

- [x] **Step 5: Commit the schema**

```bash
git add supabase/migrations/202607180002_add_tier_entitlements.sql tests/entitlement-migration.test.mjs docs/DATA_MODEL.md
git commit -m "feat: add cumulative entitlement schema"
```

### Task 2: Serialized reservation and quote RPC

**Files:**
- Create: `supabase/migrations/202607180003_add_payment_rpcs.sql`
- Modify: `tests/entitlement-migration.test.mjs`
- Create: `tests/payment-rpc-contract.test.mjs`
- Modify: `docs/PAYMENTS.md`

**Interfaces:**
- Produces service-only RPC `reserve_accessrevamp_upgrade(p_user_id uuid, p_target_tier_key text, p_request_id uuid)`.
- Returns one row: reservation ID, from/to tiers, gross/credit/net cents, source entitlement ID, expiry, and idempotent existing/new marker.

- [x] **Step 1: Write failing function-contract tests**

```js
assert.match(sql, /pg_advisory_xact_lock|for update/i);
assert.match(sql, /reserve_accessrevamp_upgrade/i);
assert.match(sql, /paid[\s\S]*refunded/i);
assert.match(sql, /set search_path = pg_catalog/i);
assert.match(sql, /revoke all on function public\.reserve_accessrevamp_upgrade/i);
assert.match(sql, /grant execute[^;]+service_role/i);
```

- [x] **Step 2: Run and confirm the missing-RPC failure**

Run: `node --test tests/payment-rpc-contract.test.mjs`

Expected: FAIL because the migration is absent.

- [x] **Step 3: Implement serialized quote/reservation logic**

Lock by user ID, expire prior stale reservations, reuse an identical unexpired request ID, reject downgrade/same-tier no-charge checkout, calculate the highest nonrefunded paid value, clamp credit to the target price, and insert exactly one reservation. The function must not accept or return arbitrary Stripe Price IDs.

- [x] **Step 4: Exercise the database race contract**

Run: `node --test tests/payment-rpc-contract.test.mjs && supabase test db`

Expected: contract tests PASS; SQL tests prove two concurrent reservations cannot consume the same base credit. Record an unavailable local Supabase runtime as unverified, not passed.

- [x] **Step 5: Commit the reservation RPC**

```bash
git add supabase/migrations/202607180003_add_payment_rpcs.sql tests/payment-rpc-contract.test.mjs tests/entitlement-migration.test.mjs docs/PAYMENTS.md
git commit -m "feat: serialize upgrade reservations"
```

### Task 3: Guarded Stripe test catalog synchronization

**Files:**
- Create: `scripts/stripe/sync-test-catalog.mjs`
- Create: `scripts/stripe/verify-test-catalog.mjs`
- Create: `tests/stripe-test-catalog.test.mjs`
- Modify: `package.json`
- Modify: `docs/PAYMENTS.md`

**Interfaces:**
- Produces `npm run stripe:test-catalog:sync` and `npm run stripe:test-catalog:verify`.
- Produces six active one-time USD test prices without writing IDs to source or stdout.

- [x] **Step 1: Write failing test-mode, product-name, amount, and redaction tests**

```js
for (const [name, amount] of EXPECTED_PRICES) assert.deepEqual(catalogDefinition[name].unitAmount, amount);
assert.match(syncSource, /sk_test_/);
assert.doesNotMatch(syncSource, /sk_live_|livemode:\s*true/i);
assert.doesNotMatch(syncSource, /console\.log\([^)]*(price|secret|product\.id)/i);
```

- [x] **Step 2: Run and confirm the missing synchronizer failure**

Run: `node --test tests/stripe-test-catalog.test.mjs`

Expected: FAIL because the guarded scripts do not exist.

- [x] **Step 3: Implement idempotent test-only product/price synchronization**

Refuse any key not starting `sk_test_`. Upsert or reuse test products named Homepage Reveal, Complete Website Revamp, and Cinematic Scroll Site. Create/reuse six one-time USD prices at 5000, 20000, 25000, 15000, 20000, and 5000 cents using stable lookup keys. Archive only the stale AccessRevamp $199 test price after verifying it is not used by an active session; do not touch unrelated Stripe objects. Print names, amounts, mode, and configured/missing environment variable names only—never IDs or secrets.

- [x] **Step 4: Verify the script contract and synchronize only with explicit test credentials**

Run: `node --test tests/stripe-test-catalog.test.mjs && npm run stripe:test-catalog:verify`

Expected: contract PASS; remote verification confirms `livemode=false` and all six amounts when a test key exists. If credentials are absent, the script exits with a clear unmet-prerequisite status and the project does not claim remote catalog completion.

- [x] **Step 5: Commit the guarded test catalog tools**

```bash
git add scripts/stripe tests/stripe-test-catalog.test.mjs package.json package-lock.json docs/PAYMENTS.md
git commit -m "feat: add guarded Stripe test catalog sync"
```

### Task 4: Confirmed-user authentication and entitlement quote endpoint

**Files:**
- Create: `netlify/functions/_shared/auth.mjs`
- Create: `netlify/functions/entitlement-quote.mjs`
- Modify: `netlify/functions/_shared/validation.mjs`
- Create: `tests/auth-boundary.test.mjs`
- Create: `tests/entitlement-quote.test.mjs`

**Interfaces:**
- Produces: `requireConfirmedUser(request, supabaseAdmin)` returning `{id, email}` from verified token claims.
- Produces: `POST /.netlify/functions/entitlement-quote` accepting `{targetTier}` and returning list/credit/due/resulting tier without a Stripe ID.

- [x] **Step 1: Write failing authentication and response-shape tests**

```js
assert.deepEqual(Object.keys(validQuote).sort(), ['creditCents','dueNowCents','listPriceCents','resultingTier','targetTier']);
await assert.rejects(() => requireConfirmedUser(requestWithoutBearer, admin), /authentication required/i);
await assert.rejects(() => requireConfirmedUser(unconfirmedRequest, admin), /confirmed/i);
```

- [x] **Step 2: Run and confirm missing-module failures**

Run: `node --test tests/auth-boundary.test.mjs tests/entitlement-quote.test.mjs`

Expected: FAIL for missing modules.

- [x] **Step 3: Implement strict same-origin, size, schema, bearer-token, and confirmed-email validation**

Use Supabase Admin `auth.getUser(token)`; never accept an email from the body. Return 401 for absent/invalid sessions, 403 for unconfirmed identity, 409 for ineligible transition, 422 for schema errors, and a redacted 503 for configuration absence.

- [x] **Step 4: Verify auth and quote tests**

Run: `node --test tests/auth-boundary.test.mjs tests/entitlement-quote.test.mjs tests/validation.test.mjs`

Expected: all tests PASS and response fixtures contain no email, token, reservation ID, or Stripe ID.

- [x] **Step 5: Commit the identity boundary**

```bash
git add netlify/functions/_shared netlify/functions/entitlement-quote.mjs tests/auth-boundary.test.mjs tests/entitlement-quote.test.mjs tests/validation.test.mjs
git commit -m "feat: add confirmed entitlement quote boundary"
```

### Task 5: Reservation-backed Stripe Checkout

**Files:**
- Create: `netlify/functions/_shared/checkout-contract.mjs`
- Modify: `netlify/functions/create-checkout.mjs`
- Modify: `src/services/checkout.js`
- Create: `tests/checkout-contract.test.mjs`
- Modify: `tests/customer-experience.test.mjs`

**Interfaces:**
- Consumes: `requireConfirmedUser`, `reserve_accessrevamp_upgrade`, and `getStripePriceForQuote`.
- Produces: checkout response `{url}` only; client body `{targetTier, requestId}` only.

- [ ] **Step 1: Write failing request, metadata, and no-fallback tests**

```js
assert.deepEqual(checkoutSchema.parse({targetTier:'complete_revamp',requestId:UUID}), {targetTier:'complete_revamp',requestId:UUID});
assert.deepEqual(Object.keys(buildMetadata(reservation, userId, requestId)).sort(), REQUIRED_METADATA_KEYS.sort());
assert.doesNotMatch(clientSource, /href|checkoutUrl|fallback/i);
```

- [ ] **Step 2: Run and confirm the stale anonymous checkout failure**

Run: `node --test tests/checkout-contract.test.mjs tests/customer-experience.test.mjs`

Expected: FAIL because current checkout sends `planKey` and has a direct-link fallback.

- [x] **Step 3: Implement reservation-backed session creation**

Authenticate, reserve atomically, select the exact environment Price ID for the server-calculated transition, create one line item with quantity one, require billing address, disable client promotions, use 30-minute expiry and request-scoped idempotency, copy all nine metadata fields to Checkout Session and PaymentIntent, persist `checkout_session_id`, and return only a validated Stripe-hosted URL.

The client must require an authenticated session, disable duplicate clicks, announce progress/errors, and never navigate to a configured payment link after server failure.

- [ ] **Step 4: Verify checkout and bundle secrecy**

Run: `node --test tests/checkout-contract.test.mjs tests/customer-experience.test.mjs && npm run build && rg -n "price_|book\.stripe\.com|STRIPE_.*PRICE" dist src`

Expected: tests PASS and no secret Price identifiers or direct payment links exist in browser source/build.

- [x] **Step 5: Commit checkout hardening**

```bash
git add netlify/functions src/services/checkout.js tests/checkout-contract.test.mjs tests/customer-experience.test.mjs
git commit -m "feat: create reservation-backed checkout"
```

### Task 6: Atomic webhook fulfillment and retry recovery

**Files:**
- Modify: `supabase/migrations/202607180003_add_payment_rpcs.sql`
- Modify: `netlify/functions/stripe-webhook.mjs`
- Modify: `tests/stripe-webhook-recovery.test.mjs`
- Create: `tests/payment-matrix.test.mjs`

**Interfaces:**
- Produces service-only RPC `fulfill_accessrevamp_checkout(jsonb)` returning order, entitlement, and project IDs.
- Consumes the nine metadata fields and server catalog transition.

- [ ] **Step 1: Write failing fulfillment verification and replay tests**

```js
for (const field of REQUIRED_METADATA_KEYS) assert.match(webhookSource, new RegExp(field));
for (const event of ['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired']) assert.match(webhookSource, new RegExp(event.replaceAll('.', '\\.')));
assert.match(rpcSql, /insert into public\.orders[\s\S]*update public\.upgrade_reservations[\s\S]*insert into public\.entitlements[\s\S]*insert into public\.customer_projects/i);
```

- [ ] **Step 2: Run and confirm missing event/reservation checks**

Run: `node --test tests/stripe-webhook-recovery.test.mjs tests/payment-matrix.test.mjs`

Expected: FAIL because expiration, reservations, entitlements, and exact metadata are absent.

- [x] **Step 3: Implement retrieve-expand-verify and one-RPC reconciliation**

Deduplicate event IDs but retry recorded/unprocessed events. Retrieve and expand the session. Verify expected test/live mode, `payment` mode, paid status for success, one line item, quantity one, exact transition Price, USD, net amount, user, reservation, metadata equality, reservation state, and expiry rules. RPC order is event/order/reservation/entitlement/project/audit, with exactly-once constraints.

Async failure and expiration mark reservations terminal without granting access. Errors leave the Stripe event retryable and return a non-2xx safe response.

- [ ] **Step 4: Run the purchase, tamper, race, and recovery matrix**

Run: `node --test tests/payment-matrix.test.mjs tests/stripe-webhook-recovery.test.mjs`

Expected: all full/upgrade arithmetic, repeated/reused/concurrent, tampered, wrong price/amount/currency, expiry, async, replay, and retry cases PASS.

- [ ] **Step 5: Commit atomic fulfillment**

```bash
git add supabase/migrations/202607180003_add_payment_rpcs.sql netlify/functions/stripe-webhook.mjs tests/payment-matrix.test.mjs tests/stripe-webhook-recovery.test.mjs
git commit -m "feat: reconcile checkout atomically"
```

### Task 7: Full/partial refund dependencies

**Files:**
- Modify: `supabase/migrations/202607180003_add_payment_rpcs.sql`
- Modify: `netlify/functions/stripe-webhook.mjs`
- Create: `tests/refund-dependencies.test.mjs`
- Modify: `docs/PAYMENTS.md`
- Modify: `docs/REFUND_AND_CANCELLATION_POLICY.md`

**Interfaces:**
- Produces service-only RPC `reconcile_accessrevamp_refund(jsonb)`.
- Produces dependency states `open`, `resolved`, and `dismissed`, with operator/audit evidence.

- [ ] **Step 1: Write failing full, partial, dependent, and duplicate refund tests**

```js
for (const scenario of ['full base refund','partial refund','dependent upgrade','duplicate refund event']) {
  await t.test(scenario, () => assertRefundFixture(scenario));
}
assert.match(sql, /stripe_refund_id[\s\S]*refund_amount_cents[\s\S]*operator_id[\s\S]*refund_dependencies/i);
```

- [ ] **Step 2: Run and confirm the missing reconciliation failure**

Run: `node --test tests/refund-dependencies.test.mjs`

Expected: FAIL because refund event routing and RPC are absent.

- [x] **Step 3: Implement refund event normalization and entitlement recomputation**

Handle `charge.refunded` and the selected `refund.updated` terminal path without double counting. Record refund ID, amount, reason, operator/system actor, and timestamps. Recompute effective paid value. If later entitlement used refunded credit, create an operator-review dependency and suspend/flag according to disclosed terms; never silently keep unsupported access.

- [ ] **Step 4: Verify refund and full payment matrices**

Run: `node --test tests/refund-dependencies.test.mjs tests/payment-matrix.test.mjs && npm run check`

Expected: all tests and build PASS.

- [ ] **Step 5: Commit refund handling**

```bash
git add supabase/migrations/202607180003_add_payment_rpcs.sql netlify/functions/stripe-webhook.mjs tests/refund-dependencies.test.mjs docs/PAYMENTS.md docs/REFUND_AND_CANCELLATION_POLICY.md
git commit -m "feat: reconcile refund dependencies"
```

### Task 8: Payment verification checkpoint

**Files:**
- Modify: `docs/IMPLEMENTATION_STATUS.md`
- Modify: `docs/PAYMENTS.md`

**Interfaces:**
- Consumes: Tasks 1–7.
- Produces: exact code-only, local-Supabase, and Stripe-test evidence with unverified external steps separated.

- [ ] **Step 1: Run all local payment checks**

Run: `npm run check && npm audit --omit=dev --audit-level=high && git diff --check`

Expected: PASS and zero high-or-greater production dependency findings.

- [ ] **Step 2: Run Stripe CLI test events only when authenticated test configuration exists**

Run: `stripe listen --forward-to http://localhost:8888/.netlify/functions/stripe-webhook`

Expected: test-mode webhook forwarding. If Stripe CLI/test secrets are absent, record the exact missing prerequisite and do not claim E2E payment verification.

- [ ] **Step 3: Record exact catalog, mode, migrations, matrices, and external gaps**

Document which assertions are unit/contract/local-integration/Stripe-E2E. Confirm no live object or live transaction was created.

- [ ] **Step 4: Commit the payment checkpoint**

```bash
git add docs/PAYMENTS.md docs/IMPLEMENTATION_STATUS.md
git commit -m "docs: record payment verification status"
```

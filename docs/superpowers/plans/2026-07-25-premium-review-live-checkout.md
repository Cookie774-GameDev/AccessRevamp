# Premium Review and Live Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present each paid plan as a premium project package, expose working portfolio proof, restore live Stripe Checkout, and make checkout readiness explicit.

**Architecture:** Keep the existing authenticated order-draft → server-created Stripe Checkout Session → signed webhook flow. Add a small client-side checkout-readiness module and reshape only the review rendering and presentation layer. Activate the existing database kill switch only after all live payment gates pass.

**Tech Stack:** Vanilla ES modules, CSS, Node test runner, Supabase Postgres, Stripe Checkout Sessions API `2026-06-24.dahlia`, Cloudflare Workers, Playwright.

## Global Constraints

- Stripe Checkout remains hosted at `checkout.stripe.com`.
- No Stripe secret or price identifier enters browser code.
- Signed webhook fulfillment remains authoritative.
- Portfolio opens in a new tab with `rel="noopener noreferrer"`.
- An unavailable checkout is visible and actionable, never silent.
- Live checkout stays disabled until secrets, catalog, webhook, incidents, and payment health pass.
- No completed real charge is required for verification.

---

### Task 1: Premium Review Package

**Files:**
- Modify: `tests/checkout-dashboard-polish.test.mjs`
- Modify: `src/services/order-wizard.js`
- Modify: `src/components/order-wizard.js`
- Modify: `src/styles/order-wizard-dark-contrast.css`

**Interfaces:**
- Consumes: `plans[planKey]` with `name`, `displayPrice`, `summary`, and `features`.
- Produces: review markup using `.order-review__folio`, `.order-review__deliverables`, `.order-review__timeline`, and `.order-review__portfolio`.

- [ ] **Step 1: Write the failing structural test**

Assert that the rendered source includes:

```js
assert.match(service, /order-review__folio/);
assert.match(service, /order-review__timeline/);
assert.match(service, /order-review__portfolio/);
assert.match(service, /href="\/portfolio" target="_blank" rel="noopener noreferrer"/);
assert.match(service, /Explore our working websites/);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/checkout-dashboard-polish.test.mjs`

Expected: FAIL because the premium folio, timeline, and portfolio proof markup do not exist.

- [ ] **Step 3: Implement the minimum premium review markup**

Render:

```html
<section class="order-review__folio">
  <header>selected plan and amount due</header>
  <div class="order-review__deliverables">grouped included work</div>
  <ol class="order-review__timeline">Payment secured → direction confirmed → delivery in workspace</ol>
  <a class="order-review__portfolio" href="/portfolio" target="_blank" rel="noopener noreferrer">Explore our working websites</a>
</section>
```

Retain the compact customer and project details and existing legal consent controls.

- [ ] **Step 4: Add scoped responsive presentation**

Use the existing order tokens. Add layered gold borders, restrained folio lighting, strong plan typography, grouped feature rows, responsive one-column behavior below 760px, visible focus styles, and no animation under `prefers-reduced-motion: reduce`.

- [ ] **Step 5: Run focused tests and commit**

Run: `node --test tests/checkout-dashboard-polish.test.mjs tests/order-wizard-theme.test.mjs`

Expected: PASS.

Commit: `git commit -am "Build premium checkout review package"`

---

### Task 2: Explicit Checkout Readiness

**Files:**
- Create: `src/services/checkout-readiness.js`
- Modify: `src/services/order-wizard.js`
- Modify: `src/main.js`
- Modify: `tests/checkout-dashboard-polish.test.mjs`
- Create: `tests/checkout-readiness.test.mjs`

**Interfaces:**
- Produces: `checkoutReadiness(fetchImpl = fetch): Promise<{ ready: boolean }>`
- Produces: `setupCheckoutReadiness(root = document): () => void`
- Consumes: `GET /api/payment-health`, `[data-order-checkout]`, and `[data-checkout-status]`.

- [ ] **Step 1: Write failing behavior tests**

Test:

```js
await assert.deepEqual(await checkoutReadiness(async () => new Response('{"ready":true}', { status: 200 })), { ready: true });
await assert.deepEqual(await checkoutReadiness(async () => new Response('{"ready":false}', { status: 503 })), { ready: false });
await assert.deepEqual(await checkoutReadiness(async () => { throw new Error('offline'); }), { ready: false });
```

Also assert that review markup starts with `data-checkout-ready="checking"` and the health status region exists.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/checkout-readiness.test.mjs tests/checkout-dashboard-polish.test.mjs`

Expected: FAIL because the module and readiness state are missing.

- [ ] **Step 3: Implement readiness preflight**

`checkoutReadiness` performs a same-origin GET with `cache: 'no-store'`, accepts only an exact `{ ready: true }` response with HTTP 200, and maps every other outcome to `{ ready: false }`.

`setupCheckoutReadiness`:

- checks health when the review panel becomes visible;
- sets `data-checkout-ready` to `checking`, `ready`, or `unavailable`;
- disables Checkout until ready;
- displays “Secure checkout ready” or “Payment is temporarily unavailable. Your project details remain on this device.”

- [ ] **Step 4: Bind lifecycle and preserve click locking**

Import and call `setupCheckoutReadiness(app)` from `src/main.js`. Do not change hostname validation, authenticated draft persistence, idempotency, or webhook authority.

- [ ] **Step 5: Run focused tests and commit**

Run: `node --test tests/checkout-readiness.test.mjs tests/checkout-dashboard-polish.test.mjs tests/order-wizard-file-handoff.test.mjs tests/payment-guardrails.test.mjs`

Expected: PASS.

Commit: `git commit -am "Expose checkout readiness before payment"`

---

### Task 3: Verify and Activate Live Checkout

**Files:**
- Modify only if verification requires a durable configuration repair: `supabase/migrations/<generated-name>.sql`
- No browser-visible secrets.

**Interfaces:**
- Consumes: Supabase `payment_runtime_settings`, `stripe_price_catalog`, and `payment_security_incidents`.
- Consumes: Cloudflare secret names and Stripe live webhook configuration.
- Produces: `/api/payment-health` HTTP 200.

- [ ] **Step 1: Verify external gates read-only**

Confirm:

- all required Cloudflare secret names exist;
- six live catalog rows match 5000, 15000, 20000, and 25000-cent approved transitions;
- the Stripe live webhook points to `https://accessrevamp.com/api/stripe-webhook`;
- no unresolved critical incident exists;
- configuration is live-approved.

- [ ] **Step 2: Enable through one guarded SQL update**

Execute:

```sql
update public.payment_runtime_settings
set checkout_enabled = true,
    expected_livemode = true,
    live_payment_approved = true,
    configuration_verified_at = timezone('utc', now()),
    maintenance_reason = null,
    updated_at = timezone('utc', now())
where singleton = true;
```

The existing trigger must reject the update if a required gate is inconsistent.

- [ ] **Step 3: Verify payment health**

Run: `curl -i https://accessrevamp.com/api/payment-health`

Expected: HTTP 200 and exactly `{"ready":true}`.

- [ ] **Step 4: Create a controlled Checkout Session**

Use an authenticated test customer session and a valid saved draft. Confirm `/api/create-checkout` returns one `https://checkout.stripe.com/...` URL. Open it and verify the selected plan and amount without completing payment.

- [ ] **Step 5: Re-check runtime state**

Confirm `last_checkout_created_at` advanced, checkout remains enabled, and no new unresolved critical incident exists.

---

### Task 4: Release Verification and Production

**Files:**
- Modify only for defects discovered by verification.

**Interfaces:**
- Consumes all prior task outputs.
- Produces merged GitHub release and verified Cloudflare production deployment.

- [ ] **Step 1: Run complete local gates**

Run:

```powershell
npm run check
npm run security:local
git diff --check
```

Expected: all pass and no secret findings.

- [ ] **Step 2: Run responsive browser QA**

Verify desktop and 390px mobile:

- premium review hierarchy;
- portfolio opens in a new tab and preserves the form;
- button is enabled only when health is ready;
- button transitions through saving and opening states;
- no horizontal overflow, page errors, or serious accessibility findings.

- [ ] **Step 3: Publish through GitHub**

Commit the final scoped diff, push `agent/premium-live-checkout`, open a PR to `main`, and wait for GitHub and Cloudflare checks.

- [ ] **Step 4: Merge and verify production**

After green checks, merge the PR and confirm:

- `/api/payment-health` returns 200;
- the live review screen renders the premium package and portfolio link;
- an authenticated Checkout action opens Stripe;
- production CI and Cloudflare deployment both pass.


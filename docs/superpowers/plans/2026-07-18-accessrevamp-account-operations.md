# AccessRevamp Account, Operations, Preview, and Outreach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver customer project access, operator review tools, secure private previews, and a human-approved suppression-first outreach workflow while keeping sending disabled.

**Architecture:** Customer reads use own-user RLS projections. Operator actions use allowlisted server authorization and append-only audit events. Preview tokens are hashed and never persisted in URLs outside the current request. Outreach state transitions are enforced server-side in the mandated order.

**Tech Stack:** Vite ES modules, Supabase Auth/Postgres/RLS, Netlify Functions, Zod, Node test runner, Playwright.

## Global Constraints

- Customer identity comes from a confirmed Supabase session.
- Internal prospects, evidence, tokens, suppression, queue, Stripe events, reservations, and dependencies remain service/operator-only.
- Exact outreach flow: Research → Evidence → Human review → Private preview → Human approval → Suppression check → Queue → Send.
- `sending_enabled=false`; this plan may not enable or send outreach.
- Preview tokens are high entropy, stored as hashes, expire, revoke, use noindex/noarchive/no-store, and never enter analytics.
- Maximum research intake is 20 prospects per day; a score below 70 cannot reach draft recommendation.
- One lawful follow-up maximum; opt-out, bounce, complaint, negative reply, or exhausted sequence stops contact.
- Never fabricate owners, emails, evidence, results, or authorization.

---

## File responsibility map

- `src/pages/account-projects.js` and `src/services/account-projects.js`: customer account rendering and state hydration.
- `netlify/functions/account-projects.mjs`: authenticated customer-safe projection.
- `src/pages/operator.js` and `src/services/operator.js`: internal workflow UI and state actions.
- `netlify/functions/operator-*.mjs`: allowlisted operator commands.
- `netlify/functions/private-preview.mjs`: hashed-token preview read with security headers.
- `src/pages/private-preview.js`: accessible preview states and watermark.
- `supabase/migrations/202607180004_account_operations.sql`: account projections, operator allowlist, immutable audit, preview, and outreach transitions.
- `tests/account-operations.test.mjs`: authorization and UI-state contracts.
- `tests/private-preview-security.test.mjs`: preview token and header contract.
- `tests/outreach-state-machine.test.mjs`: ordered workflow, suppression, daily limit, and kill switch.

### Task 1: Customer account projection and all account states

**Files:**
- Create: `netlify/functions/account-projects.mjs`
- Create: `src/pages/account-projects.js`
- Create: `src/services/account-projects.js`
- Modify: `src/main.js`
- Modify: `src/app/metadata.js`
- Modify: `src/pages/dashboard.js`
- Create: `tests/account-projects.test.mjs`

**Interfaces:**
- Produces endpoint response `{entitlement, nextUpgrade, orders, projects, refundRequests}` with customer-safe fields only.
- Produces `setupAccountProjects(navigate)` cleanup function.

- [ ] **Step 1: Write failing projection and state tests**

```js
const expectedStates = ['configuration-missing','loading','signed-out','confirmation-required','session-expired','empty','populated','partial-failure','unavailable'];
for (const state of expectedStates) assert.match(pageSource, new RegExp(`data-account-state=["']${state}`));
for (const forbidden of ['stripe_price_id','reservation_id','customer_email','service_role']) assert.doesNotMatch(JSON.stringify(fixture), new RegExp(forbidden));
```

- [ ] **Step 2: Run and confirm missing-route implementation failure**

Run: `node --test tests/account-projects.test.mjs`

Expected: FAIL for missing account modules.

- [ ] **Step 3: Implement the authenticated safe projection and accessible UI**

Show verified purchases, current entitlement, next eligible upgrade with server quote, exact due amount, intake status, required inputs, due date, project stage, report/concept/desktop PNG/mobile PNG/creative links, revision request, eligible refund request, and support. Partial endpoint failures must preserve available sections and announce the affected region.

Redirect legacy `/dashboard` to `/account/projects` without losing auth state.

- [ ] **Step 4: Verify account tests and route cleanup**

Run: `node --test tests/account-projects.test.mjs tests/customer-experience.test.mjs tests/router-contract.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit the customer account**

```bash
git add netlify/functions/account-projects.mjs src/pages/account-projects.js src/services/account-projects.js src/main.js src/app/metadata.js src/pages/dashboard.js tests/account-projects.test.mjs tests/customer-experience.test.mjs
git commit -m "feat: add entitlement-aware customer account"
```

### Task 2: Operator authorization and append-only operations

**Files:**
- Create: `supabase/migrations/202607180004_account_operations.sql`
- Create: `netlify/functions/_shared/operator-auth.mjs`
- Create: `netlify/functions/operator-overview.mjs`
- Create: `netlify/functions/operator-action.mjs`
- Create: `src/pages/operator.js`
- Create: `src/services/operator.js`
- Modify: `src/main.js`
- Create: `tests/operator-authorization.test.mjs`

**Interfaces:**
- Produces `requireOperator(request, admin)` using verified user ID plus server-side allowlist/claim.
- Produces strict operator action union: preview approve/revoke, finding verify/reject, queue approve/cancel, suppression add, refund dependency resolve.

- [ ] **Step 1: Write failing allowlist, audit, and dangerous-action tests**

```js
await assert.rejects(() => requireOperator(customerRequest, admin), /operator access required/i);
assert.match(sql, /accessrevamp_audit_log[\s\S]*prevent.*update|raise exception/i);
for (const action of DANGEROUS_ACTIONS) assert.equal(action.requiresReason, true);
```

- [ ] **Step 2: Run and confirm missing operator boundary**

Run: `node --test tests/operator-authorization.test.mjs`

Expected: FAIL for missing modules/migration.

- [ ] **Step 3: Implement server authorization, bounded views, confirmations, and audit writes**

The overview covers prospects, evidence, previews, outreach, suppression, orders, entitlements, reservations, projects/delivery, refund dependencies, audit references, Stripe test/live indicator, and sending kill switch. Never return raw Stripe payloads, token hashes, recipient free-form data beyond operational need, or secrets.

- [ ] **Step 4: Verify operator and RLS contracts**

Run: `node --test tests/operator-authorization.test.mjs tests/database-guardrails.test.mjs`

Expected: all tests PASS; ordinary authenticated roles cannot call operator actions.

- [ ] **Step 5: Commit operator operations**

```bash
git add supabase/migrations/202607180004_account_operations.sql netlify/functions/_shared/operator-auth.mjs netlify/functions/operator-overview.mjs netlify/functions/operator-action.mjs src/pages/operator.js src/services/operator.js src/main.js tests/operator-authorization.test.mjs
git commit -m "feat: add audited operator workspace"
```

### Task 3: Secure preview token lifecycle

**Files:**
- Modify: `supabase/migrations/202607180004_account_operations.sql`
- Modify: `netlify/functions/private-preview.mjs`
- Create: `src/pages/private-preview.js`
- Modify: `src/main.js`
- Modify: `netlify.toml`
- Create: `tests/private-preview-security.test.mjs`

**Interfaces:**
- Produces `issue_accessrevamp_preview` service-only RPC returning the raw token once and storing SHA-256 hash only.
- Produces preview states `valid`, `invalid`, `expired`, `revoked`, `unapproved`, and `unavailable` with non-enumerating public responses.

- [ ] **Step 1: Write failing hashing, expiry, noindex, no-store, and analytics-leak tests**

```js
assert.match(functionSource, /createHash\(['"]sha256['"]\)/);
for (const header of ['no-store','noindex','noarchive']) assert.match(functionSource + netlifySource, new RegExp(header,'i'));
assert.doesNotMatch(previewPageSource, /analytics[\s\S]*(token|location\.href)/i);
```

- [ ] **Step 2: Run and confirm current preview contract gaps**

Run: `node --test tests/private-preview-security.test.mjs`

Expected: FAIL on token lifecycle, route page, or headers.

- [ ] **Step 3: Implement issuance, approval, activation, expiration, revocation, and safe read**

Use 32 random bytes, compare fixed-length hashes, never log token/path, require an approved preview, store access audit without token, watermark the page “Private preview — not for public distribution,” and omit third-party requests. Provide a keyboard-visible route back to AccessRevamp.

- [ ] **Step 4: Verify preview states and security headers**

Run: `node --test tests/private-preview-security.test.mjs tests/outreach-pipeline.test.mjs && npm run build`

Expected: all tests PASS and build contains no preview token fixture.

- [ ] **Step 5: Commit the preview lifecycle**

```bash
git add supabase/migrations/202607180004_account_operations.sql netlify/functions/private-preview.mjs src/pages/private-preview.js src/main.js netlify.toml tests/private-preview-security.test.mjs tests/outreach-pipeline.test.mjs
git commit -m "feat: secure private preview lifecycle"
```

### Task 4: Ordered prospect research and human review

**Files:**
- Modify: `supabase/migrations/202607180004_account_operations.sql`
- Modify: `netlify/functions/operator-action.mjs`
- Modify: `src/pages/operator.js`
- Modify: `src/services/operator.js`
- Create: `tests/prospect-review.test.mjs`
- Modify: `docs/OUTREACH.md`

**Interfaces:**
- Produces prospect stages `researched`, `evidence_ready`, `human_reviewed`, `preview_ready`, `approved`, `suppression_checked`, `queued`, `sent`, and `stopped`.
- Produces daily intake cap and score gate checked in database functions, not the UI.

- [ ] **Step 1: Write failing 20/day, score ≥70, evidence, and passive-only tests**

```js
assert.match(sql, /20/);
assert.match(sql, /score\s*>=\s*70|score < 70/i);
for (const field of ['source_url','observed_at','evidence_strength','human_reviewer']) assert.match(sql, new RegExp(field));
assert.doesNotMatch(operatorSource, /scan|attack|probe|nuclei|zap/i);
```

- [ ] **Step 2: Run and confirm missing state constraints**

Run: `node --test tests/prospect-review.test.mjs`

Expected: FAIL because ordered transitions/daily cap are absent.

- [ ] **Step 3: Implement research records, evidence review, cautious scoring, and authorized-testing fields**

Record public source, timestamp, public contact basis, exact observation, confidence, reviewer, and explicit active-testing authorization separately. A score may recommend a draft only; it never sends or claims business impact. Operator UI makes uncertain evidence visibly uncertain.

- [ ] **Step 4: Verify prospect review constraints**

Run: `node --test tests/prospect-review.test.mjs tests/outreach-pipeline.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit prospect review**

```bash
git add supabase/migrations/202607180004_account_operations.sql netlify/functions/operator-action.mjs src/pages/operator.js src/services/operator.js tests/prospect-review.test.mjs docs/OUTREACH.md
git commit -m "feat: enforce evidence-first prospect review"
```

### Task 5: Suppression-first queue with sending disabled

**Files:**
- Modify: `supabase/migrations/202607180004_account_operations.sql`
- Create: `netlify/functions/outreach-queue.mjs`
- Modify: `netlify/functions/unsubscribe.mjs`
- Create: `tests/outreach-state-machine.test.mjs`
- Modify: `tests/outreach-pipeline.test.mjs`
- Modify: `docs/OUTREACH.md`

**Interfaces:**
- Produces service-only `queue_accessrevamp_outreach` and `stop_accessrevamp_outreach` RPCs.
- Produces suppression reasons `opt_out`, `hard_bounce`, `complaint`, `negative_response`, `no_response`, and `manual`.

- [ ] **Step 1: Write failing transition, suppression-recheck, and kill-switch tests**

```js
assert.match(sql, /sending_enabled[\s\S]*default false/i);
assert.match(sql, /suppression[\s\S]*queue/i);
for (const reason of STOP_REASONS) assert.match(sql, new RegExp(reason));
assert.doesNotMatch(queueFunction, /sendgrid|postmark|resend|smtp|sendMail/i);
```

- [ ] **Step 2: Run and confirm missing ordered queue failure**

Run: `node --test tests/outreach-state-machine.test.mjs tests/outreach-pipeline.test.mjs`

Expected: FAIL until state and suppression enforcement exist.

- [ ] **Step 3: Implement queue-only approval and stop handling**

Require reviewed evidence, active approved preview, human message approval, and a same-transaction suppression check. Queue creation must fail while prerequisites are absent. This plan intentionally has no provider send adapter. Unsubscribe creates/updates suppression idempotently and cancels pending queue records.

- [ ] **Step 4: Verify no sending capability exists**

Run: `node --test tests/outreach-state-machine.test.mjs tests/outreach-pipeline.test.mjs && rg -n "sendgrid|postmark|resend|nodemailer|smtp|sendMail" src netlify supabase package*.json`

Expected: tests PASS and provider search returns no sending integration.

- [ ] **Step 5: Commit the disabled outreach queue**

```bash
git add supabase/migrations/202607180004_account_operations.sql netlify/functions/outreach-queue.mjs netlify/functions/unsubscribe.mjs tests/outreach-state-machine.test.mjs tests/outreach-pipeline.test.mjs docs/OUTREACH.md
git commit -m "feat: add suppression-first outreach queue"
```

### Task 6: Account and operations browser verification checkpoint

**Files:**
- Create: `tests/e2e/account-operations.spec.mjs`
- Modify: `playwright.config.mjs`
- Modify: `docs/IMPLEMENTATION_STATUS.md`

**Interfaces:**
- Consumes Tasks 1–5.
- Produces retained browser results for account states, operator denial, preview states, keyboard focus, and reduced motion.

- [ ] **Step 1: Add Playwright fixtures for safe mocked API states**

Cover signed out, unconfirmed, empty, populated, partial failure, unauthorized operator, valid/expired/revoked preview, keyboard navigation, and no token in outgoing requests.

- [ ] **Step 2: Run browser matrix**

Run: `npx playwright test tests/e2e/account-operations.spec.mjs --project=chromium --project=firefox --project=webkit`

Expected: all projects PASS with no console errors.

- [ ] **Step 3: Run full quality gate and record exact scope**

Run: `npm run check && git diff --check`

Expected: PASS. Record mocked versus live/nonproduction Supabase coverage accurately.

- [ ] **Step 4: Commit the operations checkpoint**

```bash
git add tests/e2e/account-operations.spec.mjs playwright.config.mjs docs/IMPLEMENTATION_STATUS.md
git commit -m "test: verify account and review workflows"
```

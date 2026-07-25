# Customer Workspace, Persistent Session, and Smooth Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a persistent authenticated customer experience, application-style project workspace, and fast but smooth cinematic scroll behavior while preserving payment and ownership security.

**Architecture:** Supabase Auth remains the browser session authority and the existing server ceremony remains the authorization boundary. A small global session-navigation controller updates the shared header, while the customer hub renders a project rail and one selected project from the existing ownership-scoped API. Showcase chapters retain raw scroll targets but interpolate rendered progress before coalesced video seeking.

**Tech Stack:** Vanilla JavaScript modules, Supabase JS, HTML/CSS, Node test runner, PostgreSQL/Supabase, Stripe Checkout/webhooks, Cloudflare Workers.

## Global Constraints

- Existing sessions survive navigation and browser restart until logout, browser-data removal, server revocation, or secure expiry.
- Paid projects originate only from a signature-verified Stripe webhook and database fulfillment.
- Browser-selected project IDs must exist in the authenticated API response.
- Three showcase chapters use time-based smoothing; direct range/touch scrubbing remains immediate.
- Stripe production-readiness triggers must not be bypassed.
- No service-role or Stripe secret enters browser code, logs, tests, or committed files.

---

### Task 1: Persistent session and authenticated navigation

**Files:**
- Create: `src/services/session-navigation.js`
- Modify: `src/components/shell.js`
- Modify: `src/main.js`
- Modify: `src/services/auth.js`
- Modify: `src/styles/components.css`
- Test: `tests/auth-session-navigation.test.mjs`

**Interfaces:**
- Consumes: `getSupabase(): SupabaseClient | null`, router `navigate(path, options?)`.
- Produces: `setupSessionNavigation(navigate): (() => void) | undefined`.

- [ ] **Step 1: Write failing tests**

Assert that authenticated login/signup pages redirect to `/account/projects`, ordinary auth-page startup does not call `signOut`, the shell includes signed-out and signed-in navigation states, and the global controller subscribes to `onAuthStateChange`.

- [ ] **Step 2: Verify the tests fail**

Run: `node --test tests/auth-session-navigation.test.mjs`

Expected: FAIL because the global controller and authenticated header state do not exist and auth startup still signs out.

- [ ] **Step 3: Implement the controller and auth guard**

Render both header states safely, resolve `getSession()` after every route render, update the header, subscribe once per rendered shell, and redirect authenticated visitors away from login/signup. Preserve explicit sign-out buttons as the only deliberate local-session clearing action.

- [ ] **Step 4: Verify the focused tests pass**

Run: `node --test tests/auth-session-navigation.test.mjs tests/auth-security.test.mjs tests/auth-signup-email.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `Persist customer sessions and add profile navigation`

### Task 2: Application-style project workspace

**Files:**
- Modify: `src/pages/account-projects.js`
- Modify: `src/services/account-projects.js`
- Modify: `src/styles/customer-hub.css`
- Test: `tests/customer-workspace-layout.test.mjs`
- Test: `tests/customer-hub.test.mjs`

**Interfaces:**
- Consumes: `GET /api/account-projects` response with `profile`, `projects`, `orders`, `refundRequests`, and `entitlement`.
- Produces: project rail links using `?project=<uuid>` and one focused project canvas.

- [ ] **Step 1: Write failing tests**

Assert that the page has an application workspace shell, project rail, profile control, one active project renderer, safe URL selection, progress/next-action summary, brief/questions, designs, requests, files, and orders.

- [ ] **Step 2: Verify the tests fail**

Run: `node --test tests/customer-workspace-layout.test.mjs tests/customer-hub.test.mjs`

Expected: FAIL because all projects currently render as expanded marketing cards.

- [ ] **Step 3: Implement selected-project rendering**

Create a compact workspace header, project navigation rail, active-project canvas, account panel, empty state, responsive layout, keyboard-visible focus, and plain-language status copy. Select only a project returned by the authenticated API; default to the newest.

- [ ] **Step 4: Verify focused tests pass**

Run: `node --test tests/customer-workspace-layout.test.mjs tests/customer-hub.test.mjs tests/customer-dashboard-feedback.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `Redesign the customer hub as a project workspace`

### Task 3: Smooth all showcase chapters

**Files:**
- Modify: `src/services/showcase-comparison.js`
- Modify: `tests/showcase-smoothing.test.mjs`

**Interfaces:**
- Consumes: raw `targetProgress` from page scroll and direct progress from range/touch controls.
- Produces: time-interpolated `renderedProgress` and coalesced video target times.

- [ ] **Step 1: Change the test to require smoothing**

Require `SCROLL_SMOOTHING_MS`, time-based exponential interpolation, an animation loop while a meaningful delta remains, immediate direct-scrub behavior, and coalesced in-flight seeks. Reject direct `renderedProgress = targetProgress` during scroll presentation.

- [ ] **Step 2: Verify the test fails**

Run: `node --test tests/showcase-smoothing.test.mjs`

Expected: FAIL because scroll progress currently jumps directly to its target.

- [ ] **Step 3: Implement minimal smoothing**

Use elapsed-time exponential interpolation with a short smoothing constant and snap epsilon. Keep requesting frames until settled. Do not start video playback; continue applying only the newest target after the current seek settles.

- [ ] **Step 4: Verify focused tests pass**

Run: `node --test tests/showcase-smoothing.test.mjs tests/cinematic-scroll.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `Smooth cinematic showcase scrolling`

### Task 4: Account, project-creation, and payment integrity audit

**Files:**
- Modify only if a failing regression proves a code or schema defect.
- Test: `tests/auth-signup-email.test.mjs`
- Test: `tests/checkout-fulfillment-sql.test.mjs`
- Test: `tests/payment-runtime.test.mjs`

**Interfaces:**
- Consumes: normalized signup payloads, Supabase Auth identity state, Stripe signed webhook events.
- Produces: one account per normalized email and one customer project per paid order.

- [ ] **Step 1: Add or strengthen regression assertions**

Verify normalized duplicate emails route to sign-in, malformed names/emails/passwords are rejected, unconfirmed identities are reused rather than duplicated, and payment fulfillment uses the `customer_projects_order_id_key` conflict boundary.

- [ ] **Step 2: Run tests and inspect live state**

Run focused auth/payment tests and query Supabase readiness, recent webhook liveness, active live prices, and duplicate profile emails.

- [ ] **Step 3: Apply only evidence-backed fixes**

If a regression fails, implement the smallest server or SQL correction through a migration generated by the Supabase CLI. Do not change production-readiness approvals without supporting evidence.

- [ ] **Step 4: Verify focused tests and advisors**

Run the focused suite and Supabase security advisors. Confirm protected APIs reject unsigned requests.

- [ ] **Step 5: Commit**

Commit message: `Harden account and payment integrity` only if files change.

### Task 5: Full release verification and deployment

**Files:**
- No source changes unless verification exposes a defect.

**Interfaces:**
- Consumes: completed Tasks 1–4.
- Produces: merged GitHub release and production evidence.

- [ ] **Step 1: Run full local verification**

Run: `npm run check`

Run: `npm run security:local`

Run: `npm audit --omit=dev --audit-level=high`

- [ ] **Step 2: Review responsive UI**

Open the workspace and showcase in the authenticated browser at desktop and mobile widths. Confirm project navigation, profile state, focus visibility, reduced motion, and scroll response.

- [ ] **Step 3: Push and merge**

Push a dedicated branch, open a pull request, wait for required checks, and merge only after success.

- [ ] **Step 4: Verify production**

Run the production auth verifier, check `/login`, `/account/projects`, protected API `401`, payment health, Cloudflare bindings, Supabase advisors, Worker6 disabled state, and mailbox authorization state.

- [ ] **Step 5: Report exact status**

Report verified completions and only external or human-controlled blockers. Do not claim checkout, outreach, Worker6, or paid-customer automation is active unless production evidence proves it.

# Checkout and Dashboard Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the order review feel official, send the customer directly from Review to Stripe, repair optional-field draft persistence, and move dashboard sign-out into Settings with confirmation.

**Architecture:** Keep Stripe-hosted Checkout and the existing authenticated draft-first payment guardrail. Collapse the visible wizard to four steps so Review owns the secure checkout action, expose failures in a dedicated status region, align the database constraints with the optional UI fields, and keep account actions inside the tabbed dashboard renderer.

**Tech Stack:** Vanilla JavaScript, CSS, Node test runner, Playwright, Supabase Postgres migrations, Cloudflare Workers, Stripe Checkout.

## Global Constraints

- Stripe Checkout remains hosted at `checkout.stripe.com`.
- A project draft must persist successfully before Stripe opens.
- The selected plan, authenticated email, terms acceptance, and request ID remain server-validated.
- Desktop and mobile layouts must avoid horizontal overflow.
- Sign out appears only in Settings and requires an explicit confirm or cancel choice.
- Work is implemented inline without subagents.

---

### Task 1: Align the saved-draft database contract

**Files:**
- Create: `supabase/migrations/20260725200338_relax_optional_order_draft_fields.sql`
- Test: `tests/order-draft-optional-fields.test.mjs`

**Interfaces:**
- Consumes: `orderDraftTextSchema` optional-field rules.
- Produces: matching Postgres constraints for `main_goal`, `style_direction`, and `content_status`.

- [ ] Write a failing migration contract test proving blank optional style/content values and a two-character goal are accepted by the database constraints.
- [ ] Run the focused test and verify it fails against the current schema.
- [ ] Add an idempotent migration that replaces the three stale check constraints.
- [ ] Run the focused test and verify it passes.

### Task 2: Send Review directly to Stripe

**Files:**
- Modify: `src/components/order-wizard.js`
- Modify: `src/services/order-wizard.js`
- Modify: `src/services/checkout.js`
- Modify: `src/services/persisted-checkout.js`
- Modify: `src/styles/cinematic-renaissance.css`
- Modify: `src/styles/order-wizard-dark-contrast.css`
- Test: `tests/order-wizard-theme.test.mjs`
- Test: `tests/order-wizard-file-handoff.test.mjs`
- Test: `tests/e2e/master-execution.spec.mjs`

**Interfaces:**
- Consumes: `[data-checkout]`, authenticated Supabase session, multipart project draft.
- Produces: a four-step wizard whose Review CTA persists the draft and redirects to an allow-listed Stripe URL.

- [ ] Write failing tests for four visible steps, a Review-owned checkout CTA, preserved API error details, and a dedicated error status.
- [ ] Run the focused tests and verify the intended failures.
- [ ] Replace the fifth screen with a compact review card and secure Stripe CTA.
- [ ] Refactor checkout feedback so failures remain readable without replacing the button label.
- [ ] Return safe 4xx draft messages to the customer and a traceable generic 5xx message.
- [ ] Restyle Review as a compact two-column order card with dark included-perk tiles and responsive wrapping.
- [ ] Run focused unit and browser tests.

### Task 3: Move dashboard sign-out into Settings

**Files:**
- Modify: `src/pages/account-projects.js`
- Modify: `src/services/account-projects.js`
- Modify: `src/services/customer-workspace-renderer.js`
- Modify: `src/styles/customer-hub.css`
- Test: `tests/customer-workspace-layout.test.mjs`

**Interfaces:**
- Consumes: the existing Supabase `auth.signOut()` operation.
- Produces: a Settings-only sign-out control with an inline confirm/cancel prompt.

- [ ] Write failing renderer and behavior-contract tests for Settings-only sign-out.
- [ ] Run the focused test and verify it fails.
- [ ] Remove the dashboard account mini-panel and compact the workspace heading.
- [ ] Add Settings sign-out, confirm, and cancel controls.
- [ ] Handle those controls through the existing workspace event delegation.
- [ ] Add responsive styling and keyboard-visible controls.
- [ ] Run the focused test and verify it passes.

### Task 4: Highlight the Complete Revamp plan consistently

**Files:**
- Modify: `src/styles/components.css`
- Test: `tests/order-wizard-theme.test.mjs`

**Interfaces:**
- Consumes: `data-plan-tier="complete_revamp"` emitted by `planCard`.
- Produces: the same yellow-orange title emphasis on homepage and pricing plan cards.

- [ ] Add a failing style contract test covering both page contexts through the shared plan-card selector.
- [ ] Add the shared selector and hover/focus contrast treatment.
- [ ] Run the focused test.

### Task 5: Verify and publish

**Files:**
- Modify only files required by failures discovered above.

**Interfaces:**
- Consumes: completed implementation.
- Produces: a merged, deployed commit with passing checks.

- [ ] Run lint, unit tests, build, and targeted Playwright checks.
- [ ] Inspect desktop and mobile screenshots for Review and Dashboard.
- [ ] Run the secret scan and inspect the final diff.
- [ ] Commit and push the feature branch.
- [ ] Open and merge the pull request.
- [ ] Confirm the production deployment and public route health.

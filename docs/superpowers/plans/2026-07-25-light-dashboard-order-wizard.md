# Light Dashboard and Order Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a functional cozy-light customer dashboard and repair the Brief-to-Review flow without weakening private file or payment safeguards.

**Architecture:** Keep the existing authenticated `/account/projects` API and order-draft pipeline. Reshape browser rendering into tabbed views, reuse the existing verified recovery flow for password changes, and align client/server validation around the same required Brief fields.

**Tech Stack:** Vanilla JavaScript modules, CSS, Supabase Auth/Storage/Postgres, Cloudflare Worker routes, Node test runner.

## Global Constraints

- Do not bypass checkout readiness, authentication, RLS, or private-storage controls.
- Do not send email or activate Worker 6.
- Reference files must persist before any Stripe navigation.
- Desktop and mobile must remain keyboard accessible and free of horizontal page overflow.

---

### Task 1: Repair Brief validation

**Files:**
- Modify: `src/components/order-wizard.js`
- Modify: `src/services/order-wizard.js`
- Modify: `netlify/functions/_shared/validation.mjs`
- Test: `tests/order-wizard-validation.test.mjs`

- [ ] Write failing behavior tests for the three required fields and all optional fields.
- [ ] Run the focused test and confirm failure against the current markup/schema.
- [ ] Align HTML and Zod rules; add exact invalid-field status and focus behavior.
- [ ] Run focused tests and commit.

### Task 2: Prove private reference-file handoff

**Files:**
- Modify: `src/services/checkout.js` only if the behavior test reveals a defect.
- Test: `tests/order-wizard-file-handoff.test.mjs`

- [ ] Write a behavior test proving multipart files are sent to `/api/order-draft` before `/api/create-checkout`.
- [ ] Confirm payment is not requested when draft persistence fails.
- [ ] Make the smallest production correction if required.
- [ ] Run focused tests and commit.

### Task 3: Build the light tabbed dashboard

**Files:**
- Modify: `src/pages/account-projects.js`
- Modify: `src/services/account-projects.js`
- Modify: `src/styles/customer-hub.css`
- Modify: `src/styles/mobile.css` if shared mobile rules require an override.
- Test: `tests/customer-workspace-layout.test.mjs`

- [ ] Write failing tests for Overview, Projects, Settings, project sub-tabs, and secure password-change routing.
- [ ] Replace marketing-scale structure with compact tabbed application structure.
- [ ] Add settings identity and recovery link while preserving session/logout behavior.
- [ ] Add cozy-light responsive styles and run focused tests.
- [ ] Commit.

### Task 4: Refine the order-wizard presentation

**Files:**
- Modify: `src/styles/order-wizard-dark-contrast.css`
- Modify: `src/styles/cinematic-renaissance.css` only where the base scale conflicts.
- Test: `tests/order-wizard-theme.test.mjs`

- [ ] Write failing contrast and responsive-layout tests.
- [ ] Tighten heading scale, plan summary spacing, perk rows, and Complete-plan name contrast.
- [ ] Run focused tests and commit.

### Task 5: Verify and publish

**Files:**
- No new production files.

- [ ] Run `npm run check`.
- [ ] Run `npm run security:local` and `npm audit --omit=dev --audit-level=high`.
- [ ] Perform desktop and mobile browser QA of the dashboard and Brief step.
- [ ] Review the final diff, commit remaining intentional changes, push, open and merge a PR.
- [ ] Wait for Production CI and Cloudflare deployment, then verify live routes and protected APIs.

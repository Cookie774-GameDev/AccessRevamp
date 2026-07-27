# Private Owner Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the creative command center from the production website and replace it with a secure, owner-only local review application backed by the existing Supabase workflow.

**Architecture:** A loopback-only Node server owns the Supabase service client and issues one-time local sessions. A browser UI served by that process reads creative review records and invokes bounded critique/design-approval/delivery-approval actions. Production routing contains neither the page nor its API.

**Tech Stack:** Node.js HTTP server, Supabase JavaScript client, PostgreSQL RPCs, native browser JavaScript and CSS, Node test runner.

## Global Constraints

- No public `/operator` route or `/api/operator-overview` route.
- Service credentials never enter browser files, URLs, logs, or Git.
- Critique, design approval, and delivery approval remain distinct durable events.
- No command-center action sends email or publishes a customer artifact.
- Postal sending remains disabled until a complete street number is supplied.

### Task 1: Public-surface removal

**Files:**
- Modify: `src/main.js`
- Modify: `src/app/metadata.js`
- Modify: `worker/index.ts`
- Modify: `tests/private-owner-command-center.test.mjs`

- [ ] Write the route-removal assertions and verify they fail.
- [ ] Remove the production page, lazy bundle, metadata, and Worker API route.
- [ ] Run the focused test and verify it passes.

### Task 2: Loopback command-center server

**Files:**
- Create: `scripts/owner-command-center/server.mjs`
- Create: `scripts/owner-command-center/ui.mjs`
- Modify: `package.json`
- Modify: `tests/private-owner-command-center.test.mjs`

- [ ] Assert loopback binding, bootstrap exchange, HttpOnly cookie, CSRF, service-only Supabase access, and separate actions.
- [ ] Verify the assertions fail.
- [ ] Implement the smallest server and UI satisfying the contracts.
- [ ] Run the focused test and verify it passes.

### Task 3: Postal and agent authority

**Files:**
- Create: `supabase/migrations/20260727143000_record_expanded_postal_candidate.sql`
- Modify: `tests/postal-address-validation.test.mjs`
- Modify: `docs/agent-system/README.md`
- Modify: `docs/agent-system/mainagent.md`
- Modify: `docs/agent-system/subagentfordesign.md`
- Modify: `docs/agent-system/subagentforwebsite.md`
- Modify: `docs/agent-system/templates/DESIGN_TEMPLATE.md`
- Modify: relevant `docs/agent-system/skills/*/SKILL.md`

- [ ] Assert the expanded candidate remains incomplete without a street number.
- [ ] Assert every creative contract names the private owner command center and separate delivery approval.
- [ ] Verify the assertions fail.
- [ ] Update the migration and contracts.
- [ ] Apply the migration and query the live state.

### Task 4: Full verification and deployment

- [ ] Run focused tests, full tests, lint, build, secret scan, and dependency audit.
- [ ] Confirm `/operator` returns the public 404 experience and the removed API is not routed.
- [ ] Launch the private command center locally and exercise critique without delivery.
- [ ] Commit, push, deploy, and verify the production deployment.

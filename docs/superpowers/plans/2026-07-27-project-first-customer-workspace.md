# Project-First Customer Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a full-width, project-first customer dashboard with truthful milestone progress, an inspectable visual ranking flow, clearer sourced audits, and refined motion-poster cards.

**Architecture:** Keep the existing owner-scoped `/api/account-projects` response and Supabase feedback RPC as the data boundary. Improve progress derivation in the server function, render the project workspace and modal from the focused renderer, and keep ephemeral enlargement/ranking state in the account controller until one authenticated feedback submission persists it.

**Tech Stack:** Vanilla JavaScript modules, CSS, Node test runner, Supabase Postgres/RLS/Storage, Cloudflare Workers.

## Global Constraints

- No service-role key, signed URL internals, or cross-customer data enters browser state or committed files.
- Existing exact source URLs remain authoritative for customer-visible audit citations.
- Design rankings persist only through the authenticated owner-scoped feedback endpoint.
- Motion is non-essential and disabled under `prefers-reduced-motion: reduce`.
- The dashboard remains responsive at 1440×900, 1024×768, 390×844, and 320-pixel reflow.

---

### Task 1: Project-first shell and truthful progress

**Files:**
- Modify: `netlify/functions/account-projects.mjs`
- Modify: `src/services/customer-workspace-renderer.js`
- Modify: `src/styles/customer-hub.css`
- Test: `tests/customer-workspace-layout.test.mjs`

**Interfaces:**
- Consumes: project status, workflow tasks, published updates, plan key.
- Produces: stage-aware `progress_percent` and a plan-aware milestone rail.

- [ ] Add failing tests proving `client_review` cannot render behind an older 60% update and that the workspace exposes only Projects and Settings account tabs.
- [ ] Run `node --test tests/customer-workspace-layout.test.mjs` and confirm the expected failures.
- [ ] Export and correct `calculateProgress`, remove the generic overview panel, and render the milestone rail.
- [ ] Rerun the focused test and confirm it passes.

### Task 2: Inspectable cinematic ranking

**Files:**
- Modify: `src/services/customer-workspace-renderer.js`
- Modify: `src/services/account-projects.js`
- Modify: `src/styles/customer-hub.css`
- Test: `tests/customer-workspace-layout.test.mjs`

**Interfaces:**
- Consumes: signed design option previews and local `{ open, rankedOptionIds, expandedOptionId }`.
- Produces: enlarge overlay, independent rank controls, step Back controls, and visual final confirmation.

- [ ] Add failing renderer tests for enlarge controls, step Back controls, and final first/second/third image cards.
- [ ] Run the focused test and confirm those assertions fail for the missing behavior.
- [ ] Implement the minimal renderer, controller state transitions, background scroll lock, responsive preview cards, and reduced-motion states.
- [ ] Rerun the focused test and confirm it passes.

### Task 3: Audit and motion-poster presentation

**Files:**
- Modify: `src/services/customer-workspace-renderer.js`
- Modify: `src/styles/customer-hub.css`
- Test: `tests/customer-workspace-layout.test.mjs`

**Interfaces:**
- Consumes: verified `project_findings` plus signed poster previews.
- Produces: category marks, plain-language headings, exact citation controls, and compact poster summaries.

- [ ] Add failing tests for exact citation links, visible source titles, category marks, and compact poster-card hierarchy.
- [ ] Run the focused test and confirm the intended failures.
- [ ] Implement the rendering and responsive styles without inventing new findings.
- [ ] Rerun customer workspace and feedback tests.

### Task 4: Codex-native process documentation

**Files:**
- Modify: `docs/agent-system/mainagent.md`
- Modify: `docs/agent-system/integrationworker.md`
- Modify: `docs/agent-system/README.md`
- Modify: `docs/agent-system/CLAUDE_INSTALL.md`
- Modify: `docs/agent-system/subagentforcustomer.md`
- Modify: `docs/agent-system/subagentfordesign.md`
- Modify: `docs/agent-system/subagentforsecurity.md`
- Modify: `docs/agent-system/subagentforwebsite.md`
- Modify: `docs/agent-system/templates/CUSTOMER_FOLDER_TEMPLATE.md`
- Modify: `docs/agent-system/skills/customer-delivery/SKILL.md`
- Modify: `docs/agent-system/skills/security-audit/SKILL.md`
- Modify: `docs/agent-system/skills/website-research/SKILL.md`

**Interfaces:**
- Consumes: current Codex operating model and customer workspace contract.
- Produces: source-link, milestone, persistence, and delivery rules without the obsolete 9 MB browser-chat limit.

- [ ] Replace the obsolete universal file-size rule with provider/runtime limits enforced at the actual upload boundary.
- [ ] Add exact-link and milestone requirements to customer research and delivery guidance.
- [ ] Run the agent-system validation scripts and documentation scans.

### Task 5: Verification and production release

**Files:**
- No additional source files unless verification exposes a regression.

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: tested commit, pushed main branch, Cloudflare Worker deployment, and production browser evidence.

- [ ] Run focused workspace, feedback, customer-hub, and responsive tests.
- [ ] Run `npm run check`, `npm run security:local`, and `npm audit --omit=dev --audit-level=high`.
- [ ] Verify desktop and mobile locally with screenshots, keyboard controls, enlargement, Back, final confirmation, and reduced motion.
- [ ] Commit and push the exact verified source state.
- [ ] Deploy the Cloudflare Worker and recheck the authenticated production dashboard without changing customer data.

# Storefront Correction and Motion Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved compact storefront correction, fast touch reveal, and consistent seven-page product boundary.

**Architecture:** Keep the existing semantic homepage and route-scoped lifecycle. Replace only the affected markup, CSS, interaction state, catalog/legal text, validation boundary, and one database constraint. Reuse all approved finished homepage assets and add one optimized leaking-sink source asset.

**Tech Stack:** Native ES modules, HTML/CSS, Pointer Events, IntersectionObserver, Vite/Vinext, Node test runner, Playwright, Sharp, Supabase/Postgres migrations.

## Global Constraints

- Work only on `feature/storefront-precision-editorial-20260729`.
- No subagents.
- Preserve native scrolling and checkout, Stripe, authentication, RLS, storage, pricing, and upgrade arithmetic.
- Keep the cinematic comparison section unchanged.
- Respect keyboard, touch, reduced motion, forced colors, 320-pixel reflow, and 200% zoom.
- Do not push or deploy; open the local production preview automatically.

---

### Task 1: Lock behavioral contracts

**Files:**
- Modify: `tests/e2e/studio-interactions.spec.mjs`
- Modify: `tests/interaction-polish.test.mjs`
- Modify: `tests/validation.test.mjs`
- Modify: `tests/marketing-creative-pack.test.mjs`

**Interfaces:**
- Consumes: existing homepage DOM and `projectIntakeTextSchema`.
- Produces: failing behavior contracts for compact UI, touch reveal, and seven pages.

- [ ] Add tests proving the counter remains idle until its viewport trigger, laptop/phone diagrams exist, example expansion stays in-flow, transformation after-images begin hidden, and plan artifacts expose local detail.
- [ ] Add touch tests proving reveal coordinates change and native vertical scrolling remains available.
- [ ] Change intake boundary expectations so seven page selections pass and eight fail.
- [ ] Run focused tests and confirm they fail for the missing behavior.

### Task 2: Correct proof, journey, examples, process, transformations, and plans

**Files:**
- Modify: `src/pages/home.js`
- Modify: `src/components/cards.js`
- Modify: `src/styles/cinematic-renaissance.css`
- Modify: `src/styles/image-led.css`
- Modify: `src/styles/mobile.css`

**Interfaces:**
- Consumes: existing plan data and visual assets.
- Produces: compact proof rail, conversation ledger, in-flow gallery, compact process rows, source-to-finished studies, and interactive artifact tiles.

- [ ] Implement the minimum semantic markup required by the failing tests.
- [ ] Replace the fixed example overlay with flex-growth behavior and a visually hidden accessible toggle.
- [ ] Replace the journey through-line with alternating ledger rows and local arrows.
- [ ] Add compact, transform/opacity-based scroll and hover motion with reduced-motion fallbacks.
- [ ] Run focused DOM and Playwright tests until green.

### Task 3: Fix Atlas pointer performance and touch

**Files:**
- Modify: `src/pages/home-interactions.js`
- Modify: `src/styles/cinematic-renaissance.css`
- Test: `tests/e2e/studio-interactions.spec.mjs`

**Interfaces:**
- Consumes: Pointer Events on `[data-reveal-hero]`.
- Produces: one-frame spotlight updates, cached bounds, direction-safe touch tracking, and complete cleanup.

- [ ] Add the failing pointer/touch tests.
- [ ] Cache hero geometry, directly paint the spotlight, lightly smooth only the grid, and stop scroll-driven restarts.
- [ ] Support touch and pen without preventing vertical native scrolling.
- [ ] Verify pointer up/cancel/lost capture and route cleanup.

### Task 4: Raise the canonical page boundary to seven

**Files:**
- Modify: catalog, product, pricing, project-intake, legal, client validation, server validation, and related tests.
- Create: one timestamped forward-only migration under `supabase/migrations/`.

**Interfaces:**
- Consumes: existing `pages: string[]` intake payload.
- Produces: the same payload with an allowed cardinality of 1–7.

- [ ] Update tests first so seven passes and eight fails.
- [ ] Update catalog and customer-facing policy/terms/privacy wording to seven individual agreed pages.
- [ ] Update client and server validators/messages from five to seven.
- [ ] Add a migration that replaces only the `project_intakes_selected_pages_check` constraint with `cardinality(selected_pages) between 1 and 7`.
- [ ] Run validation, catalog, policy, and migration tests.

### Task 5: Add the leaking-sink source asset

**Files:**
- Create: optimized AVIF/WebP under `public/assets/generated/`.
- Modify: `public/assets/generated/manifest.json`
- Modify: `src/data/visual-assets.js`
- Modify: asset provenance documentation.

**Interfaces:**
- Produces: `visualAssets.leakingSinkSource` at 2048×1152.

- [ ] Generate a photorealistic leaking residential sink source image with no people, text, logos, or branding.
- [ ] Inspect the result, optimize it to AVIF/WebP, record hashes and provenance, and wire it only to the plumbing transformation source state.
- [ ] Run the asset verifier.

### Task 6: Full verification and preview

**Files:**
- Modify: implementation handoff note if verification reveals required documentation changes.

**Interfaces:**
- Produces: clean branch and open local preview.

- [ ] Run focused Playwright tests, `npm test`, `npm run lint`, `npm run verify:assets`, `npm run build`, and `git diff --check`.
- [ ] Inspect required desktop/mobile widths, reduced motion, forced colors, touch, keyboard, overflow, and console errors.
- [ ] Commit small independently reviewable changes.
- [ ] Restart/reload the local production preview and leave it open at the top of the homepage.

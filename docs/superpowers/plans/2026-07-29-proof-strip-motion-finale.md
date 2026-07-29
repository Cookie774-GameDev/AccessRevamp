# Proof Strip Motion Finale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved coordinated proof-strip animation and correct the laptop proportions on desktop and mobile.

**Architecture:** One proof-strip observer starts independent customer, delivery, and alphabet animation routines while exposing observable state attributes. CSS renders state from those attributes and uses fixed device geometry rather than stretching the laptop across its grid track.

**Tech Stack:** Vanilla JavaScript, CSS, Playwright, Node test runner.

## Global Constraints

- Do not change the cinematic comparison, checkout, authentication, Stripe, Supabase, or customer workspace.
- Do not publish, push, or deploy before the user tests the local preview.
- Preserve reduced-motion accessibility and mobile vertical scrolling.
- Use no subagents.

---

### Task 1: Proof animation regression contract

**Files:**
- Modify: `tests/e2e/studio-interactions.spec.mjs`

**Interfaces:**
- Consumes: proof strip DOM rendered by `homePage()`
- Produces: browser-visible contract for idle, running, peak, and complete proof states

- [ ] Add a test that expects `0`, `30 days`, an empty heading, and an idle timeline before scrolling.
- [ ] Add a test that records `127` during the customer sequence and verifies the final values `87`, `3 days`, and `Desktop + mobile`.
- [ ] Assert the laptop screen aspect ratio is between `1.55` and `1.7` and narrower than the proof card.
- [ ] Run `npx playwright test tests/e2e/studio-interactions.spec.mjs --project=chromium -g "proof strip"` and confirm failure because delivery/alphabet state and correct laptop geometry do not exist.

### Task 2: Markup, interaction, and device geometry

**Files:**
- Modify: `src/pages/home.js`
- Modify: `src/pages/home-interactions.js`
- Modify: `src/styles/cinematic-renaissance.css`

**Interfaces:**
- Consumes: `[data-proof-strip]`, `[data-customer-count]`, `[data-delivery-days]`, `[data-responsive-copy]`
- Produces: `data-proof-state`, `data-count-phase`, `data-delivery-state`, and completed visible proof values

- [ ] Add explicit animation target attributes and accessible final labels to the three proof cards.
- [ ] Replace the customer-only observer with one proof observer that runs `0 → 127 → 87`, `30 → 3`, the three timeline stages, and the per-letter alphabet build.
- [ ] Track every timeout and animation frame in cleanup so route changes cannot leave work running.
- [ ] Render the laptop at a fixed `7.5rem × 4.6875rem` desktop screen and scale it down on mobile.
- [ ] Show final values immediately for reduced motion and observer fallback.
- [ ] Run the focused Playwright test and confirm it passes.

### Task 3: Documentation and full verification

**Files:**
- Modify: `docs/superpowers/specs/2026-07-29-proof-strip-motion-finale-design.md` only if verified behavior differs

**Interfaces:**
- Consumes: completed implementation
- Produces: local preview ready for user acceptance

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `npx playwright test tests/e2e/studio-interactions.spec.mjs --project=chromium`.
- [ ] Visually inspect the proof strip at desktop and mobile widths.
- [ ] Commit locally, restart the preview, and open `http://127.0.0.1:4173/` without pushing or deploying.


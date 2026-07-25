# Interaction Performance Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the hero, showcase scrubbing, button hover states, and plan selection polished and reliable on desktop and mobile.

**Architecture:** Keep the existing component structure. Correct shared style state contracts, make hero geometry viewport-current, and tune the existing coalesced showcase seek loop rather than replacing the media system.

**Tech Stack:** JavaScript modules, CSS, Node test runner, Playwright, Vite/vinext.

## Global Constraints

- Preserve existing branding and page structure.
- $200 uses animated gold; $250 uses animated rose and gold.
- Mobile page scrolling must not be captured by the hero.
- Reduced-motion and forced-colors behavior must remain accessible.

---

### Task 1: Contrast-safe controls and premium plan selection

**Files:**
- Modify: `src/styles/components.css`
- Modify: `src/styles/cinematic-renaissance.css`
- Modify: `src/styles/order-wizard-dark-contrast.css`
- Test: `tests/interaction-polish.test.mjs`

**Interfaces:**
- Consumes: existing `.button` variants and `data-order-plan` values.
- Produces: contrast-safe hover states and plan-specific selected states.

- [ ] Write a failing behavior contract for black hover surfaces, ghost overrides, plan-specific gradients, reduced motion, and forced colors.
- [ ] Run `node --test tests/interaction-polish.test.mjs` and confirm failure.
- [ ] Add explicit hover colors and the two animated border treatments.
- [ ] Run the focused test and confirm it passes.

### Task 2: Stable reveal hero

**Files:**
- Modify: `src/pages/home-interactions.js`
- Test: `tests/interaction-polish.test.mjs`
- Test: `tests/e2e/master-execution.spec.mjs`

**Interfaces:**
- Consumes: `[data-reveal-hero]`, `.site-header`, and pointer/scroll events.
- Produces: current local pointer coordinates, stable navigation, and natural touch scrolling.

- [ ] Add failing checks for current geometry, removal of the top-edge hover trap, and no touch pointer capture.
- [ ] Run focused tests and confirm failure.
- [ ] Recompute hero bounds while painting, keep navigation stable, and reserve drag capture for pen input.
- [ ] Run focused tests and confirm pass.

### Task 3: Responsive showcase scrubbing

**Files:**
- Modify: `src/services/showcase-comparison.js`
- Modify: `tests/showcase-smoothing.test.mjs`
- Test: `tests/e2e/master-execution.spec.mjs`

**Interfaces:**
- Consumes: scrub-optimized 24 fps videos with two-frame GOPs.
- Produces: faster scroll mapping, responsive direction changes, bounded seek pressure, and exact boundary frames.

- [ ] Change tests to require shorter travel, faster smoothing, a sustainable presentation cadence, and tighter settle timeout.
- [ ] Run `node --test tests/showcase-smoothing.test.mjs` and confirm failure.
- [ ] Tune the constants and commit outgoing chapters to exact target boundaries before switching.
- [ ] Add a Playwright rapid forward/reverse assertion and mobile vertical-scroll assertion.
- [ ] Run focused unit and E2E tests.

### Task 4: Full verification and publication

**Files:**
- Modify only if verification exposes a regression.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: tested production branch and deployment.

- [ ] Run `npm run check`.
- [ ] Run desktop and mobile Playwright checks with screenshots.
- [ ] Run `npm run security:local`.
- [ ] Inspect the final diff for unrelated changes.
- [ ] Commit, push, open a pull request, verify CI, merge, and confirm the production page.

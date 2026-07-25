# Working Scroll Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unrelated concept portfolio with five polished, working scroll experiences.

**Architecture:** Reuse the application's existing three video-comparison chapters on `/portfolio`, and publish the two supplied scroll films as isolated static documents under `/public/portfolio`. This preserves a unified AccessRevamp discovery surface while keeping art-direction-specific film CSS and JavaScript safely scoped.

**Tech Stack:** Vanilla JavaScript, Vite/Vinext, CSS, HTML5 video, Node test runner, Playwright, Cloudflare Workers static assets.

## Global Constraints

- Remove all seven old fictional portfolio concepts and their filters.
- Show exactly five working website experiences.
- Preserve the supplied media; do not generate replacement imagery.
- Every experience must respond to scrolling in both directions.
- Maintain mobile, keyboard, reduced-motion, and poster-fallback behavior.
- Use ordinary navigation for isolated standalone experiences.
- Keep all static assets below provider file-size limits.

---

### Task 1: Lock the new portfolio contract

**Files:**
- Create: `tests/working-scroll-portfolio.test.mjs`
- Modify: `tests/portfolio.test.mjs`
- Modify: `tests/public-experience.test.mjs`

**Interfaces:**
- Consumes: rendered output from `workPage()` and the public experience directories.
- Produces: regression coverage for the five-experience portfolio and removal of old concepts.

- [ ] Write tests that render `/portfolio`, assert the two standalone film links and three comparison names, and reject every old concept title and filter.
- [ ] Assert each standalone experience contains a return link, scene container, scroll script, reduced-motion styling, and all referenced local assets.
- [ ] Run the focused tests and confirm they fail because the old portfolio is still rendered.

### Task 2: Rebuild the portfolio discovery page

**Files:**
- Modify: `src/data/portfolio.js`
- Modify: `src/pages/work.js`
- Modify: `src/main.js`
- Create: `src/styles/working-portfolio.css`

**Interfaces:**
- Consumes: `showcasePairs` from `src/data/showcase-media.js`.
- Produces: `workPage()` markup containing two film cards and three live showcase chapters.

- [ ] Replace old portfolio data with metadata for Japan Through Time and The Moonfold Ronin.
- [ ] Render the two film cards and the three existing comparison chapters.
- [ ] Initialize `setupShowcaseComparisons(app)` on `/portfolio`.
- [ ] Add responsive AccessRevamp styling with poster-led cards and a dark cinematic comparison stage.
- [ ] Run the focused tests until the portfolio contract passes.

### Task 3: Integrate Japan Through Time

**Files:**
- Create: `public/portfolio/japan-through-time/index.html`
- Create: `public/portfolio/japan-through-time/app.js`
- Create: `public/portfolio/japan-through-time/styles.css`
- Copy: `public/portfolio/japan-through-time/assets/scene-01..05.{jpg,mp4}`

**Interfaces:**
- Consumes: the supplied Japan Through Time document, scripts, styles, posters, and clips.
- Produces: `/portfolio/japan-through-time/`.

- [ ] Copy the supplied media without recompression.
- [ ] Correct character encoding in visible copy.
- [ ] Add the AccessRevamp return header.
- [ ] Preserve bidirectional scroll scrubbing, lazy media setup, timeline navigation, poster fallback, reduced motion, and mobile behavior.
- [ ] Run the focused tests and a local browser scroll test.

### Task 4: Integrate The Moonfold Ronin

**Files:**
- Create: `public/portfolio/moonfold-ronin/index.html`
- Create: `public/portfolio/moonfold-ronin/app.js`
- Create: `public/portfolio/moonfold-ronin/styles.css`
- Copy: `public/portfolio/moonfold-ronin/assets/scene-01..20.{jpg,mp4}`

**Interfaces:**
- Consumes: the supplied Moonfold Ronin document, scripts, styles, posters, and clips.
- Produces: `/portfolio/moonfold-ronin/`.

- [ ] Copy the supplied media without recompression.
- [ ] Correct character encoding in visible copy.
- [ ] Add the AccessRevamp return header.
- [ ] Preserve the twenty-scene lazy-loading window, bidirectional scrubbing, chapter rail, poster fallback, reduced motion, and mobile behavior.
- [ ] Run the focused tests and a local browser scroll test.

### Task 5: Complete visual and production verification

**Files:**
- Modify: `tests/e2e/public-routes.spec.mjs`
- Modify: `tests/e2e/master-execution.spec.mjs`

**Interfaces:**
- Consumes: the completed portfolio and standalone routes.
- Produces: browser evidence and deployable output.

- [ ] Verify desktop, mobile, and reduced-motion portfolio layouts with no horizontal overflow.
- [ ] Verify each standalone page advances when scrolled and exposes its AccessRevamp return action.
- [ ] Run `npm run check`.
- [ ] Run `npm run security:local`.
- [ ] Run focused Playwright tests.
- [ ] Inspect screenshots and correct any visual defects.
- [ ] Commit, push, merge through GitHub, wait for Cloudflare deployment, and verify all five production routes.

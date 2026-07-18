# AccessRevamp Image-Led Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the existing AccessRevamp homepage, portfolio, and three working demos in place with original photorealistic imagery, real demo screenshots, an accessible expandable 11-lens mosaic, and purposeful motion.

**Architecture:** Keep the existing Vite/Vinext route and string-template architecture. Add a focused home-interactions module, centralize image markup/data in a small visual-assets module, preserve demo setup modules, and extend the current CSS files rather than introducing a framework or animation dependency. Generate original raster assets first, upgrade the demos, capture their real rendered screens, then compose those screens into the AccessRevamp homepage and portfolio.

**Tech Stack:** JavaScript ES modules, semantic HTML templates, CSS Grid/Flexbox, IntersectionObserver, Playwright, Node test runner, OpenAI image generation, FFmpeg image encoding, Vite/Vinext, Sites hosting.

## Global Constraints

- Modify the current AccessRevamp project in place; do not create a separate concept.
- Keep coral/orange, mint, yellow, cream, white, and near-black; retain editorial serif plus clean sans-serif typography.
- Preserve all existing business content, offers, navigation, pricing, calls to action, checkout paths, private pricing context handling, and demo interactions.
- Greenline, Firejar, and Clearflow must remain clearly labelled original fictional demonstrations.
- Do not invent client results, testimonials, statistics, credentials, availability, addresses, or business claims.
- Generate original imagery only; do not use scraped or generic stock photography.
- Do not add Framer Motion or another large animation dependency.
- Lens transitions use approximately 450ms and `cubic-bezier(0.22, 1, 0.36, 1)`.
- Support mouse, keyboard, touch, visible focus, and `prefers-reduced-motion`.
- Review at approximately 1440px, 1024px, 768px, and 390px without overflow or clipping.
- Implement all redesign work before the consolidated final formatter/lint/test/build/browser verification pass, per the user's requested sequencing.
- Do not use subagents.

---

## File map

- Create `src/data/visual-assets.js`: generated asset metadata, responsive picture helper, and three demo-brand records.
- Create `src/pages/home-interactions.js`: one-active-lens state, desktop hover/focus, touch toggle/outside close, and scroll-entry observer.
- Modify `src/pages/home.js`: image-led hero, benefit strip, interactive lens mosaic, visual evidence sequence, screenshot-led portfolio, and image-backed closing section.
- Modify `src/pages/work.js`: screenshot-led demo index and consistent fictional-work disclosure.
- Modify `src/main.js`: initialize and clean up homepage interaction behavior.
- Modify `src/styles/pages.css`: homepage, lens mosaic, evidence panels, portfolio imagery, and responsive layout.
- Modify `src/styles/components.css`: sticky navigation, refined links/buttons, browser/device frames, and reusable picture treatments.
- Modify `src/styles/motion.css`: entry reveals, image motion, lens transitions, and reduced-motion overrides.
- Modify `src/demos/{greenline,firejar,clearflow}/page.js`: meaningful image markup and stronger editorial layouts without changing functional controls.
- Modify `src/demos/{greenline,firejar,clearflow}/styles.css`: each demo's image-led identity and responsive behavior.
- Modify `public/assets/generated/manifest.json`: provenance, dimensions, hashes, and variants for every new generated/captured asset.
- Create generated AVIF/WebP/PNG groups under `public/assets/generated/`.
- Modify `tests/image-led-redesign.test.mjs`: static contracts for image integrity, disclosures, hero, lens semantics, and setup binding.
- Modify `tests/e2e/public-routes.spec.mjs`: homepage lens and responsive layout browser assertions.
- Modify `tests/e2e/portfolio-demos.spec.mjs`: image load and preserved demo interaction assertions.

---

### Task 1: Lock the redesign contracts

**Files:**
- Create: `tests/image-led-redesign.test.mjs`
- Modify: `tests/e2e/public-routes.spec.mjs`
- Modify: `tests/e2e/portfolio-demos.spec.mjs`

**Interfaces:**
- Consumes: `homePage(): string`, `workPage(): string`, and each demo `page(): string`.
- Produces: explicit structural contracts used by Tasks 2–7.

- [ ] **Step 1: Write source-level failing tests**

Create tests that import page renderers and assert:

```js
test('home renders an image-led hero and all expandable lenses', () => {
  const html = homePage();
  assert.match(html, /class="hero-visual-stack"/);
  assert.equal((html.match(/class="lens-tile/g) || []).length, 11);
  assert.equal((html.match(/aria-expanded="false"/g) || []).length, 11);
  assert.match(html, /data-lens-grid/);
  assert.match(html, /Before/);
  assert.match(html, /Evidence/);
  assert.match(html, /After/);
});

test('every fictional demo includes meaningful local imagery', () => {
  for (const html of [greenline(), firejar(), clearflow()]) {
    assert.match(html, /<picture/);
    assert.match(html, /loading="lazy"/);
    assert.match(html, /Original working demo — not a client engagement\./);
  }
});
```

Also assert `src/main.js` imports and invokes `setupHomeExperience` only on `/`.

- [ ] **Step 2: Write browser-level failing tests**

Add a homepage test that loads `/`, verifies 11 `[data-lens]` controls, clicks the first and second tiles, confirms only one `aria-expanded="true"`, presses Space to close, and checks `scrollWidth <= clientWidth` at 390px. Extend demo tests to assert every `img` has `naturalWidth > 0` and the existing Greenline area, Firejar cart, and Clearflow path interactions still respond.

- [ ] **Step 3: Run the focused source tests and verify failure**

Run: `node --test tests/image-led-redesign.test.mjs`

Expected: FAIL because the new hero, lens controls, local demo pictures, and homepage setup module do not yet exist.

- [ ] **Step 4: Commit the contract**

```powershell
git add tests/image-led-redesign.test.mjs tests/e2e/public-routes.spec.mjs tests/e2e/portfolio-demos.spec.mjs
git commit -m "test: define image-led redesign contracts"
```

---

### Task 2: Generate and register original fictional-brand imagery

**Files:**
- Create: `src/data/visual-assets.js`
- Create: `public/assets/generated/greenline-hero-01.{png,webp,avif}`
- Create: `public/assets/generated/greenline-detail-01.{png,webp,avif}`
- Create: `public/assets/generated/firejar-hero-01.{png,webp,avif}`
- Create: `public/assets/generated/firejar-gentle-01.{png,webp,avif}`
- Create: `public/assets/generated/firejar-bright-01.{png,webp,avif}`
- Create: `public/assets/generated/firejar-hot-01.{png,webp,avif}`
- Create: `public/assets/generated/clearflow-hero-01.{png,webp,avif}`
- Create: `public/assets/generated/clearflow-detail-01.{png,webp,avif}`
- Modify: `public/assets/generated/manifest.json`

**Interfaces:**
- Produces: `visualAssets`, `demoBrands`, and `picture(asset, options): string` for all page templates.

- [ ] **Step 1: Read the image-generation skill and generate eight original source images**

Use the approved prompts from the design specification. Generate photorealistic landscape service imagery, macro fictional spicy-peanut-butter product imagery, and clean residential plumbing imagery. Avoid third-party marks, readable claims, real company identities, and fake customer proof.

- [ ] **Step 2: Visually inspect every source image**

Reject imagery with malformed tools, implausible food, accidental logos, legible false labels, disaster imagery, or generic office scenes. Keep only assets that read as the approved fictional brands.

- [ ] **Step 3: Encode local responsive formats**

Use FFmpeg to produce AVIF and WebP variants from each PNG while preserving the intended crop. Record actual width, height, byte size, and SHA-256.

- [ ] **Step 4: Implement the shared picture helper**

Create:

```js
export function picture(asset, {
  alt = '',
  className = '',
  loading = 'lazy',
  sizes = '100vw',
  fetchpriority = 'auto',
} = {}) {
  return `<picture class="${className}">
    <source srcset="/assets/generated/${asset.avif}" type="image/avif">
    <source srcset="/assets/generated/${asset.webp}" type="image/webp">
    <img src="/assets/generated/${asset.png}" width="${asset.width}" height="${asset.height}" alt="${alt}" loading="${loading}" decoding="async" sizes="${sizes}" fetchpriority="${fetchpriority}">
  </picture>`;
}
```

Export exact asset records and demo-brand records used in later tasks.

- [ ] **Step 5: Update and verify the manifest**

Run: `npm run verify:assets`

Expected: `Verified 12 original asset groups.` (four existing groups plus eight new groups).

- [ ] **Step 6: Commit the image system**

```powershell
git add src/data/visual-assets.js public/assets/generated
git commit -m "feat: add original portfolio image system"
```

---

### Task 3: Redesign the three working demos around imagery

**Files:**
- Modify: `src/demos/greenline/page.js`
- Modify: `src/demos/greenline/styles.css`
- Modify: `src/demos/firejar/page.js`
- Modify: `src/demos/firejar/styles.css`
- Modify: `src/demos/clearflow/page.js`
- Modify: `src/demos/clearflow/styles.css`
- Test: `tests/image-led-redesign.test.mjs`
- Test: `tests/rebuild-demos.test.mjs`

**Interfaces:**
- Consumes: `picture()` and `demoBrands` from Task 2.
- Preserves: all current `data-*` hooks consumed by demo setup modules.
- Produces: polished working pages ready for screenshot capture.

- [ ] **Step 1: Build Greenline's image-led layout**

Replace the flat hero with a split hero containing the existing copy and `greenline-hero-01`. Add the detail image beside the service-area/quote region. Preserve `data-greenline-area`, `data-greenline-quote`, `data-compare`, `data-schedule`, and all live-region targets exactly.

- [ ] **Step 2: Build Firejar's product-led layout**

Use `firejar-hero-01` in the hero and map the three product asset records to cards. Keep text heat indicators, `data-product`, `data-heat`, `data-add`, filters, and cart hooks. Change the statement about “no food photography” to “original fictional product imagery—no borrowed packaging or customer claims.”

- [ ] **Step 3: Build Clearflow's calm service layout**

Use `clearflow-hero-01` in the split hero and `clearflow-detail-01` around the tools. Preserve native `[data-path]` buttons, path result, ETA form, water-loss form, and safe demo actions exactly.

- [ ] **Step 4: Add responsive demo styling**

Implement brand-specific grids, image crops, bordered editorial panels, and mobile stacks. Ensure all pictures use stable aspect ratios and no controls are obscured by imagery.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/image-led-redesign.test.mjs tests/rebuild-demos.test.mjs`

Expected: demo-image and disclosure assertions PASS; homepage assertions may remain failing until Tasks 5–6.

- [ ] **Step 6: Commit the demo redesigns**

```powershell
git add src/demos tests/image-led-redesign.test.mjs
git commit -m "feat: redesign portfolio demos with original imagery"
```

---

### Task 4: Capture real screenshots from the working demos

**Files:**
- Create: `scripts/capture-portfolio-visuals.mjs`
- Create: `public/assets/generated/greenline-interface-01.{png,webp,avif}`
- Create: `public/assets/generated/firejar-interface-01.{png,webp,avif}`
- Create: `public/assets/generated/clearflow-interface-01.{png,webp,avif}`
- Create: `public/assets/generated/audit-before-01.{png,webp,avif}`
- Create: `public/assets/generated/audit-after-01.{png,webp,avif}`
- Modify: `public/assets/generated/manifest.json`
- Modify: `src/data/visual-assets.js`

**Interfaces:**
- Consumes: the local preview command and completed demo routes from Task 3.
- Produces: five truthful rendered-interface asset groups for the homepage and portfolio.

- [ ] **Step 1: Implement deterministic screenshot capture**

Create a Playwright script that opens each demo at a fixed 1440×1000 viewport, waits for images and fonts, captures the meaningful hero/tool region, and writes PNGs. Capture two states of a fictional hierarchy comparison for the Before/After visual sequence.

- [ ] **Step 2: Run the local site and capture screenshots**

Run the built preview, then run: `node scripts/capture-portfolio-visuals.mjs`

Expected: five non-empty PNG files with no loading shell, broken image, or browser scrollbar in the crop.

- [ ] **Step 3: Inspect all five screenshots**

Confirm screenshots are of the actual working pages, disclosures remain visible where appropriate, important controls are not cropped, and no accidental private data appears.

- [ ] **Step 4: Encode and register variants**

Produce AVIF/WebP, add manifest hashes/dimensions, and add exact records to `visual-assets.js`.

- [ ] **Step 5: Verify assets**

Run: `npm run verify:assets`

Expected: all 17 asset groups verify with no unmanifested files.

- [ ] **Step 6: Commit captured interface proof**

```powershell
git add scripts/capture-portfolio-visuals.mjs src/data/visual-assets.js public/assets/generated
git commit -m "feat: add real demo interface captures"
```

---

### Task 5: Implement the accessible 11-lens interaction system

**Files:**
- Create: `src/pages/home-interactions.js`
- Modify: `src/main.js`
- Modify: `src/styles/pages.css`
- Modify: `src/styles/motion.css`
- Test: `tests/image-led-redesign.test.mjs`
- Test: `tests/e2e/public-routes.spec.mjs`

**Interfaces:**
- Produces: `setupHomeExperience(root = document): () => void`.
- Consumes: `[data-lens-grid]`, `[data-lens]`, `[data-reveal]`, `aria-expanded`, and lens detail IDs rendered by Task 6.

- [ ] **Step 1: Implement one-active-lens state**

Use a single `active` element and an `expand(tile)` function that updates every tile's `aria-expanded`, `is-expanded` class, and grid state. `collapse(tile)` clears the state only when appropriate.

- [ ] **Step 2: Bind input modes**

Pointer-fine devices expand on `pointerenter` and collapse on `pointerleave`. Focus expands on `focusin`; Enter and Space toggle through click semantics. Touch/click toggles the active tile and a document-level pointer handler closes it when the target is outside the grid.

- [ ] **Step 3: Bind restrained entry reveals**

Use IntersectionObserver to add `is-visible` to `[data-reveal]` nodes once. If reduced motion is requested or IntersectionObserver is unavailable, show all content immediately.

- [ ] **Step 4: Return complete cleanup**

Remove every listener, disconnect the observer, and clear transient classes so client-side navigation does not accumulate handlers.

- [ ] **Step 5: Initialize only on the homepage**

Import `setupHomeExperience` in `src/main.js` and push its cleanup only when `pathname === '/'`.

- [ ] **Step 6: Add layout and motion CSS**

Use the required 450ms premium easing, expanded grid spans on desktop, a stable mosaic minimum height, content reveal and image zoom, single-column accordion behavior at narrow widths, visible focus rings, and zero-duration reduced-motion overrides.

- [ ] **Step 7: Run focused source tests**

Run: `node --test tests/image-led-redesign.test.mjs`

Expected: setup binding assertions PASS; markup assertions pass after Task 6.

- [ ] **Step 8: Commit the interaction system**

```powershell
git add src/pages/home-interactions.js src/main.js src/styles/pages.css src/styles/motion.css tests
git commit -m "feat: add accessible expandable lens mosaic"
```

---

### Task 6: Recompose the homepage and portfolio around visual evidence

**Files:**
- Modify: `src/pages/home.js`
- Modify: `src/pages/work.js`
- Modify: `src/styles/pages.css`
- Modify: `src/styles/components.css`
- Modify: `src/styles/motion.css`
- Test: `tests/image-led-redesign.test.mjs`
- Test: `tests/portfolio.test.mjs`
- Test: `tests/public-experience.test.mjs`

**Interfaces:**
- Consumes: image records and `picture()` from Tasks 2/4; lens hooks from Task 5.
- Produces: complete image-led homepage and portfolio markup while preserving existing routes and actions.

- [ ] **Step 1: Replace the abstract hero visual**

Render a `hero-visual-stack` with a desktop browser frame using a real interface capture, a smaller mobile frame, and concise Observed/Evidence/Direction annotations. Eager-load only the main hero image with high fetch priority; preserve the current headline, lede, actions, and boundary statements.

- [ ] **Step 2: Upgrade the trust strip**

Render the existing four principles as a bright benefit strip with semantic text and no fabricated statistics.

- [ ] **Step 3: Render all lens tiles from structured data**

Replace string-only categories with records containing `title`, `summary`, `explanation`, `checks`, `outcome`, `tone`, and `visual`. Each tile is a button/article control with `aria-expanded="false"`, `aria-controls="lens-detail-N"`, number, cue, resting summary, and always-present expanded detail container.

- [ ] **Step 4: Build visual Before / Evidence / After panels**

Use the actual `audit-before-01` and `audit-after-01` images with coral/mint annotations. Keep Observed, Possible impact, and Boundary copy. Give each panel a focusable heading/control and reveal secondary detail within reserved space.

- [ ] **Step 5: Strengthen process pacing**

Keep all six named process steps and existing method link. Use an editorial rail/sticky evidence stack on wide screens and normal document flow below the desktop breakpoint.

- [ ] **Step 6: Replace abstract demo cards with real interface captures**

Use the Greenline, Firejar, and Clearflow interface captures in browser frames with brand-photo accents. Preserve routes, tasks, titles, and the exact fictional-demo disclosure.

- [ ] **Step 7: Recompose supporting sections and final CTA**

Keep all existing Free Snapshot, pricing, deliverable, ethics, growth, FAQ, and final-CTA copy/links. Improve alternating backgrounds and add one relevant image crop without changing pricing or business claims.

- [ ] **Step 8: Upgrade the portfolio index**

Apply the same real screenshot-led demo cards at `/portfolio`; retain filters, original concepts, and the fictional-work disclosure.

- [ ] **Step 9: Add responsive and interaction styling**

Implement asymmetrical desktop layouts, framed sections, selective radii, controlled shadows, image hover scaling, button arrow movement, nav underline transitions, 1024/768/390 stacks, and overflow guards.

- [ ] **Step 10: Run focused tests**

Run: `node --test tests/image-led-redesign.test.mjs tests/portfolio.test.mjs tests/public-experience.test.mjs`

Expected: all tests PASS.

- [ ] **Step 11: Commit the homepage and portfolio redesign**

```powershell
git add src/pages src/styles tests
git commit -m "feat: make AccessRevamp image-led and interactive"
```

---

### Task 7: Complete consolidated verification and polish

**Files:**
- Modify as required by verification findings only.
- Capture: local desktop and mobile preview screenshots under a temporary directory, not source control.

**Interfaces:**
- Consumes: complete implementation from Tasks 1–6.
- Produces: verified release candidate with no introduced warnings or regressions.

- [ ] **Step 1: Run formatting/linting**

Run: `npm run lint`

Expected: exit 0 with no newly introduced issues.

- [ ] **Step 2: Run all source tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: Vinext and static Vite builds complete successfully.

- [ ] **Step 4: Run asset, requirement, budget, and security verification**

Run:

```powershell
npm run verify:assets
npm run verify:requirements
npm run quality:budgets
npm run security:local
```

Expected: generated assets verify, requirements and budgets pass, and no high-severity secret/security finding is introduced.

- [ ] **Step 5: Run the browser suite after implementation is complete**

Run the configured Playwright public-route and demo specs across Chromium, Firefox, and WebKit.

Expected: all lens input-mode tests, image-load tests, demo interaction tests, accessibility checks, and overflow checks pass.

- [ ] **Step 6: Inspect desktop and mobile previews**

Capture and inspect `/`, `/portfolio`, and all three demo routes at 1440px and 390px. Confirm hero imagery, crop quality, headline wrapping, navigation, all eleven lens states, Before/Evidence/After, portfolio screenshots, demo controls, pricing alignment, image loading, focus states, and no horizontal overflow.

- [ ] **Step 7: Fix findings and repeat affected checks**

Make only scoped corrections. Repeat the exact failed command and the relevant browser widths until clean.

- [ ] **Step 8: Commit final polish**

```powershell
git add src tests scripts public/assets/generated
git commit -m "fix: polish responsive image-led experience"
```

---

### Task 8: Publish the verified existing site through Sites

**Files:**
- Do not change source unless the hosting build exposes a real defect.
- Use existing `.openai/hosting.json` and current Sites project.

**Interfaces:**
- Consumes: the exact verified Git tree from Task 7.
- Produces: a new saved and deployed version of the current AccessRevamp site.

- [ ] **Step 1: Read the Sites building and hosting skills**

Confirm the existing project ID, domain, and saved-version workflow without creating a new site.

- [ ] **Step 2: Push the exact verified tree to the existing Sites source**

Use the repository's established history-free exact-tree release method when the full-history push is unsuitable. Verify the pushed tree equals local `HEAD^{tree}`.

- [ ] **Step 3: Save and deploy a new Sites version**

Deploy to the existing public AccessRevamp site. Do not change the current public slug or create a duplicate project.

- [ ] **Step 4: Verify the live website**

Confirm HTTP 200, correct homepage title, image loading, 11 lens controls, portfolio imagery, and all three demo routes. Open the live homepage in the user's browser.

- [ ] **Step 5: Report the changed files and verification evidence**

Summarize the image system, homepage/portfolio/demo components, interaction module, tests, build results, live URL, and any remaining external-only work. Do not claim the broader platform goal is complete if unapproved external integrations remain.

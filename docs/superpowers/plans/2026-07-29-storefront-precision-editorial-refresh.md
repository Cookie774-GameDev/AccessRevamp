# Storefront Precision Editorial Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the AccessRevamp homepage proof, journey, examples, transformations, and plan presentation using the approved Precision Editorial direction while preserving all backend and payment behavior.

**Architecture:** Keep the work route-scoped to the existing homepage. Semantic structure stays in `home.js`, progressive enhancement and cleanup stay in `home-interactions.js`, visual treatment stays in `cinematic-renaissance.css`, and asset references stay in the existing data modules. Generated homepage images are static public assets with a provenance record.

**Tech Stack:** Native ES modules, semantic HTML, CSS, IntersectionObserver, requestAnimationFrame, Vite/Vinext, Node test runner, Playwright, Sharp-based repository asset tooling.

## Global Constraints

- Build and verify locally; do not push or deploy.
- Do not modify Supabase, Stripe, authentication, checkout, API, webhook, order, refund, or customer-data behavior.
- Keep the Normal Websites vs. Cinematic Scroll Experiences section unchanged.
- Treat 87 as an owner-verified historical customer count, not a real-time feed.
- Preserve keyboard, touch, reduced-motion, forced-colors, and 320-pixel reflow behavior.
- Do not invent deliverables, results, guarantees, scarcity, discounts, or subscription language.
- Do not use subagents.

---

### Task 1: Lock the semantic storefront contract

**Files:**
- Create: `tests/storefront-precision-editorial.test.mjs`
- Modify: `src/pages/home.js`
- Modify: `src/components/cards.js`

**Interfaces:**
- Consumes: existing `plans`, `picture()`, `visualAssets`, `exampleWebsites`, and `planCard()`.
- Produces: `[data-customer-count="87"]`, `[data-example-preview]`, `[data-example-grid]`, `.proof-timeline`, `.responsive-system`, `.journey-artifact`, and `.plan-artifacts`.

- [ ] **Step 1: Write the failing static contract test**

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('homepage exposes the Precision Editorial proof and preview hooks', async () => {
  const home = await read('src/pages/home.js');
  assert.match(home, /data-customer-count="87"/);
  assert.match(home, /Customers served/);
  assert.match(home, /proof-timeline/);
  assert.match(home, /responsive-system/);
  assert.match(home, /data-example-grid/);
  assert.match(home, /data-example-preview/);
  assert.match(home, /journey-artifact/);
});

test('compact homepage plans render artifact groups without changing checkout', async () => {
  const cards = await read('src/components/cards.js');
  assert.match(cards, /plan-artifacts/);
  assert.match(cards, /data-checkout/);
});
```

- [ ] **Step 2: Run the test and confirm the contract is absent**

Run: `node --test tests/storefront-precision-editorial.test.mjs`

Expected: FAIL on the first missing Precision Editorial hook.

- [ ] **Step 3: Add semantic proof, journey, preview, and artifact markup**

Update `home.js` so the proof strip contains:

```html
<span class="proof-status" aria-hidden="true"></span>
<strong><span data-customer-count="87">87</span></strong>
<p>Customers served</p>
<small>Owner-verified historical total.</small>
```

Add a three-node `.proof-timeline`, a decorative `.responsive-system` desktop/phone diagram, connected journey artifact labels, and preview labels/buttons for every example website. Pass `{ compact: true }` through the existing card call and render `.plan-artifacts` only when `compact` is true. Do not change button destinations, `data-checkout`, prices, or tier data.

- [ ] **Step 4: Run the focused contract test**

Run: `node --test tests/storefront-precision-editorial.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the semantic contract**

```text
git add tests/storefront-precision-editorial.test.mjs src/pages/home.js src/components/cards.js
git commit -m "feat: structure precision editorial storefront"
```

### Task 2: Add bounded counter and example-preview interactions

**Files:**
- Modify: `src/pages/home-interactions.js`
- Modify: `tests/storefront-precision-editorial.test.mjs`
- Modify: `tests/e2e/studio-interactions.spec.mjs`

**Interfaces:**
- Consumes: `[data-customer-count]`, `[data-example-grid]`, and `[data-example-preview]`.
- Produces: `.is-previewing`, `.is-example-active`, updated `aria-expanded`, Escape dismissal, and route cleanup with no persistent scroll lock.

- [ ] **Step 1: Extend static and browser contracts**

Add static assertions for `setupCustomerCounter`, `setupExamplePreviews`, `Escape`, and `aria-expanded`. Add a Playwright scenario that focuses the first preview, verifies expansion, presses Escape, and verifies collapse.

```js
await page.locator('[data-example-preview]').first().focus();
await expect(page.locator('[data-example-preview]').first()).toHaveAttribute('aria-expanded', 'true');
await page.keyboard.press('Escape');
await expect(page.locator('[data-example-preview]').first()).toHaveAttribute('aria-expanded', 'false');
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --test tests/storefront-precision-editorial.test.mjs`

Expected: FAIL because the named setup functions do not exist.

- [ ] **Step 3: Extract two cleanup-safe setup functions**

Implement:

```js
function setupCustomerCounter(root, reducedMotion) {
  // Read the target from data-customer-count, expose the final value by default,
  // animate once only when IntersectionObserver and motion are available,
  // cancel queued animation frames during cleanup.
}

function setupExamplePreviews(root, reducedMotion) {
  // Pointer enter/focus opens, pointer leave/focus exit closes, touch/click toggles,
  // Escape closes, and cleanup removes classes/ARIA state/listeners.
}
```

Register both cleanup functions in `setupHomeExperience`. Never modify `document.body.style`, navigation markup, or the showcase comparison lifecycle.

- [ ] **Step 4: Run focused Node and Playwright checks**

Run: `node --test tests/storefront-precision-editorial.test.mjs`

Run: `npx playwright test tests/e2e/studio-interactions.spec.mjs --project=chromium`

Expected: both PASS.

- [ ] **Step 5: Commit interaction behavior**

```text
git add src/pages/home-interactions.js tests/storefront-precision-editorial.test.mjs tests/e2e/studio-interactions.spec.mjs
git commit -m "feat: animate storefront proof and previews"
```

### Task 3: Generate and register three original homepage visuals

**Files:**
- Create: `public/images/transformations/spicy-peanut-butter-homepage.webp`
- Create: `public/images/transformations/plumbing-homepage.webp`
- Create: `public/images/transformations/lawn-care-homepage.webp`
- Create: `docs/asset-provenance/storefront-transformations-2026-07-29.md`
- Modify: `src/data/visual-assets.js`
- Modify: `src/pages/home.js`
- Modify: `tests/storefront-precision-editorial.test.mjs`

**Interfaces:**
- Consumes: the image generation tool and existing `picture()` asset descriptor format.
- Produces: `visualAssets.spicyPeanutButterHomepage`, `visualAssets.plumbingHomepage`, and `visualAssets.lawnCareHomepage`.

- [ ] **Step 1: Add failing asset-reference assertions**

```js
for (const name of ['spicyPeanutButterHomepage', 'plumbingHomepage', 'lawnCareHomepage']) {
  assert.match(await read('src/data/visual-assets.js'), new RegExp(name));
}
```

- [ ] **Step 2: Generate three original 16:9 homepage compositions**

Use the image generation skill with separate prompts for spicy peanut butter, residential plumbing, and lawn care. Request a polished full homepage composition inspired by AccessRevamp’s editorial geometry, without real logos, client claims, browser chrome, illegible microcopy, or copied layouts.

- [ ] **Step 3: Optimize and register assets**

Use the repository’s installed Sharp dependency or existing asset script to produce 2560×1440 WebP when source quality supports it, otherwise 1920×1080. Record generation date, purpose, prompt summary, transformations, dimensions, and rights status in the provenance document.

- [ ] **Step 4: Wire the assets into all three transformation after-states and the final montage**

Use domain-relevant existing imagery for the before states and the new homepage renders for the after states. Update descriptive alternative text. Do not change the cinematic showcase media array.

- [ ] **Step 5: Verify asset references and dimensions**

Run: `node --test tests/storefront-precision-editorial.test.mjs`

Run: `npm run verify:assets`

Expected: PASS with every referenced file present.

- [ ] **Step 6: Commit generated assets and provenance**

```text
git add public/images/transformations docs/asset-provenance/storefront-transformations-2026-07-29.md src/data/visual-assets.js src/pages/home.js tests/storefront-precision-editorial.test.mjs
git commit -m "feat: add original storefront transformation visuals"
```

### Task 4: Apply the Precision Editorial visual system

**Files:**
- Modify: `src/styles/cinematic-renaissance.css`
- Modify: `src/styles/mobile.css`
- Modify: `tests/storefront-precision-editorial.test.mjs`

**Interfaces:**
- Consumes: semantic hooks from Tasks 1–3.
- Produces: proof diagrams, connected journey rail, viewport-scale preview layer, pixel-build mask, transformation reveals, tangible plan artifacts, mobile stacking, reduced motion, and forced-color fallbacks.

- [ ] **Step 1: Add failing CSS contract assertions**

Assert the stylesheet contains `.proof-status`, `.proof-timeline`, `.responsive-system`, `.example-website.is-example-active`, `.example-website__pixels`, `.plan-artifacts`, `prefers-reduced-motion`, and `forced-colors`.

- [ ] **Step 2: Run the contract and confirm failure**

Run: `node --test tests/storefront-precision-editorial.test.mjs`

Expected: FAIL on missing selectors.

- [ ] **Step 3: Implement desktop Precision Editorial styling**

Use existing tokens only. Keep transitions between 180ms and 520ms. The expanded preview uses a fixed, pointer-transparent visual duplicate or promoted figure below the persistent header, while the source card remains the hover/focus anchor. Neighbor cards translate and fade slightly rather than disappearing.

- [ ] **Step 4: Implement mobile, reduced-motion, and forced-color fallbacks**

At 700px and below, use explicit preview buttons and a contained expanded card. At 320px, every modified section is one column. Reduced motion disables numeric interpolation, pixel animation, and large transforms. Forced colors remove decorative fills while retaining borders and focus outlines.

- [ ] **Step 5: Run focused tests and a production build**

Run: `node --test tests/storefront-precision-editorial.test.mjs`

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit visual styling**

```text
git add src/styles/cinematic-renaissance.css src/styles/mobile.css tests/storefront-precision-editorial.test.mjs
git commit -m "feat: polish storefront precision editorial system"
```

### Task 5: Verify, document, and open the local storefront

**Files:**
- Create: `docs/implementation/2026-07-29-storefront-precision-editorial-refresh.md`
- Modify only if verification reveals a scoped defect: files owned by Tasks 1–4.

**Interfaces:**
- Consumes: completed frontend changes.
- Produces: reproducible verification evidence and an opened local preview URL.

- [ ] **Step 1: Run the complete local gate**

Run:

```text
npm run lint
npm test
npm run build
git diff --check
```

Expected: all commands PASS.

- [ ] **Step 2: Run focused browser verification**

Verify Chromium at 1440×900, 390×844, 375×667, and 320-pixel reflow. Check counter completion, keyboard focus, Escape dismissal, touch toggle, reduced motion, image loading, no horizontal overflow, console errors, and unchanged cinematic comparison behavior.

- [ ] **Step 3: Write the implementation record**

Document changed files, generated-asset provenance link, interaction behavior, accessibility fallbacks, exact verification commands/results, known limitations, and confirmation that no backend or deployment surface changed.

- [ ] **Step 4: Start and open the local production preview**

Run the repository build and preview commands on an available local port. Open the homepage in the user’s browser and keep the server running for review.

- [ ] **Step 5: Stop before publishing**

Report the local URL and request visual feedback. Do not push, deploy, or alter the production storefront.

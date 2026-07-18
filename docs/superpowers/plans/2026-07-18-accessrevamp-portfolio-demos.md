# AccessRevamp Portfolio Demonstrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Greenline Lawn & Grounds, Firejar Spicy Peanut Butter, and Clearflow Plumbing as complete responsive, accessible, route-isolated working demonstrations with safe nonproduction behavior.

**Architecture:** Each demo owns its page, state machine, validation, structured data, analytics wiring, and scoped stylesheet under `src/demos/<name>/`. Shared form/analytics/accessibility primitives are imported from the platform. Demo state never reaches production fulfillment, payment, or external APIs.

**Tech Stack:** Vite ES modules, semantic HTML/CSS, Zod-style local validation helpers, localStorage for non-sensitive Firejar cart only, Playwright, axe-core, Node test runner.

## Global Constraints

- Each demo displays exactly: “Original working demo — not a client engagement.”
- All businesses, reviews, prices, addresses, credentials, stock, ETAs, nutrition data, and outcomes are obviously fictional/sample where applicable.
- No dead buttons, live charges, live scheduling, live fulfillment, or real emergency calls.
- Every form has real validation, pending/success/error/recovery states, and safe sample submission.
- Every demo works at mobile, tablet, desktop, 320px, 200% zoom, keyboard, touch, screen reader, forced colors, and reduced motion.
- Each demo includes visible design rationale and accessibility notes.
- No unlicensed food images or arbitrary copied media.
- Demo code/style loads only on its route and cleans listeners/timers on navigation.

---

## File responsibility map

- `src/demos/shared/demo-shell.js`: honesty label, demo navigation, rationale, accessibility notes, safe-action messaging.
- `src/demos/greenline/*`: eligibility, quote, compare, schedule, and Greenline page/style.
- `src/demos/firejar/*`: product data, collection/PDP, accessible cart, demo checkout, and Firejar page/style.
- `src/demos/clearflow/*`: service-area, schedule, water-loss, ETA, and Clearflow page/style.
- `src/pages/portfolio.js`: portfolio index linking all demos.
- `src/main.js`: route-local setup and dynamic stylesheet/module lifecycle.
- `tests/demos/*.test.mjs`: state/validation/structured-data contracts.
- `tests/e2e/portfolio-demos.spec.mjs`: cross-browser end-to-end journeys.

### Task 1: Shared demo shell and route isolation

**Files:**
- Create: `src/demos/shared/demo-shell.js`
- Create: `src/demos/shared/demo-state.js`
- Modify: `src/main.js`
- Modify: `src/pages/portfolio.js`
- Create: `tests/demos/demo-contract.test.mjs`

**Interfaces:**
- Produces `demoShell({name, purpose, body, rationale, accessibilityNotes})`.
- Produces `createDemoState(initialState, reducer)` and cleanup-aware route setup.

- [ ] **Step 1: Write failing exact-label, rationale, notes, and route-isolation tests**

```js
for (const route of DEMO_ROUTES) {
  const html = render(route);
  assert.match(html, /Original working demo — not a client engagement\./);
  assert.match(html, /Design rationale/);
  assert.match(html, /Accessibility notes/);
}
assert.doesNotMatch(main, /import .*demos\/greenline/);
```

- [ ] **Step 2: Run and confirm missing demo-shell failure**

Run: `node --test tests/demos/demo-contract.test.mjs`

Expected: FAIL because demo modules do not exist.

- [ ] **Step 3: Implement shared disclosure and dynamic route imports**

Use route functions that return an initial accessible loading shell, dynamically import the matching demo, render it, and register its cleanup. A failed dynamic import renders a full readable explanation and link back to `/portfolio`.

- [ ] **Step 4: Verify disclosure and build chunking**

Run: `node --test tests/demos/demo-contract.test.mjs && npm run build`

Expected: PASS; build emits separate Greenline, Firejar, and Clearflow chunks.

- [ ] **Step 5: Commit demo foundations**

```bash
git add src/demos/shared src/main.js src/pages/portfolio.js tests/demos/demo-contract.test.mjs
git commit -m "feat: add route-isolated demo foundation"
```

### Task 2: Greenline eligibility and quote state machine

**Files:**
- Create: `src/demos/greenline/data.js`
- Create: `src/demos/greenline/state.js`
- Create: `src/demos/greenline/page.js`
- Create: `src/demos/greenline/styles.css`
- Create: `tests/demos/greenline.test.mjs`

**Interfaces:**
- Produces `checkEligibility(zip)` with eligible/ineligible/invalid sample outcomes.
- Produces `calculateQuote({lotSize, frequency, addOns})` returning sample starting price plus caveats.
- Produces reducer steps `idle`, `eligible`, `quote`, `scheduling`, `submitted`, and `error`.

- [ ] **Step 1: Write failing ZIP, quote, validation, and analytics tests**

```js
assert.deepEqual(checkEligibility('60601').status, 'eligible');
assert.deepEqual(checkEligibility('00000').status, 'outside-sample-area');
assert.throws(() => calculateQuote({lotSize:'',frequency:'weekly',addOns:[]}), /lot size/i);
for (const event of ['service_area_checked','quote_started','quote_completed','call_clicked','schedule_requested']) assert.ok(GREENLINE_EVENTS.has(event));
```

- [ ] **Step 2: Run and confirm missing Greenline behavior**

Run: `node --test tests/demos/greenline.test.mjs`

Expected: FAIL for missing modules.

- [ ] **Step 3: Implement all required Greenline modules**

Include service-area hero; address/ZIP eligibility; lot size, frequency, add-ons, and gate/access-note quote fields; recurring mowing, seasonal cleanup, edging, aeration, commercial grounds care; starting prices with caveats; scheduling request; weather-delay expectations; and safe click-to-call/quote actions. Gate/access notes remain in memory only and never enter analytics/localStorage.

- [ ] **Step 4: Verify unit behavior and no sensitive analytics**

Run: `node --test tests/demos/greenline.test.mjs tests/analytics-contract.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit Greenline core**

```bash
git add src/demos/greenline tests/demos/greenline.test.mjs
git commit -m "feat: build Greenline quote journey"
```

### Task 3: Greenline compare, map/list, structured data, and accessibility

**Files:**
- Modify: `src/demos/greenline/page.js`
- Create: `src/demos/greenline/setup.js`
- Modify: `src/demos/greenline/styles.css`
- Modify: `tests/demos/greenline.test.mjs`

**Interfaces:**
- Produces `setupGreenline(root)` cleanup function.
- Produces demo-labelled LocalBusiness and Service JSON-LD.

- [ ] **Step 1: Add failing keyboard comparison, map alternative, review-label, and JSON-LD tests**

```js
assert.match(html, /aria-valuenow|input[^>]+type=["']range/);
assert.match(html, /Service area list/);
assert.match(html, /Fictional sample review/);
assert.equal(jsonLd['@type'], 'LocalBusiness');
```

- [ ] **Step 2: Run and confirm missing comparison/structured-data failures**

Run: `node --test tests/demos/greenline.test.mjs`

Expected: FAIL for required elements.

- [ ] **Step 3: Implement keyboard/touch comparison, decorative map plus equivalent list, fictional reviews, and JSON-LD**

The comparison uses a labelled range input, keeps both images accessible without duplicate alt text, and becomes two static panels under reduced motion/failed images. JSON-LD uses sample URLs and `additionalProperty` indicating demonstration data.

- [ ] **Step 4: Verify Greenline contract**

Run: `node --test tests/demos/greenline.test.mjs && npm run build`

Expected: PASS with no external map request.

- [ ] **Step 5: Commit complete Greenline demo**

```bash
git add src/demos/greenline tests/demos/greenline.test.mjs
git commit -m "feat: complete Greenline working demo"
```

### Task 4: Firejar product catalog and accessible persistent cart

**Files:**
- Create: `src/demos/firejar/data.js`
- Create: `src/demos/firejar/cart.js`
- Create: `src/demos/firejar/page.js`
- Create: `src/demos/firejar/setup.js`
- Create: `src/demos/firejar/styles.css`
- Create: `tests/demos/firejar.test.mjs`

**Interfaces:**
- Produces products `mild-flame`, `hot-honey-crunch`, and `hellfire-crunch` with sample ingredients/allergens/nutrition/heat/size/price/stock/shipping.
- Produces `createCart(storage)` with add, remove, set quantity, subtotal, shipping progress, hydration, and schema/version validation.

- [ ] **Step 1: Write failing product, cart, persistence, stock, and keyboard contracts**

```js
assert.deepEqual(PRODUCTS.map(p=>p.name), ['Mild Flame','Hot Honey Crunch','Hellfire Crunch']);
cart.add('mild-flame',2); assert.equal(cart.subtotalCents(), 2400);
assert.throws(() => cart.setQuantity('mild-flame',99), /stock/i);
assert.equal(hydrateCart('{bad json').items.length, 0);
assert.match(renderCart(), /aria-live/);
```

- [ ] **Step 2: Run and confirm missing Firejar behavior**

Run: `node --test tests/demos/firejar.test.mjs`

Expected: FAIL for missing modules.

- [ ] **Step 3: Implement collection, product details, local cart, and recovery states**

Persist only product IDs/quantities/schema version. Include ingredients, allergens, explicitly sample nutrition, heat, size, price, stock, shipping, quantity controls, empty/error states, shipping-progress indicator, cross-sell, recipe pairing, and recipe/social gallery. Full cart operation must work through buttons and screen-reader announcements.

- [ ] **Step 4: Verify Firejar unit and storage contracts**

Run: `node --test tests/demos/firejar.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit Firejar commerce core**

```bash
git add src/demos/firejar tests/demos/firejar.test.mjs
git commit -m "feat: build accessible Firejar demo cart"
```

### Task 5: Firejar noncharging checkout, rights, analytics, and structured data

**Files:**
- Modify: `src/demos/firejar/page.js`
- Modify: `src/demos/firejar/setup.js`
- Modify: `src/demos/firejar/data.js`
- Modify: `tests/demos/firejar.test.mjs`

**Interfaces:**
- Produces `completeDemoCheckout(cart)` that never calls Stripe/network and returns a sample confirmation.
- Produces demo-labelled Product/Offer JSON-LD and events `cart_opened`, `demo_checkout_started`.

- [ ] **Step 1: Add failing no-network checkout, subscription prohibition, JSON-LD, and asset-right tests**

```js
assert.doesNotMatch(firejarSource, /stripe|checkout\.sessions|fetch\(/i);
assert.doesNotMatch(html, /subscribe|subscription|recurring/i);
assert.equal(productJsonLd.offers['@type'], 'Offer');
for (const asset of FIREJAR_ASSETS) assert.ok(asset.provenance);
```

- [ ] **Step 2: Run and confirm missing checkout/JSON-LD failures**

Run: `node --test tests/demos/firejar.test.mjs`

Expected: FAIL for required confirmation/structured data.

- [ ] **Step 3: Implement noncharging checkout confirmation and original code-generated product art**

Use CSS/SVG packaging illustrations created in-repo; do not use unlicensed food photography. Confirmation says no order was placed and clears demo state only after explicit submit. Track only allowlisted count/value-band properties, never cart free text.

- [ ] **Step 4: Verify complete Firejar contract**

Run: `node --test tests/demos/firejar.test.mjs tests/analytics-contract.test.mjs && npm run build`

Expected: all tests PASS and no Stripe/network path exists in the demo chunk.

- [ ] **Step 5: Commit complete Firejar demo**

```bash
git add src/demos/firejar tests/demos/firejar.test.mjs
git commit -m "feat: complete Firejar working demo"
```

### Task 6: Clearflow urgent/planned service state machines

**Files:**
- Create: `src/demos/clearflow/data.js`
- Create: `src/demos/clearflow/state.js`
- Create: `src/demos/clearflow/page.js`
- Create: `src/demos/clearflow/setup.js`
- Create: `src/demos/clearflow/styles.css`
- Create: `tests/demos/clearflow.test.mjs`

**Interfaces:**
- Produces `estimateWaterLoss({flowRateGpm, minutes})` with bounded sample result.
- Produces `estimateDemoEta({zone, urgency})` with explicit sample range.
- Produces schedule validation and sample-only submit.

- [ ] **Step 1: Write failing estimator, ETA, schedule, service-area, and analytics tests**

```js
assert.deepEqual(estimateWaterLoss({flowRateGpm:2,minutes:30}), {gallons:60,label:'Sample estimate'});
assert.throws(() => estimateWaterLoss({flowRateGpm:-1,minutes:30}), /positive/i);
for (const event of ['emergency_call_clicked','service_area_checked','schedule_started','schedule_completed','water_loss_calculated']) assert.ok(CLEARFLOW_EVENTS.has(event));
```

- [ ] **Step 2: Run and confirm missing Clearflow behavior**

Run: `node --test tests/demos/clearflow.test.mjs`

Expected: FAIL for missing modules.

- [ ] **Step 3: Implement emergency and planned-service experience**

Include nonobstructing persistent emergency action with demo caveat; schedule request; service areas/hours/diagnostic-fee explanation; leak, drain, water-heater, fixture, sewer, and maintenance services; water-loss estimate; demo ETA; fictional/demo trust/licensing/insurance; FAQ; and preparation guidance. The call action confirms it is a demo and does not dial a real number.

- [ ] **Step 4: Verify Clearflow behavior and safe actions**

Run: `node --test tests/demos/clearflow.test.mjs tests/analytics-contract.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit Clearflow core**

```bash
git add src/demos/clearflow tests/demos/clearflow.test.mjs
git commit -m "feat: build Clearflow service journey"
```

### Task 7: Clearflow structured data and complete demo verification

**Files:**
- Modify: `src/demos/clearflow/page.js`
- Modify: `src/demos/clearflow/setup.js`
- Modify: `tests/demos/clearflow.test.mjs`
- Create: `tests/e2e/portfolio-demos.spec.mjs`
- Modify: `docs/DESIGN.md`

**Interfaces:**
- Produces demo-labelled LocalBusiness, Plumber, and Service JSON-LD.
- Produces three end-to-end demo journeys in all browsers.

- [ ] **Step 1: Add failing structured-data and e2e assertions**

```js
assert.deepEqual(jsonLd.map(item=>item['@type']), ['Plumber','Service']);
await expect(page.getByText('Original working demo — not a client engagement.')).toBeVisible();
await expect(page.locator('button:visible')).not.toHaveAttribute('disabled','');
```

- [ ] **Step 2: Run unit and Chromium e2e to expose remaining gaps**

Run: `node --test tests/demos/*.test.mjs && npx playwright test tests/e2e/portfolio-demos.spec.mjs --project=chromium`

Expected: FAIL until structured data and complete journeys are wired.

- [ ] **Step 3: Finish structured data and e2e journeys**

Cover Greenline eligible quote/schedule, Firejar browse/cart/quantity/demo checkout, and Clearflow service-area/schedule/calculator. Test keyboard-only flow, reduced motion, 320px reflow, media failure, invalid forms, recovery, analytics allowlist, and zero external fulfillment/payment calls.

- [ ] **Step 4: Run the complete cross-browser demo matrix**

Run: `npx playwright test tests/e2e/portfolio-demos.spec.mjs --project=chromium --project=firefox --project=webkit && npm run check`

Expected: all projects and repository checks PASS.

- [ ] **Step 5: Commit completed portfolio demonstrations**

```bash
git add src/demos/clearflow tests/demos tests/e2e/portfolio-demos.spec.mjs docs/DESIGN.md
git commit -m "test: complete three working portfolio demos"
```

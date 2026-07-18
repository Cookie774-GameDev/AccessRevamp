# AccessRevamp Foundation and Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the repository contract, evidence baseline, required documentation structure, approved design tokens, canonical $0/$50/$200/$250 catalog, and generalized route contracts that every later subsystem can safely consume.

**Architecture:** Keep the existing Vite SPA and Netlify Functions. A pure JavaScript catalog module with JSDoc types is the single non-secret product definition; a server adapter adds environment-only Stripe Price IDs. Routes use a small declarative matcher with route-local setup/cleanup.

**Tech Stack:** Node.js 22.12+, Vite 8, native ES modules, Node test runner, Netlify Functions, Supabase, Stripe test mode.

## Global Constraints

- Catalog list prices are exactly $0, $50, $200, and $250; upgrade charges are exactly $150, $200, and $50.
- Exact paid tier names are Homepage Reveal, Complete Website Revamp, and Cinematic Scroll Site.
- All services are one-time; never introduce subscription language or behavior.
- Stripe Price IDs and service secrets never enter browser code, `VITE_*`, logs, screenshots, docs, or generated assets.
- Keep Vite; no framework, CMS, WebGL, component framework, or live-mode migration without an approved ADR.
- Required palette: ink `#0B1020`, near black `#05070C`, bone `#F6F1E8`, white, coral `#FF5A3D`, mint `#A7F3D0`, yellow `#F7D154`, slate `#6B7280`.
- Exact demo disclosure: “Original working demo — not a client engagement.”
- `sending_enabled` remains `false`.
- Run `npm run check` after each task and keep the branch deployable.

---

## File responsibility map

- `AGENTS.md`: concise repository execution contract and safety boundaries.
- `design.md`: approved visual and interaction contract.
- `docs/*.md`: deep product, architecture, payment, data, security, outreach, quality, deployment, and third-party records.
- `docs/baseline/2026-07-18.md`: factual pre-rebuild evidence and known external gaps.
- `scripts/capture-baseline.mjs`: repeatable route/build/config inventory without secrets.
- `src/config/tier-catalog.js`: canonical non-secret catalog and cumulative-credit functions.
- `netlify/functions/_shared/stripe-catalog.mjs`: server-only Stripe Price adapter.
- `src/config.js`: site configuration only; imports the public catalog and exposes no Price IDs or payment links.
- `src/app/router.js`: declarative static and parameterized route matching.
- `src/app/metadata.js`: metadata map for every required route family.
- `tests/foundation-contract.test.mjs`: repository docs, safety, and design contracts.
- `tests/catalog.test.mjs`: exact catalog and upgrade arithmetic.
- `tests/router-contract.test.mjs`: route patterns, history, and cleanup.

### Task 1: Repository contract, ADR, and baseline evidence

**Files:**
- Create: `AGENTS.md`
- Create: `design.md`
- Create: `docs/adr/0001-retain-vite-netlify-supabase-stripe.md`
- Create: `docs/baseline/2026-07-18.md`
- Create: `scripts/capture-baseline.mjs`
- Create: `scripts/capture-baseline-browser.mjs`
- Create: `docs/evidence/baseline/README.md`
- Create: `tests/foundation-contract.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run baseline`, which writes a secret-free JSON inventory and local browser evidence while updating no external systems.
- Produces: documented commands and environment variable categories consumed by all later plans.

- [x] **Step 1: Write the failing repository-contract test**

```js
test('required execution and design contracts exist', async () => {
  for (const path of ['AGENTS.md', 'design.md', 'docs/adr/0001-retain-vite-netlify-supabase-stripe.md']) {
    assert.ok((await readFile(path, 'utf8')).length > 500, `${path} must be substantive`);
  }
  const design = await readFile('design.md', 'utf8');
  for (const token of ['#0B1020', '#05070C', '#F6F1E8', '#FF5A3D', '#A7F3D0', '#F7D154', '#6B7280']) {
    assert.match(design, new RegExp(token, 'i'));
  }
});
```

- [x] **Step 2: Run the test and confirm the missing-file failure**

Run: `node --test tests/foundation-contract.test.mjs`

Expected: FAIL with `ENOENT` for `AGENTS.md`.

- [x] **Step 3: Add the execution contract, approved visual contract, ADR, and baseline script**

`scripts/capture-baseline.mjs` must derive routes from `src/main.js`, build sizes from `dist/assets`, migration filenames from `supabase/migrations`, and configuration variable names from the two example env files. It must redact values and serialize only names, counts, byte sizes, and route strings.

Add this package script:

```json
"baseline": "node scripts/capture-baseline.mjs && node scripts/capture-baseline-browser.mjs"
```

The browser capture script starts the untouched current build on a loopback port and records screenshots at 375, 768, 1024, and 1440 CSS pixels, console/network failures, an axe result, and Lighthouse JSON for `/`, `/pricing`, `/work`, and `/cinematic-scroll`. It must finish before catalog or page implementation begins so the artifacts remain a true pre-rebuild baseline.

Record the already observed facts: 67 tests pass, production audit reports zero vulnerabilities, the current JS build is about 70.59 KB gzip, required browser binaries are installed, the current branch is seven commits ahead, no staging URL is verified, no Supabase remote schema is verified, and Stripe remains test-mode/configuration-only.

- [x] **Step 4: Verify the contract and baseline output**

Run: `node --test tests/foundation-contract.test.mjs && npm run build && npm run baseline`

Expected: PASS, one JSON inventory, baseline screenshots at all four widths, axe/Lighthouse JSON, and no artifact strings matching `sk_`, `whsec_`, `service_role`, `price_`, or `book.stripe.com`.

- [x] **Step 5: Commit the independently reviewable foundation**

```bash
git add AGENTS.md design.md docs/adr docs/baseline docs/evidence/baseline scripts/capture-baseline.mjs scripts/capture-baseline-browser.mjs tests/foundation-contract.test.mjs package.json
git commit -m "docs: establish rebuild execution contract"
```

### Task 2: Deep documentation skeleton with truthful current-state markers

**Files:**
- Create: `docs/PRODUCT.md`
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/DESIGN.md`
- Create: `docs/PAYMENTS.md`
- Create: `docs/DATA_MODEL.md`
- Modify: `docs/SECURITY.md`
- Create: `docs/OUTREACH.md`
- Create: `docs/QUALITY.md`
- Modify: `docs/DEPLOYMENT.md`
- Create: `docs/THIRD_PARTY.md`
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `tests/foundation-contract.test.mjs`

**Interfaces:**
- Produces: stable documentation destinations linked by `AGENTS.md` and `README.md`.
- Consumes: approved design specification `docs/superpowers/specs/2026-07-18-accessrevamp-production-rebuild-design.md`.

- [x] **Step 1: Extend the failing test to require all ten deep documents and safe status labels**

```js
const requiredDocs = ['PRODUCT','ARCHITECTURE','DESIGN','PAYMENTS','DATA_MODEL','SECURITY','OUTREACH','QUALITY','DEPLOYMENT','THIRD_PARTY'];
for (const name of requiredDocs) {
  const source = await readFile(`docs/${name}.md`, 'utf8');
  assert.match(source, /Status:/);
  assert.doesNotMatch(source, /(production deployed|live payment verified|fully compliant)/i);
}
```

- [x] **Step 2: Run the test and confirm missing-document failures**

Run: `node --test tests/foundation-contract.test.mjs`

Expected: FAIL on the first missing required document.

- [x] **Step 3: Write each document with implemented, planned, externally blocked, and launch-only sections**

Each file must identify current evidence, its owning subsystem, validation commands, and links to the approved spec and applicable plan. `THIRD_PARTY.md` records package purpose/version/license source, zero to three named inspiration references with URL/date/what was learned/what was intentionally not copied, and prohibits arbitrary copied components/assets. `ARCHITECTURE.md` states that Google Drive is internal operator context only and is never read by the browser. `DEPLOYMENT.md` explicitly says no production switch has been authorized.

- [x] **Step 4: Verify documentation and stale-claim removal**

Run: `node --test tests/foundation-contract.test.mjs && rg -n "\$199|Quick Fix|two plans|exactly two" README.md docs src tests`

Expected: test PASS; README and current operating documents are clean. Any source/test hits are recorded as immediate Task 3 blockers and may not remain after the canonical catalog lands.

- [x] **Step 5: Commit the documentation set**

```bash
git add docs AGENTS.md README.md tests/foundation-contract.test.mjs
git commit -m "docs: define production operating model"
```

### Task 3: Canonical typed catalog and server-only Stripe adapter

**Files:**
- Create: `src/config/tier-catalog.js`
- Create: `netlify/functions/_shared/stripe-catalog.mjs`
- Modify: `src/config.js`
- Modify: `tests/catalog.test.mjs`
- Modify: `.env.example`
- Modify: `.env.netlify.example`

**Interfaces:**
- Produces: `TIERS`, `TIER_KEYS`, `getTier(key)`, `getEligibleCreditCents(paidCents, targetKey)`, and `quoteUpgrade(paidCents, targetKey)`.
- Produces server-only: `getStripePriceForQuote(quote, env)` returning `{ priceId, transitionKey }`.

- [x] **Step 1: Replace stale source-text assertions with failing behavioral catalog tests**

```js
const transitions = [
  [0, 'homepage_reveal', 5000], [0, 'complete_revamp', 20000], [0, 'cinematic_scroll', 25000],
  [5000, 'complete_revamp', 15000], [5000, 'cinematic_scroll', 20000],
  [20000, 'cinematic_scroll', 5000], [25000, 'cinematic_scroll', 0],
];
for (const [paid, target, due] of transitions) {
  assert.equal(quoteUpgrade(paid, target).dueNowCents, due);
}
```

Also assert that importing `src/config.js` contains no `price_`, `book.stripe.com`, `VITE_STRIPE`, `$199`, or `quick_fix`.

- [x] **Step 2: Run the catalog test and confirm the stale-catalog failure**

Run: `node --test tests/catalog.test.mjs`

Expected: FAIL because `tier-catalog.js` does not exist and the old config contains `$199`.

- [x] **Step 3: Implement the pure catalog and exact upgrade arithmetic**

Use JSDoc `@typedef` declarations for tier keys and quote results. `quoteUpgrade` must reject unknown tiers, downgrades, negative paid value, and paid value above $250; cap eligible credit at the target list price; return list price, verified credit, amount due, and resulting entitlement.

The server adapter maps only these environment names:

```js
const PRICE_ENV_BY_TRANSITION = Object.freeze({
  'none->homepage_reveal': 'STRIPE_HOMEPAGE_REVEAL_FULL_PRICE_ID',
  'none->complete_revamp': 'STRIPE_COMPLETE_REVAMP_FULL_PRICE_ID',
  'none->cinematic_scroll': 'STRIPE_CINEMATIC_FULL_PRICE_ID',
  'homepage_reveal->complete_revamp': 'STRIPE_HOMEPAGE_TO_COMPLETE_PRICE_ID',
  'homepage_reveal->cinematic_scroll': 'STRIPE_HOMEPAGE_TO_CINEMATIC_PRICE_ID',
  'complete_revamp->cinematic_scroll': 'STRIPE_COMPLETE_TO_CINEMATIC_PRICE_ID',
});
```

- [x] **Step 4: Verify behavioral and secret-boundary tests**

Run: `node --test tests/catalog.test.mjs && npm run build && rg -n "price_|book\.stripe\.com|VITE_STRIPE" dist src`

Expected: tests PASS; search returns no matches in `dist` or `src`.

- [x] **Step 5: Commit the catalog boundary**

```bash
git add src/config src/config.js netlify/functions/_shared/stripe-catalog.mjs tests/catalog.test.mjs .env.example .env.netlify.example
git commit -m "feat: add canonical cumulative tier catalog"
```

### Task 4: Declarative required-route contract

**Files:**
- Modify: `src/app/router.js`
- Modify: `src/app/metadata.js`
- Modify: `src/main.js`
- Create: `tests/router-contract.test.mjs`

**Interfaces:**
- Produces: `compileRoute(pattern)` and `matchRoute(pathname, routes)` supporting `:token` and `:slug` segments.
- Produces: required route registrations whose page modules may be temporary honest “under construction in this preview” views only until their owning plans replace them.

- [x] **Step 1: Write failing route-pattern and inventory tests**

```js
for (const route of REQUIRED_ROUTES) assert.match(mainSource, new RegExp(`['\"]${escape(route)}['\"]`));
assert.deepEqual(matchRoute('/preview/abc123', {'/preview/:token': () => ''}).params, {token:'abc123'});
assert.deepEqual(matchRoute('/portfolio/greenline-lawn-and-grounds', {'/portfolio/:slug': () => ''}).params, {slug:'greenline-lawn-and-grounds'});
```

- [x] **Step 2: Run and confirm failures for `/preview/:token`, `/free-snapshot`, and `/account/projects`**

Run: `node --test tests/router-contract.test.mjs`

Expected: FAIL listing missing route patterns.

- [x] **Step 3: Generalize segment matching and register every required route**

The matcher must escape literal segments, decode parameters safely, reject extra segments, and preserve existing history/cleanup behavior. Metadata for token previews is fixed `noindex` copy and never includes the token.

- [x] **Step 4: Verify routing and full baseline**

Run: `node --test tests/router-contract.test.mjs tests/rebuild-architecture.test.mjs && npm run check`

Expected: all tests PASS; build completes without duplicate module entry points.

- [x] **Step 5: Commit the route contract**

```bash
git add src/app src/main.js tests/router-contract.test.mjs tests/rebuild-architecture.test.mjs
git commit -m "feat: register production route contract"
```

### Task 5: Foundation review gate

**Files:**
- Modify: `docs/baseline/2026-07-18.md`
- Modify: `docs/IMPLEMENTATION_STATUS.md`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: a truthful foundation checkpoint for the entitlement/payment plan.

- [x] **Step 1: Run the complete foundation evidence set**

Run: `npm run check && npm audit --omit=dev --audit-level=high && npm run baseline && git diff --check`

Expected: all checks PASS, audit reports zero high-or-greater production vulnerabilities, and the baseline inventory contains no secret-like values.

- [x] **Step 2: Inspect bundle and stale assumptions**

Run: `rg -n "\$199|Quick Fix|VITE_STRIPE|book\.stripe\.com|price_" src netlify/functions tests docs README.md .env*`

Expected: no stale product text; `price_` appears only as a prohibited-pattern assertion or server environment category, never an actual ID.

- [x] **Step 3: Update implementation status with exact evidence and external gaps**

Record commit IDs, command results, unverified external systems, and the next plan. Do not mark Supabase remote or Stripe object creation as verified.

- [x] **Step 4: Commit the foundation checkpoint**

```bash
git add docs/baseline/2026-07-18.md docs/IMPLEMENTATION_STATUS.md
git commit -m "docs: record foundation verification"
```

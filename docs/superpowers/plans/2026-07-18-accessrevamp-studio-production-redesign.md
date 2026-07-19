# AccessRevamp Studio Production Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild and publish the existing AccessRevamp application as a compact, distinctive editorial studio with stable interactions, three complete concept brands, and truthful Sites-hosted backend paths.

**Architecture:** Preserve the Vinext/Next catch-all browser app and extract no framework. Add thin Sites route handlers that call the existing server-authoritative handlers, change browser clients to same-origin `/api/*`, and keep Netlify adapters for compatibility. Apply only reviewed missing Supabase migrations and configure runtime values through Sites.

**Tech Stack:** Node 22+, Vinext, Next 16, Vite 8, native ES modules, HTML/CSS/JavaScript, Playwright, axe-core, Supabase Auth/Postgres/RLS, Stripe Checkout test mode, Cloudflare-compatible Sites Worker.

## Global Constraints

- Work inside `C:\Users\viper\projects\AccessRevamp-worktrees\editorial-story-ultramarine` and preserve `.openai/hosting.json`.
- Do not add a component framework, animation framework, CMS, WebGL dependency, or AI-generated imagery.
- Preserve canonical one-time prices: Free Snapshot $0, Homepage Reveal $50, Complete Website Revamp $200, Cinematic Scroll Site $250.
- Preserve server-calculated upgrade paths: $50→$200 costs $150, $50→$250 costs $200, and $200→$250 costs $50.
- Keep Stripe in test mode until separately authorized. Never hardcode secrets or Price IDs.
- Keep the exact disclosure “Original working demo — not a client engagement.” once in case-study metadata and remove it from project artwork.
- Use only licensed local AVIF/WebP photography documented in `docs/ASSET_SOURCES.md`.
- Target 1920, 1440, 1280, 1024, 768, 390, and 320 pixel widths, 200% zoom, keyboard, touch, reduced motion, and forced colors.
- Never invent client outcomes, testimonials, business claims, people, certifications, addresses, or statistics.

---

### Task 1: Lock regression contracts for the audited visual failures

**Files:**
- Create: `tests/studio-redesign.test.mjs`
- Modify: `tests/e2e/public-routes.spec.mjs`
- Modify: `tests/e2e/portfolio-demos.spec.mjs`
- Create: `tests/e2e/studio-interactions.spec.mjs`

**Interfaces:**
- Consumes: existing `homePage()`, `workPage()`, demo `page()` modules, and browser data attributes.
- Produces: regression contracts for compact sections, unique lens visuals, stable activation, correct lazy-image verification, and 320-pixel reflow.

- [ ] **Step 1: Write failing source contracts**

Add tests that require shared layout tokens, no project-art watermark strings, eleven unique `data-lens-visual` values, a closing audit montage, `interest=free_snapshot` parsing, `/api/*` service endpoints, and three case-study metadata disclosures.

```js
test('studio redesign removes visual watermarks and gives every lens unique art', async () => {
  const home = await readFile('src/pages/home.js', 'utf8');
  assert.doesNotMatch(home, /Original fictional|Original working demo|Not a client engagement/i);
  assert.equal([...home.matchAll(/data-lens-visual="([^"]+)"/g)].length, 11);
  assert.match(home, /data-audit-montage/);
});
```

- [ ] **Step 2: Write failing browser regressions**

Add a WebKit-safe rapid-pointer test that records the intended lens before/after movement, an Escape/outside-click test, a lazy-image test that scrolls each image into view before checking `naturalWidth`, and a 320-pixel Greenline overflow assertion.

```js
for (let index = 0; index < 11; index += 1) {
  await lenses.nth(index).hover();
  await expect(lenses.nth(index)).toHaveAttribute('aria-expanded', 'true');
}
await page.keyboard.press('Escape');
await expect(page.locator('[data-lens][aria-expanded="true"]')).toHaveCount(0);
```

- [ ] **Step 3: Run the focused tests and verify the intended failures**

Run: `node --test tests/studio-redesign.test.mjs && npx playwright test tests/e2e/studio-interactions.spec.mjs --project=webkit --reporter=line`

Expected: FAIL on missing compact redesign markers, the current hover-reflow bug, and Greenline's 320-pixel overflow.

- [ ] **Step 4: Commit the failing contracts**

```text
git add tests/studio-redesign.test.mjs tests/e2e/public-routes.spec.mjs tests/e2e/portfolio-demos.spec.mjs tests/e2e/studio-interactions.spec.mjs
git commit -m "test: define studio redesign regressions"
```

### Task 2: Rebuild shared tokens, shell, hero, section rhythm, and closing montage

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/base.css`
- Modify: `src/styles/components.css`
- Modify: `src/styles/image-led.css`
- Modify: `src/components/shell.js`
- Modify: `src/pages/home.js`
- Modify: `src/pages/home-interactions.js`

**Interfaces:**
- Consumes: existing `picture()` helper, route navigation, `setupHomeExperience(root)` lifecycle.
- Produces: shared `--content-max`, `--page-gutter`, `--section-space`, type, motion, radius, shadow, and z-index tokens; hero `data-audit-stage`; closing `data-audit-montage`.

- [ ] **Step 1: Implement the centralized scale**

Define `--content-max: 85rem`, `--page-gutter: clamp(1.25rem, 4vw, 4.5rem)`, `--section-space: clamp(4.5rem, 8vw, 8rem)`, readable body sizes, `--ease-editorial: cubic-bezier(.22,1,.36,1)`, and explicit layer tokens. Replace hard-coded container/section spacing with these values.

- [ ] **Step 2: Recompose the hero**

Render the headline as three intentional spans, one coral italic highlight, concise supporting copy, primary/secondary actions, and a layered desktop/mobile audit stage. Remove every hero/art disclosure and add one interactive before/after range with a labeled native control.

- [ ] **Step 3: Replace blank chapter bands and the plumbing closing image**

Remove oversized minimum heights and sticky-stage gaps. Use compact transitions and build a three-site interface montage with annotation chips for the closing CTA.

- [ ] **Step 4: Add bounded hero depth behavior**

Extend `setupHomeExperience` with pointer transforms capped to six pixels and reset on leave. Disable the behavior for reduced motion or coarse pointers.

- [ ] **Step 5: Run focused contracts and inspect 1440/390 screenshots**

Run: `node --test tests/studio-redesign.test.mjs tests/design-system.test.mjs`

Expected: hero, token, montage, and disclosure contracts PASS.

- [ ] **Step 6: Commit**

```text
git add src/styles src/components/shell.js src/pages/home.js src/pages/home-interactions.js
git commit -m "feat: rebuild the AccessRevamp editorial stage"
```

### Task 3: Replace the eleven-lens mosaic with stable anchored layout animation

**Files:**
- Create: `src/data/lenses.js`
- Create: `src/components/lens-visuals.js`
- Modify: `src/pages/home.js`
- Modify: `src/pages/home-interactions.js`
- Modify: `src/styles/image-led.css`
- Test: `tests/studio-redesign.test.mjs`
- Test: `tests/e2e/studio-interactions.spec.mjs`

**Interfaces:**
- Produces: `diagnosticLenses: Array<{id,number,title,question,visual,explanation,checks,outcome,tone}>`; `lensVisual(name): string`; `setupHomeExperience(root)` with hover-intent and keyboard/touch state.

- [ ] **Step 1: Move all lens content into structured data**

Create exactly eleven immutable records with unique visual keys: `focus-path`, `task-flow`, `phone-frame`, `load-waterfall`, `content-hierarchy`, `local-result`, `cta-path`, `pricing-logic`, `event-funnel`, `publishing-sequence`, and `secure-form`.

- [ ] **Step 2: Build unique semantic mini-interfaces**

Return CSS/HTML mini-interfaces from `lensVisual()` using text, native-like controls, bars, focus rings, timelines, and diagrams. Do not use portfolio photos or generated SVG illustrations.

- [ ] **Step 3: Implement anchored desktop coordinates**

Store each tile's resting row/column in data attributes. On expansion, retain the active tile's starting coordinate, apply the two-column/two-row span, and assign deterministic compact coordinates to every neighbor before running FLIP.

- [ ] **Step 4: Add hover intent and complete input behavior**

Use a 110ms open timer and 90ms close timer, cancel timers when entering the active tile, ignore synthetic hover on coarse pointers, toggle with Enter/Space, close with Escape/outside pointerdown, and use in-flow accordion layout below 760 pixels.

- [ ] **Step 5: Verify rapid movement and reduced motion**

Run: `npx playwright test tests/e2e/studio-interactions.spec.mjs --project=chromium --project=webkit --reporter=line`

Expected: every intended tile remains active under rapid sequential hover; only one `aria-expanded=true`; Escape, outside click, focus, and touch PASS.

- [ ] **Step 6: Commit**

```text
git add src/data/lenses.js src/components/lens-visuals.js src/pages/home.js src/pages/home-interactions.js src/styles/image-led.css tests
git commit -m "feat: stabilize the eleven-lens mosaic"
```

### Task 4: Source, optimize, and document licensed portfolio photography

**Files:**
- Create: `public/assets/portfolio/greenline/*.avif`
- Create: `public/assets/portfolio/greenline/*.webp`
- Create: `public/assets/portfolio/firejar/*.avif`
- Create: `public/assets/portfolio/firejar/*.webp`
- Create: `public/assets/portfolio/clearflow/*.avif`
- Create: `public/assets/portfolio/clearflow/*.webp`
- Create: `docs/ASSET_SOURCES.md`
- Create: `src/data/portfolio-assets.js`
- Modify: `scripts/verify-generated-assets.mjs`

**Interfaces:**
- Produces: local asset records with `avif`, `webp`, `width`, `height`, `alt`, creator, source URL, license note, and access date.

- [ ] **Step 1: Select verified photographs from source pages**

Use official Unsplash/Pexels source pages and license pages. Select landscape, detail, product, technician, and tool images without visible logos. Record the source before downloading.

- [ ] **Step 2: Create responsive derivatives**

Use FFmpeg to crop intentionally at desktop and mobile aspect ratios and encode AVIF/WebP derivatives. Keep the largest derivative no wider than 1920 pixels and verify dimensions.

- [ ] **Step 3: Document provenance**

For every local file list creator, original source page, library license/usage note, and `2026-07-18` access date in `docs/ASSET_SOURCES.md`.

- [ ] **Step 4: Add an asset verifier**

Require every declared file to exist, use only `.avif` or `.webp`, have nonzero dimensions, and have one source documentation entry.

- [ ] **Step 5: Run asset verification**

Run: `npm run verify:assets`

Expected: all AccessRevamp interface assets and licensed portfolio asset records PASS.

- [ ] **Step 6: Commit**

```text
git add public/assets/portfolio docs/ASSET_SOURCES.md src/data/portfolio-assets.js scripts/verify-generated-assets.mjs
git commit -m "feat: add licensed portfolio photography"
```

### Task 5: Rebuild the portfolio index and three independent brand applications

**Files:**
- Modify: `src/pages/work.js`
- Modify: `src/data/portfolio.js`
- Modify: `src/demos/greenline/page.js`
- Modify: `src/demos/greenline/setup.js`
- Modify: `src/demos/greenline/styles.css`
- Modify: `src/demos/firejar/page.js`
- Modify: `src/demos/firejar/setup.js`
- Modify: `src/demos/firejar/styles.css`
- Modify: `src/demos/clearflow/page.js`
- Modify: `src/demos/clearflow/setup.js`
- Modify: `src/demos/clearflow/styles.css`
- Test: `tests/e2e/portfolio-demos.spec.mjs`

**Interfaces:**
- Consumes: `portfolioAssets`, existing route-isolated `page()` and `setup(root)` contract.
- Produces: three visually and structurally distinct concept applications with safe local interactions.

- [ ] **Step 1: Replace the portfolio index with three capability stories**

Use full browser compositions, problem/direction/interaction copy, desktop/mobile previews, and one discreet independent-concept metadata line. Remove unrelated poster concepts from the primary public index.

- [ ] **Step 2: Rebuild Greenline**

Implement local-service navigation, seasonal service cards, ZIP eligibility, add-on plan builder, quote request state, mobile menu, organic image crops, and the forest/sage/cream/yellow system. Constrain the range comparison at 320 pixels with `min-width:0` and `width:100%`.

- [ ] **Step 3: Rebuild Firejar**

Implement product gallery, heat and jar-size selectors, ingredients, nutrition, serving ideas, persistent demo cart, FAQ, and mobile purchase layout. Keep checkout explicitly non-fulfilling.

- [ ] **Step 4: Rebuild Clearflow**

Implement emergency/planned chooser, service search, issue diagnosis, ZIP eligibility, appointment request, what-happens-next steps, and a mobile emergency action without fear or ETA claims.

- [ ] **Step 5: Remove all artwork watermarks and preserve metadata disclosure**

Keep the exact required disclosure only in `demo-shell` metadata. Remove `Fictional brand image`, `sample business`, and demo watermark labels from all imagery/compositions.

- [ ] **Step 6: Verify demo behavior and reflow**

Run: `npx playwright test tests/e2e/portfolio-demos.spec.mjs --project=chromium --project=firefox --project=webkit --reporter=line`

Expected: all images load after scroll, interactions work, no network fulfillment occurs, disclosure is visible once, and overflow is at most one pixel.

- [ ] **Step 7: Commit**

```text
git add src/pages/work.js src/data/portfolio.js src/demos tests/e2e/portfolio-demos.spec.mjs
git commit -m "feat: rebuild the three portfolio brands"
```

### Task 6: Redesign pricing, contact, Free Snapshot, authentication, and account UX

**Files:**
- Modify: `src/components/cards.js`
- Modify: `src/pages/pricing.js`
- Modify: `src/pages/contact.js`
- Modify: `src/pages/free-snapshot.js`
- Modify: `src/pages/auth.js`
- Modify: `src/pages/account-projects.js`
- Modify: `src/pages/results.js`
- Modify: `src/services/contact.js`
- Modify: `src/services/free-snapshot.js`
- Modify: `src/services/auth.js`
- Modify: `src/services/account-projects.js`
- Modify: `src/services/checkout.js`
- Modify: `src/styles/pages.css`
- Test: `tests/customer-experience.test.mjs`
- Test: `tests/e2e/public-routes.spec.mjs`

**Interfaces:**
- Produces: `readContactInterest(locationLike)`, selected-offer summary, complete auth modes, `/api/contact`, `/api/free-snapshot`, `/api/account-projects`, `/api/entitlement-quote`, `/api/create-checkout` clients.

- [ ] **Step 1: Write the failing offer-preselection and auth-state tests**

Require `readContactInterest({search:'?interest=free_snapshot'}) === 'free_snapshot'`, complete form fields, reset/recovery controls, and absence of the public sign-in link when public Supabase configuration is missing.

- [ ] **Step 2: Rebuild the four-plan family**

Use one geometry system, readable 16-pixel minimum supporting text, grouped mobile comparison rows, primary $200 treatment, and near-black $250 treatment with a small motion sequence.

- [ ] **Step 3: Complete contact and Free Snapshot UX**

Add offer summary, name/email/public URL/goal/service/context/consent fields, visual deliverable sample, timeline, client validation, URL sanitization, honeypot, loading, persisted success, notification-status copy, and no refresh resubmission.

- [ ] **Step 4: Complete authentication modes**

Support sign in, sign up, magic-link/password recovery request, sign out, confirmed-email errors, protected-route empty/unavailable states, and owned account records.

- [ ] **Step 5: Correct checkout result semantics**

Success displays `pending verification` until the server confirms an order. Cancel and failed states provide retry/contact actions and never claim a charge.

- [ ] **Step 6: Run focused tests**

Run: `node --test tests/customer-experience.test.mjs tests/rebuild-public-features.test.mjs tests/catalog.test.mjs`

Expected: contact, snapshot, auth, pricing, and catalog tests PASS.

- [ ] **Step 7: Commit**

```text
git add src/components/cards.js src/pages src/services src/styles/pages.css tests
git commit -m "feat: complete the customer conversion paths"
```

### Task 7: Expose server-authoritative logic through Sites-compatible API routes

**Files:**
- Create: `app/api/contact/route.ts`
- Create: `app/api/free-snapshot/route.ts`
- Create: `app/api/create-checkout/route.ts`
- Create: `app/api/entitlement-quote/route.ts`
- Create: `app/api/account-projects/route.ts`
- Create: `app/api/pricing-context/route.ts`
- Create: `app/api/private-preview/route.ts`
- Create: `app/api/stripe-webhook/route.ts`
- Create: `app/api/health/route.ts`
- Modify: `netlify/functions/*.mjs` only where shared exports are required
- Create: `tests/sites-api-routes.test.mjs`

**Interfaces:**
- Consumes: existing default handlers `(request: Request) => Promise<Response>`.
- Produces: Next route `POST`, `GET`, or both, delegating the original `Request` unchanged and returning the handler `Response` unchanged.

- [ ] **Step 1: Write failing adapter contracts**

Require every public browser endpoint to have a route file and forbid `/.netlify/functions/` in `src/services`.

```js
for (const route of ['contact','free-snapshot','create-checkout','entitlement-quote','account-projects','pricing-context','private-preview','stripe-webhook','health']) {
  await access(`app/api/${route}/route.ts`);
}
```

- [ ] **Step 2: Add thin route handlers**

Each route imports the existing function and delegates only supported methods. The webhook route passes the untouched request so signature verification reads the raw body.

```ts
import handler from '../../../netlify/functions/contact.mjs';
export const POST = (request: Request) => handler(request);
```

- [ ] **Step 3: Change browser clients to `/api/*`**

Replace each Netlify path with its same-origin Sites path and keep request schemas unchanged.

- [ ] **Step 4: Verify build and adapter tests**

Run: `node --test tests/sites-api-routes.test.mjs tests/auth-boundary.test.mjs tests/entitlement-quote.test.mjs tests/stripe-webhook-recovery.test.mjs && npm run build`

Expected: adapters, server boundaries, webhook contracts, and production build PASS.

- [ ] **Step 5: Commit**

```text
git add app/api src/services tests/sites-api-routes.test.mjs
git commit -m "feat: expose backend workflows on Sites"
```

### Task 8: Apply missing Supabase migrations and configure truthful runtime boundaries

**Files:**
- Review: `supabase/migrations/202607180002_add_tier_entitlements.sql`
- Review: `supabase/migrations/202607180003_add_payment_rpcs.sql`
- Review: `supabase/migrations/202607180004_account_operations.sql`
- Review: `supabase/migrations/202607180005_private_pricing_contexts.sql`
- Modify: `.env.example`
- Modify: `.env.netlify.example`
- Modify: `docs/DEPLOYMENT.md`
- Modify: `docs/IMPLEMENTATION_STATUS.md`

**Interfaces:**
- Produces: connected Supabase schema with entitlement/account/private-pricing functions and a Sites environment-name checklist.

- [ ] **Step 1: Verify migration dependency order and grants**

Check fixed `search_path`, service-only execute grants, RLS ownership projection, confirmed-email rules, and exact canonical tiers before mutation.

- [ ] **Step 2: Apply only missing migrations in order**

Use the connected Supabase project and record the four migration versions. Do not modify or delete user data.

- [ ] **Step 3: Verify tables/functions and advisors**

Run read-only queries for the new tables/functions, then security and performance advisors. Treat intentional service-only “RLS enabled/no browser policy” information as expected and document it.

- [ ] **Step 4: Configure available Sites variables**

Set only values securely available through connected services. Required names include `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_EXPECTED_MODE`, server-only transition Price IDs, `ACCESSREVAMP_SITE_URL`, and operator configuration. Never print values.

- [ ] **Step 5: Document credential blockers**

List any missing names without values. Keep public sign-in/checkout controls disabled or absent when their dependencies are missing.

- [ ] **Step 6: Commit documentation changes**

```text
git add .env.example .env.netlify.example docs/DEPLOYMENT.md docs/IMPLEMENTATION_STATUS.md
git commit -m "docs: record Sites runtime requirements"
```

### Task 9: Add SEO, social metadata, 404 trust details, and final quality coverage

**Files:**
- Modify: `app/layout.tsx`
- Modify: `src/app/metadata.js`
- Modify: `src/pages/results.js`
- Modify: `index.html`
- Create or replace: `public/og.png`
- Modify: `docs/QUALITY.md`
- Modify: `scripts/quality/capture-routes.mjs`

**Interfaces:**
- Produces: canonical/OG/X metadata, accurate organization/service JSON-LD, favicon, intentional 404, and seven-width capture manifest.

- [ ] **Step 1: Add route metadata contracts**

Require unique title/description, canonical URL, portfolio metadata, 404 metadata, policy links, and no unsupported organization fields.

- [ ] **Step 2: Add the finished social image**

Create one AccessRevamp-specific editorial social card after the final visual direction is stable. Inspect every rendered word; omit it if text is wrong.

- [ ] **Step 3: Add seven-width capture coverage**

Capture 1920, 1440, 1280, 1024, 768, 390, and 320 pixel routes with console, network, overflow, image, and accessibility results.

- [ ] **Step 4: Commit**

```text
git add app/layout.tsx src/app/metadata.js src/pages/results.js index.html public/og.png docs/QUALITY.md scripts/quality/capture-routes.mjs
git commit -m "feat: finish metadata and release evidence"
```

### Task 10: Complete release verification and publish the exact tree

**Files:**
- Modify only if verification finds a regression.
- Update: `docs/IMPLEMENTATION_STATUS.md`
- Update: `docs/FINAL_HANDOFF.md`

**Interfaces:**
- Produces: evidence-backed release and deployed Sites URL.

- [ ] **Step 1: Run static release checks**

Run: `npm run lint && npm test && npm run verify:assets && npm run security:local && npm run verify:requirements && npm run build`

Expected: every command exits zero with no introduced warning treated as failure.

- [ ] **Step 2: Run browser engines separately**

Run:

```text
npx playwright test --project=chromium --reporter=line
npx playwright test --project=firefox --reporter=line
npx playwright test --project=webkit --reporter=line
```

Expected: all tests PASS, including rapid lens movement and lazy images after scroll.

- [ ] **Step 3: Inspect responsive captures and special modes**

Verify seven widths, 200% zoom, forced colors, reduced motion, touch, keyboard, media failure, and slow network. Fix and rerun the smallest failing test before repeating the full gate.

- [ ] **Step 4: Run Stripe/Supabase live-connected test checks only when credentials exist**

Verify checkout creation, success, cancel, pending, async failure, duplicate webhook, refund, and three upgrade-credit transitions in Stripe test mode. Verify contact persistence and auth/account ownership. Mark unavailable credential cases blocked, not passed.

- [ ] **Step 5: Publish through the existing Sites project**

Commit the exact validated source, package with the Sites helper, save one version, deploy to the existing access level, poll to success, and verify the live homepage plus representative image/API responses.

- [ ] **Step 6: Record final evidence and handoff**

Update implementation status and handoff with routes, components, services, migrations, required variable names, tests, responsive widths, and precise blockers.

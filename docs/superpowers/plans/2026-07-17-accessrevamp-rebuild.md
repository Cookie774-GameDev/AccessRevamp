# AccessRevamp Editorial Story Rebuild Implementation Plan

> **For Codex:** Execute this plan inline with the executing-plans workflow. Use test-driven development for every behavior change and run the full verification gate before handoff.

**Goal:** Replace the current mutation-driven, dark marketing interface with the approved Editorial Story website while preserving Stripe, Supabase, Netlify Function, privacy, and catalog contracts.

**Architecture:** Keep Vite and vanilla JavaScript, but move to one application entry point, a route-aware renderer, central content data, explicit page modules, reusable components, and route lifecycle cleanup. Keep backend functions and database migrations unchanged unless a failing contract test proves a compatibility change is required.

**Visual direction:** Warm canvas and paper surfaces, deep ink, ultramarine, sun yellow, and restrained persimmon. Use an original inline SVG AR monogram, expressive editorial typography, bold asymmetrical layouts, clear labels for fictional portfolio concepts, and reduced-motion-safe interaction.

**Tech stack:** Vite 8, standards-based JavaScript modules, CSS, Node test runner, Playwright/axe, Supabase JS, Stripe Checkout through existing Netlify Functions.

---

### Task 1: Establish the modular application contract

**Files:**
- Create: `tests/rebuild-architecture.test.mjs`
- Create: `src/app/router.js`
- Create: `src/app/metadata.js`
- Create: `src/app/lifecycle.js`
- Create: `src/data/navigation.js`
- Modify: `index.html`
- Modify: `src/main.js`
- Remove: `src/offer-details.js`
- Remove: `src/portfolio.js`

1. Write failing source-contract tests requiring one module entry, central route metadata, direct portfolio-detail matching, history navigation, lifecycle cleanup, and no application-level `MutationObserver`.
2. Run `node --test tests/rebuild-architecture.test.mjs` and confirm the new assertions fail.
3. Implement the router, metadata map, lifecycle registry, and single-entry bootstrap with the smallest complete contract.
4. Run the focused test and confirm it passes.
5. Commit with `refactor: establish modular application shell`.

### Task 2: Build the visual system and shared components

**Files:**
- Create: `tests/design-system.test.mjs`
- Create: `src/styles/tokens.css`
- Create: `src/styles/base.css`
- Create: `src/styles/components.css`
- Create: `src/styles/pages.css`
- Create: `src/styles/motion.css`
- Create: `src/components/icons.js`
- Create: `src/components/brand.js`
- Create: `src/components/shell.js`
- Create: `src/components/cards.js`
- Modify: `src/main.js`
- Remove: `src/styles.css`

1. Write failing tests for the approved color tokens, AR SVG monogram, Work/Services/Process/Pricing/Contact navigation, focus states, responsive rules, and reduced-motion coverage.
2. Run `node --test tests/design-system.test.mjs` and confirm failure.
3. Implement the warm editorial tokens, typography, shell, reusable buttons/cards, accessible focus treatments, responsive navigation, and motion fallbacks.
4. Run the focused test and confirm it passes.
5. Commit with `feat: add editorial story design system`.

### Task 3: Rebuild public storytelling, work, service, and pricing routes

**Files:**
- Create: `tests/public-experience.test.mjs`
- Create: `src/data/portfolio.js`
- Create: `src/pages/home.js`
- Create: `src/pages/work.js`
- Create: `src/pages/services.js`
- Create: `src/pages/pricing.js`
- Create: `src/pages/sample-report.js`
- Create: `src/pages/process.js`
- Create: `src/pages/cinematic.js`
- Modify: `src/config.js`
- Modify: `src/cinematic-scroll.js`
- Modify: `src/cinematic-scroll.css`

1. Write failing tests for the three exact plan prices/keys, seven clearly disclosed fictional concepts, selected-work links, editorial story sections, all required public routes, cinematic route cleanup, and reduced-motion fallback.
2. Run `node --test tests/public-experience.test.mjs` and confirm failure.
3. Implement the homepage, work index/detail pages, services, pricing, sample report, process/methodology, and isolated cinematic experience using central plan and portfolio data.
4. Preserve all checkout keys, amounts, Stripe price IDs, sandbox messaging, and external-destination fallback behavior.
5. Run the focused test plus existing catalog, portfolio, and cinematic tests.
6. Commit with `feat: rebuild public editorial experience`.

### Task 4: Preserve and refine customer journeys

**Files:**
- Create: `tests/customer-experience.test.mjs`
- Create: `src/pages/contact.js`
- Create: `src/pages/auth.js`
- Create: `src/pages/dashboard.js`
- Create: `src/pages/legal.js`
- Create: `src/pages/results.js`
- Create: `src/services/contact.js`
- Create: `src/services/auth.js`
- Create: `src/services/dashboard.js`
- Create: `src/services/checkout.js`
- Modify: `src/lib/supabase.js`
- Remove: `src/checkout.js`

1. Write failing tests for the strict contact field names, server-only contact endpoint, checkout action states, auth configuration states, user-scoped dashboard reads, legal routes, success/cancel routes, and sandbox disclosure.
2. Run `node --test tests/customer-experience.test.mjs` and confirm failure.
3. Implement the form, checkout, auth, and dashboard bindings with accessible status announcements and explicit error/empty/loading states.
4. Keep Google Drive absent from all browser code and keep all backend authorization contracts unchanged.
5. Run the focused test and the full existing suite.
6. Commit with `feat: connect customer journeys to existing services`.

### Task 5: Verify, package, and open the preview

**Files:**
- Modify: `README.md`
- Create: `docs/preview-notes.md`
- Generate: `dist/`
- Package: `C:/Users/viper/Downloads/AccessRevamp-Editorial-Story-Preview/`
- Package: `C:/Users/viper/Downloads/AccessRevamp-Editorial-Story-Preview.zip`

1. Document local preview steps and the sandbox/live-operation boundary.
2. Run `npm run lint`, `npm test`, `npm run build`, `npm run check`, and `npm audit --omit=dev --audit-level=high` from a clean shell.
3. Search `dist` for environment key names, secret-like patterns, private Drive identifiers, and `MutationObserver`; fail the handoff if any private value is present.
4. Serve the production build on localhost, inspect homepage, pricing, work, contact, login, dashboard, and cinematic routes at desktop and mobile widths, and verify browser history plus reduced-motion behavior.
5. Copy the built preview folder to Downloads, create the ZIP, verify both artifacts, and open the localhost preview in Chrome.
6. Commit verification documentation with `docs: add rebuild preview and verification notes`.


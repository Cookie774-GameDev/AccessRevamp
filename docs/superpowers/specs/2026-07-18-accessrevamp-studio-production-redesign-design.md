# AccessRevamp studio production redesign

## Objective

Rebuild the existing AccessRevamp production application in place so it feels like a polished, high-end editorial creative studio and its public, customer, form, pricing, authentication, and test-payment paths are truthful and operational. Preserve the existing product, route inventory, canonical prices, Supabase/Stripe security model, case-study honesty, and Sites project.

## Evidence and baseline

The design is grounded in the supplied screenshot, the two latest screen recordings from July 18, the current production deployment, repository inspection, 125 Chromium baseline captures across 25 routes at 1440, 1024, 768, 390, and 320 pixels, and the existing three-browser Playwright suite.

Confirmed baseline issues:

- The homepage hero breaks its statement into too many lines and places disclosure language above and inside the primary visual.
- Full-page captures show large unexplained black, white, and yellow bands between meaningful sections.
- The lens grid can reflow a different card under the pointer. WebKit reproduced this as the wrong card becoming active.
- Greenline overflows horizontally by 61 pixels at 320 pixels.
- The portfolio index crops conceptual artwork at every tested width and visually repeats the AccessRevamp wrapper.
- Homepage and project artwork visibly includes phrases such as “original fictional brand imagery,” weakening the presentation.
- The final plumbing image makes AccessRevamp appear to be the plumbing business.
- The live Sites project has no environment variables. The connected Supabase project is missing the entitlement, payment-RPC, account-operations, and private-pricing migrations.
- The current production host does not automatically execute the repository's Netlify Functions, so forms, protected account data, checkout, webhooks, and private pricing cannot be claimed as production-operational on Sites.
- The Firefox/WebKit image test mistakes intentional below-the-fold lazy loading for an image failure.

## Selected architecture

Retain the existing Vinext/Next catch-all application, Vite build, native modules, Supabase, Stripe, and Sites deployment. Do not migrate frameworks or add a UI/animation framework.

Move server-authoritative logic into focused shared handlers that can be called by both the existing Netlify Function adapters and new Sites-compatible route handlers. Browser services use same-origin `/api/*` endpoints. Stripe webhook processing reads the raw request body in the server route. All price selection, entitlement credit, order fulfillment, identity verification, rate limits, and database writes remain server-side.

The Sites Worker calls Supabase and Stripe over HTTPS with server-only environment values. Public Supabase configuration is exposed only through the existing safe browser configuration boundary. Secret values never enter source, logs, screenshots, or browser bundles.

Apply only the missing forward migrations after reviewing their dependency order and verifying the connected project. Preserve RLS, service-only tables, fixed `search_path`, explicit grants, and the existing outreach send-disabled boundary.

Production email remains a documented credential/provider blocker because the audited repository has no mail transport and the repository contract forbids silently adding one. Contact persistence and honest notification state will still be implemented; no UI may claim an email was sent unless a configured provider confirms it.

## Visual system

### Shared tokens

Centralize content width, gutters, section rhythm, typography, border, radius, shadow, motion, and stacking tokens. Target a 1360-pixel content maximum, `clamp(20px, 4vw, 72px)` gutters, readable 17–19 pixel body copy, and a constrained serif display scale. Use the existing cream, coral, mint, yellow, white, and near-black palette while reducing full-viewport flat-color blocks.

The signature element is the “audit stage”: real interface captures layered with restrained annotations, an evidence rail, and a controlled before/after state. This language appears in the hero, process evidence, and closing montage without repeating a generic card grid.

### Homepage

- Compose “Your website is already telling us where customers get stuck” into three or four deliberate lines with one coral italic highlight.
- Use a balanced editorial split with concise service explanation, two actions, and layered desktop/mobile AccessRevamp interface evidence.
- Move all concept classification out of the hero and artwork. Preserve the exact repository-required disclosure once in discreet case-study metadata.
- Add lightweight pointer depth and a before/after control with reduced-motion fallback.
- Replace the long blank transitions with alternating framed, split, and full-width compositions.
- Rebuild Before / Evidence / After with realistic interface controls, annotations, equal panel heights, and restrained focus/hover expansion.
- Replace the plumbing closing image with a montage of the three concepts and audit annotations.

### Eleven lenses

Render the lenses from structured data. Each lens receives a unique code-native mini-interface rather than a reused portfolio photograph.

On fine-pointer desktop, use a stable explicit grid coordinate map. The active tile keeps its top-left anchor while it expands; neighboring tiles move through measured FLIP animation. Add hover intent and delayed close so crossing gaps cannot open unrelated cards. Reveal detail after expansion begins. Keep all cards visible and reserve a stable section height.

Focus opens the same tile. Enter and Space toggle it, Escape closes it, focus-visible remains clear, and `aria-expanded` reflects state. On touch/narrow screens, use an in-flow accordion. Tapping another tile switches active state, tapping outside closes it, and no content depends exclusively on hover. Reduced motion removes layout interpolation.

### Portfolio

Present only the three complete concept brands as the primary portfolio capability proof. Existing unrelated poster concepts may remain available only if they do not dilute the page; otherwise remove them from the public index while preserving source data.

- Greenline: forest/sage/cream/yellow, documentary lawn-care photography, sturdy humanist typography, organic image crops, service selector, ZIP check, seasonal cards, plan builder, and request flow.
- Firejar: espresso/paprika/orange/cream/gold, macro food photography, product-led asymmetric layout, rounded packaging geometry, heat and size selectors, ingredients/nutrition, serving ideas, persistent local demo cart, FAQ, and safe non-fulfilling checkout demonstration.
- Clearflow: white/navy/steel blue/aqua, technical grid, geometric sans typography, minimal radii, emergency/planned chooser, service search, diagnosis, ZIP check, appointment flow, next-step process, and mobile emergency action.

Each route includes desktop/mobile presentation, design rationale, accessibility notes, and one discreet metadata disclosure: “Original working demo — not a client engagement.” No watermark or disclaimer appears inside project artwork.

Use only verified licensed photography downloaded from source pages, stored locally, and converted to responsive AVIF/WebP derivatives. Record creator, source page, license notes, and access date in `docs/ASSET_SOURCES.md`. Do not use AI imagery, competitor assets, visible third-party logos, or remote hotlinks.

### Pricing and conversion paths

Keep Free Snapshot, $50 Homepage Reveal, $200 Complete Website Revamp, and $250 Cinematic Scroll Site. Present them as one component family. The $200 tier remains primary; the $250 tier uses a premium near-black treatment with shared geometry and a small reduced-motion-safe sequence preview.

Clarify deliverables, cumulative verified credit, FAQs, status, and mobile comparison. Every paid action calls a server-created Stripe Checkout Session in test mode. Redirect pages display verified/pending/canceled states and never infer payment from query parameters.

The contact page reads and preserves `interest`, preselects `free_snapshot`, shows the selected offer, collects the requested fields, validates on both sides, uses honeypot/rate limits, persists through Supabase, and communicates notification status honestly. The Free Snapshot route remains a bounded public-page request and never performs active scanning during submission.

### Authentication and account

Retain Supabase Auth and complete sign-up, sign-in, sign-out, password reset/magic-link recovery, confirmed-email handling, protected account routes, and useful unavailable/error states. The account view projects only the authenticated user's requests, orders, entitlement, intake, and deliverable status through RLS-backed/server-owned queries.

If required authentication configuration is absent in the final host, remove the public sign-in link rather than leaving a misleading control. Restore it only when the published flow passes.

## Accessibility, motion, SEO, and performance

Use semantic landmarks/headings, a skip link, native controls, visible focus, accessible errors/status, at least 44-pixel targets, useful alt text, decorative empty alt text, no keyboard traps, reduced-motion handling, and forced-color-compatible states.

Use transform/opacity for motion, route-scoped cleanup, and no looping decorative animation. Fix duplicate or colliding heading layers at the source.

Add unique route titles/descriptions, canonical URLs, Open Graph/X metadata, favicon, accurate organization/service structured data, portfolio metadata, an intentional 404 page, and policy links. Generate no unsupported reviews, claims, people, results, certifications, or statistics.

Keep below-the-fold media lazy, but test it by scrolling into view. Use AVIF/WebP sources, explicit dimensions, responsive sizes, small placeholders where useful, route-level demo imports, and no unnecessary animation dependency.

## Validation

Before completion:

- Run static tests, lint, build, asset verification, secret scan, and requirement verification.
- Run Chromium, Firefox, and WebKit navigation, accessibility, lens, portfolio, form, auth, and payment-contract suites.
- Capture and inspect 1920, 1440, 1280, 1024, 768, 390, and 320 pixel views.
- Test 200% zoom, keyboard, touch, rapid pointer movement, Escape, outside click, reduced motion, forced colors, slow network, and media failure.
- Verify every local image after it enters the viewport.
- Test Supabase migrations and RLS against the connected nonproduction project.
- Test Stripe only in test mode, including success, cancel, pending, failure, duplicate webhook, refund, and server-calculated upgrade credit when credentials exist.
- Verify contact persistence and notification state. Report provider delivery as blocked if no configured provider exists.
- Publish the exact verified tree to the existing Sites project and verify live routes/assets.

## Definition of complete

The redesign is complete only when every implemented claim has direct evidence. Any credential-dependent item that cannot be exercised is listed as blocked with the exact missing environment-variable names; it is never presented as passed.

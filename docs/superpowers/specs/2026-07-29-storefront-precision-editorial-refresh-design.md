# AccessRevamp storefront Precision Editorial refresh

**Status:** Approved for local implementation on July 29, 2026.

**Owner approval:** The owner selected the Precision Editorial direction and authorized the storefront changes in this document. The owner also confirmed that 87 is a verified historical count of customers served.

**Release boundary:** Build and verify locally. Do not push, deploy, modify production configuration, or change Supabase, Stripe, authentication, checkout, API, webhook, or customer-data behavior.

## Goal

Refresh the AccessRevamp homepage after the Atlas reveal so that proof, process, example work, transformations, and plan value feel deliberate, modern, and consistent with the existing brand. The result should look designed by AccessRevamp rather than generated from a generic interface template.

The existing Normal Websites vs. Cinematic Scroll Experiences section remains unchanged.

## Visual direction

Use the approved Precision Editorial system:

- warm paper and ivory surfaces;
- near-black editorial rules and frames;
- the existing serif display hierarchy;
- restrained coral, gold, mint, and yellow signals;
- compact diagrams made from native HTML and CSS;
- square or lightly rounded geometry consistent with the storefront;
- crisp motion with short durations and clear resting states;
- pixel construction only as an intentional transition for example websites.

Avoid excessive glass effects, neon gradients, generic icon grids, decorative charts without meaning, floating blobs, synthetic dashboard styling, and other common “AI-generated UI” signals.

## Homepage changes

### 1. Proof strip

Replace the first proof tile with a verified customer counter:

- animate from 0 to 87 the first time the tile enters the viewport;
- label it “Customers served” and identify it as a verified total;
- use a small restrained pulsing status dot without calling the number a live feed;
- expose 87 immediately to assistive technology and when reduced motion is enabled.

Turn the delivery tile into a compact three-stage timeline that communicates brief, build, and first delivery. Preserve the qualified three-business-day wording already used by the product.

Turn the responsive-delivery tile into a desktop-to-mobile diagram that communicates one responsive system rather than two unrelated deliverables.

### 2. Clear-conversation journey

Keep the headline “Your website should feel like a clear conversation—not a maze.”

Replace the current three boxes with a connected editorial journey:

1. Tell us what you need.
2. Choose the right depth and direction.
3. Review, receive, and launch.

Each step has a meaningful outcome, a visible connection to the next step, and a compact artifact preview. Use the surrounding space for a restrained route line, outcome labels, and a single supporting proof note rather than decorative filler.

The section must remain readable as a simple vertical sequence on narrow screens and with JavaScript unavailable.

### 3. Example website interaction

Keep the existing example website content and disclosure. Redesign the interaction so a hovered or keyboard-focused example expands rapidly toward a viewport-scale preview:

- the selected website becomes dominant;
- neighboring examples move aside with short, crisp motion;
- a pixel-build mask assembles and clears over the preview;
- the image remains sharp and uncropped enough to understand the homepage;
- pointer exit, focus exit, Escape, route cleanup, and touch dismissal restore the grid;
- touch devices receive an explicit tap-to-preview behavior instead of relying on hover;
- reduced-motion mode uses an immediate crossfade without pixel animation or large transforms.

The interaction must not trap focus, prevent scrolling, obscure permanent navigation, or modify the following cinematic comparison section.

### 4. Transformation studies

Create three original, polished homepage visuals:

- a spicy peanut-butter product homepage;
- a residential plumbing homepage;
- a lawn-care homepage.

Target a 16:9 master at 2560×1440 when generation quality supports it; otherwise use at least 1920×1080. Produce optimized WebP assets with descriptive alternative text and retain any source-generation record required by the repository’s provenance rules.

Each transformation panel starts from a clear domain cue—peanut-butter product imagery, a broken sink or plumbing problem, and lawn equipment or an unfinished lawn—and reveals the corresponding finished homepage on hover, focus, or touch. The finished interfaces should take visual inspiration from the existing AccessRevamp portfolio while remaining original.

Reuse the same three finished homepage visuals in the final “Your storefront already has potential” montage so the page has one coherent visual story.

### 5. Plan value presentation

Keep the canonical tier names, prices, upgrade arithmetic, scope, and checkout behavior unchanged.

On the homepage, redesign compact plan deliverables as tangible artifact groups rather than undifferentiated text:

- report or evidence artifact;
- desktop and mobile direction;
- page-build scope;
- campaign creative set;
- cinematic sequence and fallbacks where applicable.

Use small native diagrams, counts, and labeled groups. Do not invent deliverables, guarantees, discounts, scarcity, client results, or subscription language. The full pricing page may retain its existing information architecture unless a shared component change is required for visual consistency.

## Interaction and accessibility

- All animation uses transform, opacity, or a bounded numeric text update.
- Intersection-based effects run once and clean up when the route changes.
- Keyboard focus provides every meaningful preview available on hover.
- Touch interactions have visible controls and predictable dismissal.
- Escape closes an expanded preview.
- `prefers-reduced-motion: reduce` disables count-up, pixel assembly, and large spatial transitions.
- Forced colors retain borders, labels, and focus visibility.
- At 320-pixel reflow, proof tiles, journey steps, transformations, and plan artifacts become single-column without horizontal scrolling.
- Generated visual content has useful alternative text; decorative diagrams are hidden from assistive technology where the adjacent copy provides the same information.

## Architecture and owned frontend surfaces

Expected implementation surfaces:

- `src/pages/home.js` for semantic storefront structure;
- `src/pages/home-interactions.js` for counter and preview lifecycle behavior;
- route-scoped files under `src/styles/` for the Precision Editorial presentation;
- `src/components/cards.js` only if a homepage-specific compact-card variant is needed;
- `src/data/showcase-media.js` and `src/data/visual-assets.js` for asset metadata;
- `public/images/` for the three new optimized homepage visuals and any required source/provenance record;
- focused tests under `tests/`;
- a dated implementation note under `docs/`.

Do not change server routes, Netlify/Cloudflare handlers, Supabase migrations, Stripe catalog code, authentication, order creation, fulfillment, refunds, or outreach.

## Failure behavior

- If `IntersectionObserver` is unavailable, display 87 immediately.
- If a generated image fails, preserve the panel copy and a branded background rather than collapsing the section.
- If JavaScript fails, example websites remain normal links or figures in a readable grid.
- Repeated pointer and focus transitions must not leave fixed overlays, hidden siblings, scroll locks, or stale classes after navigation.

## Verification

Run focused static and interaction tests first, then:

```text
npm test
npm run lint
npm run build
```

Verify the homepage at desktop, tablet, 390×844, 375×667, and 320-pixel reflow. Check keyboard navigation, touch preview behavior, Escape dismissal, reduced motion, forced colors, image failure, direct navigation, history cleanup, console output, and horizontal overflow.

Review the local production preview visually before any commit containing implementation work is proposed for publishing. No push or deployment is authorized by this design.

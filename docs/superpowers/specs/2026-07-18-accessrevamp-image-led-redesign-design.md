# AccessRevamp Image-Led Redesign Design

**Date:** 2026-07-18  
**Status:** Approved direction; written specification awaiting final approval  
**Project:** Existing AccessRevamp website, redesigned in place

## Objective

Transform the current AccessRevamp website from a largely typographic collection of colored panels into a premium, editorial, image-led studio experience. The redesign must preserve the existing brand, business content, offers, pricing, navigation, calls to action, and evidence boundaries while adding original visual proof, purposeful interaction, and stronger pacing.

This is an in-place redesign of the current codebase. It is not a separate concept or replacement project.

## Non-negotiable truth boundaries

- Greenline Lawn & Grounds, Firejar Spicy Peanut Butter, and Clearflow Plumbing remain clearly identified as original fictional demonstrations.
- Generated people, products, environments, and brands must never be presented as real clients or commissioned work.
- No invented testimonials, conversion improvements, revenue, traffic, rankings, customer counts, or business outcomes.
- Existing factual business language and service boundaries remain intact unless a small copy edit improves clarity without changing meaning.
- Existing navigation, pricing, checkout paths, forms, working demo interactions, and calls to action remain functional.
- Audit examples must be labelled illustrative where they are not observations from a real authorized engagement.

## Approved creative direction: Evidence in the Frame

The visual system combines two honest forms of imagery:

1. Original photorealistic editorial imagery generated specifically for each fictional demonstration brand.
2. Real screenshots captured from the functioning demo pages after their visual upgrades.

The generated images supply emotion, material detail, and brand character. The screenshots prove that the portfolio items are working interfaces rather than static art. AccessRevamp compositions combine these assets inside browser windows, device frames, crops, annotations, and audit layers.

The result should feel like a high-end creative studio with an evidence-led point of view, not a stock-photo agency, generic SaaS template, or wall of bento cards.

## Image system

### Greenline Lawn & Grounds

Generate photorealistic editorial landscaping imagery: freshly edged residential lawn, premium hand tools, soil and grass detail, measured outdoor work, and an orderly residential environment. The visual tone is fresh, tactile, confident, and service-oriented. Avoid visible third-party logos, exaggerated mansions, staged office photography, and identifiable real businesses.

### Firejar Spicy Peanut Butter

Generate dramatic macro product and food photography for an invented spicy peanut-butter line: peanut butter texture, spoon movement, chili accents, warm directional light, and fictional packaging that does not imitate an existing brand. The visual tone is rich, playful, culinary, and premium. Product labels must be fictional and avoid readable false claims.

### Clearflow Plumbing

Generate polished residential service imagery: clean chrome fixtures, controlled water detail, professional hand tools, under-sink or utility details, and calm home environments. The tone is precise, trustworthy, clean, and urgent without fear. Avoid disaster imagery, fake technicians, fake maps, and panic cues.

### Production rules

- Store source and optimized local assets under the existing generated-assets structure.
- Produce AVIF and WebP where the current pipeline supports them, with a safe fallback format.
- Record filenames, role, dimensions, and provenance in the generated asset manifest.
- Use explicit width and height attributes or aspect-ratio containers to prevent layout shift.
- Use responsive `picture`, `srcset`, and `sizes` where multiple widths materially reduce transfer size.
- Eagerly load only the primary hero visual. Lazy-load images below the fold.
- Write useful alt text that describes the visual purpose. Mark decorative crops and textures appropriately.
- Do not ship empty gray placeholders.

## Homepage structure

### 1. Sticky navigation

Keep the current navigation structure. Make it sticky or semi-sticky with a restrained translucent cream backdrop and dark border as content moves beneath it. Links receive a refined underline or inset color transition. Current-route and keyboard-focus states remain clear. Buttons use controlled inversion and a small arrow translation.

### 2. Image-heavy hero

Retain the evidence-led headline and core call to action, but rebalance the first screen around a large visual composition.

The hero visual contains:

- a large desktop browser frame showing an AccessRevamp-style audit or transformation;
- a secondary mobile frame showing the same hierarchy at a narrow viewport;
- one or two cropped interface layers with restrained coral or mint annotation marks;
- subtle depth through controlled shadows, borders, overlap, and perspective-free translation;
- short labels such as Observed, Evidence, and Direction rather than decorative filler.

The composition must read immediately at 1440px and remain legible without clipping at 390px. It must not resemble an empty abstract radar. The existing truth-boundary statements stay visible near the main action.

### 3. Bright proof/benefit strip

Upgrade the trust rail into a high-contrast horizontal strip using yellow, mint, or coral. It communicates bounded service principles rather than invented performance statistics: public pages, human review, evidence before claims, and one-time pricing. On wider screens it may use a slow clipped track or staggered entry; reduced-motion users receive a static row.

### 4. Expandable 11 Lenses mosaic

Replace the flat ordered list with an interactive mosaic containing all existing lenses:

1. Accessibility
2. Usability
3. Mobile
4. Performance
5. Content
6. SEO/local discovery
7. Conversion
8. Monetization
9. Analytics
10. Social growth
11. Security hygiene

Each resting tile contains its number, title, one-line explanation, a small relevant image crop or code-native diagnostic visual, and an explicit Explore/plus/arrow cue. Brand colors rotate intentionally while maintaining contrast.

Expanded content contains:

- a larger relevant image or diagnostic graphic;
- a concise explanation;
- two or three examples of what AccessRevamp checks;
- a practical, non-guaranteed client outcome;
- an updated close/minus cue.

Interaction model:

- Only one tile is expanded at a time.
- Desktop pointer hover expands the active tile and pointer leave restores it.
- Focus expands the tile. Enter or Space toggles it.
- Touch taps toggle a tile; tapping another tile transfers expansion; tapping outside closes it.
- The tile itself is a semantic button or contains a semantic button with correct `aria-expanded` and relationship attributes.
- Essential title and summary content remains available in the resting state.
- The desktop grid reflows the expanded tile across additional columns/rows while the mosaic maintains a stable overall minimum height to avoid page jumps.
- Expansion, text reveal, image zoom, and cue movement use approximately 450ms with `cubic-bezier(0.22, 1, 0.36, 1)`.
- Focus-visible styles are unmistakable.
- `prefers-reduced-motion` removes layout tweening and reveal animation without removing functionality.

The interaction will use the current JavaScript/CSS architecture because no layout-animation library is currently installed. A large dependency will not be added for this effect.

### 5. Before / Evidence / After

Retain the three-part teaching concept and replace schematic boxes with genuine interface compositions.

- **Before:** a realistic fictional homepage/browser crop with competing actions highlighted.
- **Evidence:** a concise annotated finding with Observed, Possible impact, and Boundary labels.
- **After:** a revised hierarchy screenshot with one primary action and supporting proof.

Panels use dark, coral, and mint treatments. On hover or focus, a panel expands slightly within a stable container, revealing one additional explanatory detail. The information remains accessible without hover. Screenshot annotations must look like careful audit work, not generic dashboard decoration.

### 6. Process storytelling

Keep Scout, Verify, Preview, Approve, Build, and Measure. Present them as a stronger editorial sequence with a sticky visual or staged evidence stack on desktop and a linear reading order on mobile. Motion explains progression; it does not create a decorative parallax scene.

### 7. Image-led portfolio showcase

Replace abstract demo-card artwork with large real screenshots from the upgraded demos, supported by generated brand photography. Each card visibly differentiates the business task:

- Greenline: area check and quote construction.
- Firejar: heat filtering and demo cart.
- Clearflow: urgent/planned service paths and bounded guidance.

Cards include desktop or mobile framing, a small interaction label, and the existing fictional-demo disclosure. Hover gently scales or reframes the image and moves the arrow without abruptly changing layout.

### 8. Supporting sections

Free finding, pricing, deliverables, ethics, growth preview, FAQ, and final CTA remain. Recompose selected sections with cropped imagery, strong alternating backgrounds, larger editorial typography, and fewer repetitive card grids. The pricing cards and private-link behavior must not regress.

The final CTA uses a bold image-backed or split composition while preserving its current factual invitation and actions.

## Portfolio index

The portfolio index receives the same image system as the homepage. The three working demonstrations lead the page with large screenshot-led cards. Filters and existing original concept entries remain functional. The fictional-work disclosure is placed near the portfolio introduction and again where necessary to prevent ambiguity.

## Demo website upgrades

All three working demos are redesigned in place while preserving their existing interactive tasks and safe local behavior.

### Greenline

- Image-led service hero with a real-feeling landscape environment.
- Supporting photo crops beside the service-area and quote tools.
- Stronger visual before/after comparison using actual page compositions.
- Keep sample ZIPs, sample pricing, memory-only notes, live regions, and fictional scheduling behavior.

### Firejar

- Dramatic product hero and original product imagery for all three invented flavors.
- Replace CSS-only jar art as the primary product visual, while retaining accessible heat-level text.
- Keep filters, pressed states, cart announcements, prices, caveats, and local simulated checkout.
- Update copy that currently says there is no food photography, because original generated food photography will be present.

### Clearflow

- Calm, polished service hero with a fixture/water or tool environment.
- Image-backed urgent and planned paths that remain native buttons.
- Supporting photography around the ETA and water-loss tools.
- Keep the non-panic language, safety guidance, fictional call behavior, sample ZIPs, and live regions.

## Motion and interaction system

- Add restrained scroll-entry reveals using opacity, clipping, and short vertical movement.
- Prefer IntersectionObserver and class changes within the current architecture.
- Images receive a small controlled scale or overlay reveal on hover.
- Cards may reveal secondary text within reserved space.
- Buttons invert or deepen their background while arrows translate a few pixels.
- Do not add cursor followers, constant floating objects, aggressive parallax, or motion that competes with reading.
- All effects disable or simplify under `prefers-reduced-motion`.
- Content must remain visible and usable if JavaScript is unavailable wherever practical.

## Responsive behavior

The implementation is explicitly reviewed at approximately 1440px, 1024px, 768px, and 390px.

- No horizontal overflow or clipped display type.
- Browser/device compositions stack cleanly on smaller screens.
- The lens mosaic becomes a single-column accordion on touch/narrow layouts.
- Desktop sticky storytelling becomes a normal document flow on tablet/mobile when stickiness would reduce readability.
- Image crops preserve important subjects through intentional `object-position` values.
- Tap targets meet comfortable minimum sizing.
- Pricing remains four in a row on supported desktop widths, two by two on tablet, and one column on mobile.

## Accessibility and semantics

- Preserve semantic sectioning and heading order.
- Provide meaningful alt text and decorative-image handling.
- All interactive tiles, panels, filters, forms, and navigation remain keyboard operable.
- Use `aria-expanded`, `aria-controls`, live regions, and pressed states where appropriate.
- Maintain visible focus indicators and sufficient contrast across coral, mint, yellow, cream, white, and near-black surfaces.
- Do not hide essential information exclusively inside hover states.
- Avoid content movement that causes focus loss or unexpected page jumps.

## Implementation boundaries

- Work in the current branch and existing application architecture.
- Do not replace the router, framework, pricing system, or checkout architecture.
- Do not add Framer Motion or another large animation dependency.
- Generate only original imagery; do not scrape or reuse unrelated stock photography.
- Keep image generation and optimization reproducible through the existing asset manifest and scripts where feasible.
- Keep the redesign concentrated in reusable page/demo components and CSS rather than duplicating large markup patterns.

## Verification and acceptance

Implementation is complete only when:

- the homepage first screen contains a convincing image-led browser/device composition;
- all three demo sites contain original photorealistic imagery and retain their working interactions;
- homepage and portfolio cards show real screenshots from those working demos;
- all 11 lenses open and close correctly with mouse, keyboard, and touch behavior;
- only one lens remains expanded at a time;
- reduced-motion behavior is functional;
- Before / Evidence / After uses finished, annotated visual compositions;
- navigation, calls to action, pricing, private pricing context handling, forms, filters, and demos have not regressed;
- local images load with responsive dimensions, useful alt text, and below-fold lazy loading;
- the site has no horizontal overflow at the target widths;
- formatter/linting, automated tests, production build, asset verification, requirements verification, and applicable quality checks pass;
- desktop and mobile browser previews have been inspected;
- the live Sites version is updated only after the verified local build is complete.

## Out of scope

- Publishing fabricated case studies or client results.
- Connecting new third-party marketing, analytics, CRM, or production payment systems.
- Applying unapproved production database migrations.
- Replacing the existing service catalog or business model.
- Creating a separate microsite or throwaway concept instead of improving the current AccessRevamp site.

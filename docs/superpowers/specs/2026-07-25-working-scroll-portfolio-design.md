# Working Scroll Portfolio Design

## Goal

Replace the seven unrelated fictional portfolio concepts with five working website experiences:

1. Verdant Edge Lawn Care
2. Northframe Studio
3. Olympus Academy
4. Japan Through Time
5. The Moonfold Ronin

## Experience structure

The `/portfolio` route becomes a curated AccessRevamp gallery instead of a category-filtered concept archive. It uses the storefront's light stone, ink, coral, and gold visual system for its hero and introduction, then transitions into a dark cinematic showcase stage.

Japan Through Time and The Moonfold Ronin appear first as large editorial feature cards. Each card uses a real poster frame, a concise description, an explicit “Open scroll experience” action, and a disclosure that it is an original demonstration rather than client work.

The three homepage video pairs follow as full working comparison chapters. They reuse the existing `showcasePairs` data and `setupShowcaseComparisons` controller, so scrolling, dragging, keyboard focus, range input, lazy loading, and video synchronization behave exactly as they do on the homepage.

## Standalone scroll films

The two supplied sites remain isolated standalone documents under:

- `/portfolio/japan-through-time/`
- `/portfolio/moonfold-ronin/`

Isolation prevents their global selectors, fixed stages, and art-direction-specific typography from leaking into the AccessRevamp application. Each receives:

- a visible AccessRevamp portfolio return control;
- corrected UTF-8 copy and glyphs;
- lazy video loading and poster fallback;
- scroll-driven bidirectional scrubbing;
- keyboard chapter navigation;
- mobile layouts;
- reduced-motion behavior;
- accessible labels and focus states.

The existing film visuals remain intact. The new shared AccessRevamp return control uses the storefront's gold, cream, ink, and coral tokens so both experiences clearly belong to the same portfolio.

## Media and deployment

All supplied poster and MP4 assets are copied into each public experience directory. No media is generated or replaced. Every file remains below GitHub's per-file limit and Cloudflare's per-asset limit.

The standard build copies the standalone experiences into the Cloudflare static asset output. Links use ordinary document navigation rather than SPA interception, ensuring each isolated document boots from a clean page context.

## Error handling and performance

- Videos load only near the active scene.
- Posters remain visible until video data is ready.
- Failed videos fall back to their poster.
- Hidden or distant videos are paused and, for the twenty-scene film, unloaded.
- Scroll work is coalesced through animation frames.
- Reduced-motion users receive poster-based scenes without video scrubbing.
- Mobile layouts preserve readable copy and hide dense chapter rails where needed.

## Verification

- Regression tests prove the old concept names and filters are absent.
- Route tests prove all five experiences are represented.
- Asset tests prove every referenced poster and clip exists and remains within deployment limits.
- Browser tests verify scroll progress changes, video time changes where media is available, return navigation exists, no horizontal overflow occurs, and mobile/reduced-motion layouts remain usable.
- The full project lint, test, build, secret scan, GitHub CI, and Cloudflare deployment must pass.

# UrBeauty Homepage Reveal Evaluation Design

Task: `URBEAUTY-VIPERSEL2-DESIGNS-FOLLOWUP`

## Purpose

Create five clearly labeled, owner-review concepts for UrBeauty. The audience is a beauty shopper comparing practical self-care tools. Each page has one job: make the real product range easier to understand and enter.

## Content and fidelity

- Use only copy visible on public `https://urbeauty.store/` pages.
- Use exact product names and USD prices returned by the store's public product JSON.
- Use exact downloaded Shopify product imagery without retouching, recoloring, compositing, masking, or AI regeneration.
- Keep evaluation labels visibly separate from customer-facing brand content.
- Omit `Loved by 2K+` because the supplied requirements disallow unverified metrics.
- Omit the current Unsplash hero because this package focuses on exact store-owned product media.

## Directions

### Normal 01 — Ritual Shelf

Palette: Petal `#f8e8eb`, Porcelain `#fffaf8`, Plum `#3d2532`, Berry `#9c526d`, Moss `#5d6b57`.

Type: Georgia for editorial display; Arial for body and utility.

Layout: An offset editorial hero introduces a curated shelf, followed by large product cards and the exact store promise.

Signature: A translucent vertical “ritual” rail that aligns the hero copy to the product shelf.

### Normal 02 — Color Cabinet

Palette: Cobalt `#253f8f`, Ice `#dceeff`, Coral `#ff785f`, Butter `#ffe88a`, Ink `#11182d`.

Type: Trebuchet MS for geometric display; Arial Narrow for utility.

Layout: A compact masthead opens into a colorful, asymmetric cabinet of products.

Signature: Product modules behave like drawers, using color fields sampled conceptually from the real photography while leaving the images unchanged.

### Normal 03 — Quiet Utility

Palette: White `#ffffff`, Mist `#f3f5f2`, Graphite `#202420`, Sage `#708174`, Silver `#cdd3ce`.

Type: Times New Roman for restrained display; Verdana for readable utility.

Layout: A catalog index with a split hero, concise evidence-backed support copy, and a precise product table/grid.

Signature: A product index rail makes the page feel like a useful object rather than a campaign.

### Cinematic 01 — Orbit

Palette: Night `#13111a`, Orchid `#8765c2`, Rose light `#f8dce5`, Lavender `#d9c8ff`, White `#fffdfd`.

Type: Georgia for dramatic display; Arial for utility.

Layout: Full-height sticky stages move product photographs through an orbital composition during vertical scroll.

Signature: A CSS scroll-driven product orbit with a clear static reduced-motion fallback.

### Cinematic 02 — Ribbon

Palette: Aubergine `#35152e`, Poppy `#ed5e55`, Blush `#f6b8ba`, Cream `#fff4df`, Espresso `#261916`.

Type: Impact for narrow cinematic display; Georgia for supporting copy; Arial for utility.

Layout: Vertical scroll reveals wide bands that imply a horizontal film strip, alternating full-product and close-crop frames.

Signature: A continuous typographic ribbon carries exact store words between product scenes.

## Responsive and accessibility behavior

- Desktop target: 1440×1200.
- Mobile target: 390×844.
- All pages preserve semantic headings, image alt text, keyboard focus, and readable text.
- Motion is CSS-only and disabled by `prefers-reduced-motion`.
- At narrow widths, multi-column and sticky compositions become linear stacks.

## Verification

Serve over local HTTP. Capture every concept at 1440×1200 and 390×844. Record image loading, HTTP failures, console errors, text inventory, spellcheck exceptions, and SHA-256 hashes for assets and screenshots.


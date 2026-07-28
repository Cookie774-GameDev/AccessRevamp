# UrBeauty Customer Design Direction

## Decision record

- Project ID: `78794ca0-9942-45e0-8d73-1dabff57e9bd`
- Store: `https://urbeauty.store/`
- Evaluation account: `Vipersel2@gmail.com`
- Revision: `0`
- Ranking: Ritual Shelf, Quiet Utility, Color Cabinet
- Primary option ID: `71ce8406-36e9-4b3a-8ac1-73d98435d141`
- Secondary option ID: `f9981054-10c1-4395-b6ee-9c102d131432`
- Tertiary option ID: `f4cadd92-774a-4d6b-a44b-941a5e77b3de`
- Scope: private Homepage Reveal evaluation; no paid entitlement

## Primary visual direction

Use Ritual Shelf as the compositional source of truth:

- Warm ivory and blush surfaces with deep plum typography.
- Large editorial serif headline balanced by restrained sans-serif body copy.
- A calm, premium self-care mood rather than loud discount-store styling.
- Circular product staging that preserves the exact product photographs.
- Clear primary and secondary actions with generous spacing.
- A visible trust strip for shipping, return policy, and support.

## Supporting influences

From Quiet Utility:

- Keep product information, policies, and support easy to find.
- Use strong hierarchy and concise labels.
- Favor honest product understanding over sales theater.

From Color Cabinet:

- Organize the varied product photography into a deliberate modular system.
- Use color blocks sparingly to separate categories and improve scanning.
- Preserve product imagery exactly; use layout, not retouching, to create
  consistency.

## Brand and copy

Retain the store name `Ur Beauty` and its exact public logo.

Approved source phrases include:

- `Your beauty ritual starts here`
- `Glow Naturally, Feel Beautiful`
- `Curated beauty tools and skincare essentials to elevate your daily
  self-care. Simple. Effective. Beautiful.`
- `Shipping At Checkout`
- `Clear Return Policy`
- `Support First`
- `Curated for you`
- `Our Collection`

Do not use the unverified `Loved by 2K+` claim. Do not create new product
benefit claims. Product names and prices must come from the live product JSON
listed in `source-copy-map.md`.

## Asset rules

The nine exact assets in `asset-manifest.json` are the complete approved source
set for this evaluation. They are byte-verified and must not be regenerated,
redrawn, composited, recolored, or retouched. CSS crops and geometric layout
are allowed when the product remains recognizable and unaltered.

## Responsive behavior

- Desktop: editorial split hero with the product stage visible in the first
  viewport.
- Mobile: text-first hero, then product stage; no horizontal scrolling.
- Keep tap targets at least 44 CSS pixels.
- Preserve one visible `h1` and logical heading order.
- Respect `prefers-reduced-motion`; cinematic concepts become static stacked
  sections when motion is reduced.

## Evaluation status

The five concepts passed local Chromium checks at `1440×1200` and `390×844`.
The primary, secondary, and tertiary choices are the preferred test ranking.
This record authorizes only the internal handoff documents and private
evaluation state. It does not authorize production implementation, public
publication, portfolio use, or a claim that payment occurred.

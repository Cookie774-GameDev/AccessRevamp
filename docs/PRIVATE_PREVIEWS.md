# Private concept previews

AccessRevamp private previews are temporary, human-approved first-screen concepts. They are not live-site rebuilds, endorsements, connected storefronts, or public portfolio pieces.

## Create a preview

Apply migration `202607170005_complete_review_and_preview_model.sql`, then prepare a JSON file:

```json
{
  "sourceUrl": "https://store.example",
  "reviewedBy": "Reviewer name",
  "expiresInDays": 14,
  "concept": {
    "brandName": "Example Store",
    "eyebrow": "Made for everyday momentum",
    "headline": "Find the right product without the guesswork.",
    "subheadline": "A clearer hierarchy connects the product promise, one proof point, and one primary shopping action.",
    "ctaLabel": "Explore the concept",
    "proofPoints": [
      "One primary action",
      "Accessible interaction states",
      "Responsive first-screen layout"
    ],
    "theme": "midnight"
  }
}
```

Supported themes are `midnight`, `ivory`, and `graphite`.

Run:

```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
ACCESSREVAMP_SITE_URL=https://your-site.netlify.app \
node scripts/create-private-preview.mjs preview.json
```

The command prints a URL such as `https://your-site.netlify.app/preview/RANDOM_TOKEN`. The raw token is never stored; the database contains only its SHA-256 hash.

## Built-in boundaries

- Active links require a named human reviewer and approval timestamp.
- Expiry is limited to 1–30 days; 14 days is the default.
- The rendered page sends `noindex`, `nofollow`, `noarchive`, and `nosnippet` directives.
- The preview is watermarked “Private AccessRevamp Concept · Not the live website.”
- It contains no prospect logo, product image, inventory, account, form, or checkout integration.
- It uses no third-party assets and sends a restrictive Content Security Policy.
- Revoked, missing, and expired tokens do not reveal prospect details.

Delete or revoke a preview immediately when the business requests removal. Do not publish it in a portfolio without written permission.

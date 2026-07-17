# Private concept previews

AccessRevamp private previews are temporary, human-approved first-screen concepts. They are not live-site rebuilds, endorsements, connected storefronts, or public portfolio pieces.

## Prerequisites

Apply every migration in `supabase/migrations/` in filename order. The prospect and finding must already exist in the isolated `ar_*` tables, the finding must be verified by an active `ar_staff` user, and the concept approver must also be active staff.

The first owner can be added only after that person has signed up and confirmed the Supabase Auth email:

```sql
insert into public.ar_staff (user_id, role, active)
select id, 'owner', true
from auth.users
where lower(email) = lower('owner@example.com')
  and email_confirmed_at is not null
on conflict (user_id) do update
set role = excluded.role, active = true, updated_at = now();
```

## Create a standalone preview

Prepare a JSON file:

```json
{
  "prospectId": "00000000-0000-0000-0000-000000000000",
  "findingId": "00000000-0000-0000-0000-000000000000",
  "approvedByUserId": "00000000-0000-0000-0000-000000000000",
  "expiresInDays": 14,
  "concept": {
    "eyebrow": "Made for everyday momentum",
    "headline": "Find the right product without the guesswork.",
    "subheadline": "A clearer hierarchy connects the product promise, one proof point, and one primary shopping action.",
    "primaryCta": "Explore the collection",
    "secondaryCta": "Learn more",
    "proofPoints": [
      "One primary action",
      "Accessible interaction states",
      "Responsive first-screen layout"
    ]
  }
}
```

Run:

```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
PREVIEW_TOKEN_SECRET='at-least-32-random-characters' \
SITE_URL=https://your-site.netlify.app \
node scripts/create-private-preview.mjs preview.json
```

The command prints a URL such as:

```text
https://your-site.netlify.app/.netlify/functions/preview?token=RANDOM_TOKEN
```

The raw token is shown once. Supabase stores only a keyed HMAC-SHA-256 digest, so the private link cannot be reconstructed from the database.

## Built-in boundaries

- Approval requires a real active staff UUID, not a typed reviewer name.
- The linked finding must already be human-verified, attributed to active staff, and belong to the same prospect.
- Expiry is limited to 1–30 days; 14 days is the default.
- The rendered page sends `noindex`, `nofollow`, and `noarchive` directives and a restrictive Content Security Policy.
- The page states **“Private concept preview. Not the live website.”** and shows the “Private AccessRevamp Concept” watermark.
- It contains no prospect logo, product image, inventory, account, form, or checkout integration.
- It uses no third-party assets and does not link its illustrative buttons to the live storefront.
- Revoked, missing, invalid, and expired tokens do not reveal prospect details.

Revoke or expire a preview immediately when the business requests removal. Never publish one in a portfolio without written permission.

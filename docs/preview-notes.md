# AccessRevamp Editorial Story Preview Notes

## Included

- Warm Editorial Story visual system with an original inline SVG AR monogram.
- One application entry point, explicit route metadata, direct work-detail routes, browser history, and route cleanup.
- Homepage sequence: hero, selected work, three-part story, all three plans, sample report, FAQ, and contact CTA.
- Seven original fictional concepts across homepage, campaign, and cinematic directions.
- Approved target catalog: Free Snapshot $0, Homepage Reveal $50, Complete Website Revamp $200, and Cinematic Scroll Site $250, all one time. The pre-rebuild preview remains evidence only until the catalog implementation task lands.
- Strict contact payload, server-created Stripe Checkout with validated Stripe fallback, Supabase auth states, and explicitly user-scoped dashboard reads.
- Responsive layouts, visible keyboard focus, status announcements, and reduced-motion behavior.

## Local-preview boundaries

- The packaged preview is a static Vite production build. Serve it over HTTP so direct module and asset loading works correctly.
- No Supabase key, Stripe secret, webhook secret, service-role key, contact-rate-limit secret, or other deployment secret is included.
- Contact, account, customer-data, and server-created checkout behavior require the documented deployment environment and Netlify Functions.
- Configured payment fallback links are Stripe test-mode links and do not create a live charge.
- The internal Google Drive operations workspace remains internal-only and is not used as a public content or asset source.
- Live Stripe activation, Supabase schema mutation, Netlify deployment, and public publishing are outside this preview handoff.

## Recommended review routes

- `/` — complete Editorial Story landing page
- `/work` and `/work/aether-one` — portfolio index and project detail
- `/services` and `/pricing` — service truth and checkout actions
- `/sample-report` and `/process` — evidence and methodology
- `/contact`, `/login`, and `/dashboard` — configured and unconfigured customer states
- `/cinematic-scroll` — scroll-scrubbed Aether One concept with reduced-motion fallback
- `/refunds`, `/privacy`, `/terms`, and `/accessibility` — public policy surfaces

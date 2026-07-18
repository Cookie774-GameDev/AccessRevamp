# Baseline evidence

`npm run baseline` writes local, secret-safe pre-rebuild artifacts to the dated directory `docs/evidence/baseline/2026-07-18/`.

Expected artifacts:

- `inventory.json`: routes, migrations, build sizes, dependency names, environment variable names, and branch identifiers;
- `browser-results.json`: console and failed-request records by route/viewport;
- `axe-*.json`: complete axe results with payment identifiers and direct checkout URLs redacted;
- `lighthouse-*.json`: Lighthouse reports with the same recursive evidence redaction, or a factual unavailable record;
- `*.png`: route screenshots at 375, 768, 1024, and 1440 CSS-pixel widths.

The scripts must never serialize environment values, auth tokens, Stripe identifiers, preview tokens, form content, prospect data, or personal information.

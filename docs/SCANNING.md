# Passive public-homepage scanning

The scanner creates candidate evidence for a reviewer. It is not a compliance certificate, security test, lead harvester, or autonomous source of truth.

## Installation and use

```bash
npm ci
npx playwright install chromium
npm run scan -- --url https://store.example --out artifacts/scans/store-example
```

The output directory contains:

- `homepage.png` — a full-page screenshot.
- `report.json` — axe-core results, page structure, deterministic checks, timing, and explicit limitations.

## Network boundary

The scanner:

- accepts one explicitly supplied public HTTP(S) URL;
- blocks credentials in URLs, non-standard ports, localhost, private, link-local, reserved, multicast, and documentation networks;
- resolves hostnames before use and checks each routed subresource hostname;
- allows only `GET` and `HEAD` requests;
- blocks service workers and downloads;
- does not click, submit, type, create accounts, add to cart, open checkout, or probe private routes.

Operators must still respect site terms, robots directives, rate limits, and removal requests. Do not run broad discovery or repeated scans against the same business without a legitimate operational reason.

## Human-review rule

Every scanner report is marked `candidate_needs_human_review`. Before a result becomes a `verified` finding, a person must confirm the affected element, context, user group, business task, severity, WCAG reference, repair effort, and proposed fix. False or ambiguous signals must be rejected rather than softened into a sales claim.

# Passive public-homepage scanning

The scanner creates candidate evidence for a reviewer. It is not a compliance certificate, security test, lead harvester, or autonomous source of truth.

## Installation and use

```bash
npm ci
npx playwright install chromium
npm run scan -- --url https://store.example --out artifacts/scans/store-example
```

The output directory contains:

- `homepage.png` — a bounded screenshot of up to the first 6,000 vertical pixels. The report states when the document was taller than the captured area.
- `report.json` — axe-core results, bounded page structure, deterministic checks, timing, truncation metadata, and explicit limitations.

## Network boundary

The scanner:

- accepts one explicitly supplied public HTTP(S) URL;
- blocks credentials in URLs, non-standard ports, localhost, private, link-local, reserved, multicast, translation, and documentation networks;
- resolves hostnames before use, checks every routed subresource hostname, and retains only in-flight DNS lookups rather than trusting a persistent hostname cache;
- allows only `GET` and `HEAD` requests;
- blocks service workers, WebSocket egress, downloads, and popup pages;
- does not click, submit, type, create accounts, add to cart, open checkout, or probe private routes.

Operators must still respect site terms, robots directives, rate limits, and removal requests. Do not run broad discovery or repeated scans against the same business without a legitimate operational reason.

## Resource boundary

A public page is untrusted input. To reduce denial-of-service and oversized-artifact risk, the scanner rejects a declared main document over 12 MB, stops before axe analysis when the DOM exceeds 50,000 elements, caps extracted collections at 250 entries each, truncates long string fields, and records omitted counts. These controls are operational guardrails, not a guarantee that every hostile page is harmless; run the scanner in an isolated worker with CPU, memory, time, and filesystem limits.

## Human-review rule

Every scanner report is marked `candidate_needs_human_review`. Before a result becomes a `verified` finding, a person must confirm the affected element, context, user group, business task, severity, WCAG reference, repair effort, and proposed fix. False or ambiguous signals must be rejected rather than softened into a sales claim.

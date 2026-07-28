# UrBeauty Homepage Reveal Evaluation Package

Task: `URBEAUTY-VIPERSEL2-DESIGNS-FOLLOWUP`

Status: local evaluation artifacts only. Nothing in this directory was published, uploaded, or inserted into customer records.

## Concepts

1. `concept-01-ritual-shelf.html` — normal homepage direction
2. `concept-02-color-cabinet.html` — normal homepage direction
3. `concept-03-quiet-utility.html` — normal homepage direction
4. `concept-04-orbit.html` — cinematic-scroll direction
5. `concept-05-ribbon.html` — cinematic-scroll direction

## Controlled Supabase evaluation mapping

The private orderless evaluation is stored under project
`78794ca0-9942-45e0-8d73-1dabff57e9bd`. It has no order, entitlement, or paid
workflow.

| Concept | Design option ID | Test rank |
|---|---|---:|
| Ritual Shelf | `71ce8406-36e9-4b3a-8ac1-73d98435d141` | 1 |
| Color Cabinet | `f4cadd92-774a-4d6b-a44b-941a5e77b3de` | 3 |
| Quiet Utility | `f9981054-10c1-4395-b6ee-9c102d131432` | 2 |
| Orbit | `4f3b417c-fd69-4611-b4df-6d8947a0e999` | — |
| Ribbon | `da801e2e-0b1b-4560-9a3a-eb0030a27b60` | — |

Each HTML file is self-contained except for exact local image files in `assets/`. All CSS and behavior are inline; all visible interface text remains editable HTML.

## Evidence

- `asset-manifest.json` — exact source URLs, native dimensions, byte sizes, and SHA-256 hashes
- `source-copy-map.md` — public source mapping and per-direction rationale
- `design-review.md` — visual, rights, fidelity, responsive, and risk review
- `screenshots/` — five 1440×1200 PNGs and five 390×844 PNGs
- `evidence/browser-verification.json` — local-HTTP status, image, console, layout, and text checks
- `evidence/text-inventory.txt` — DOM/OCR-like visible-text inventory
- `evidence/spellcheck.json` — source-vocabulary spellcheck evidence
- `evidence/hashes.json` — fresh asset, HTML, and screenshot SHA-256 results

## Reproduce

From the `AccessRevamp` repository:

```powershell
node docs\evidence\urbeauty-vipersel2-evaluation\verify-concepts.mjs
node docs\evidence\urbeauty-vipersel2-evaluation\audit-copy.mjs
```

The first command starts an ephemeral localhost HTTP server, captures all ten screenshots through Chromium, and closes the server.

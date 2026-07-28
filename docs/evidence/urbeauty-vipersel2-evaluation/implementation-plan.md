# UrBeauty Evaluation Concepts Implementation Plan

**Goal:** Build and verify five exact-asset UrBeauty homepage concepts inside the bounded evidence directory.

**Architecture:** Each concept is an independent HTML document with inline CSS and small inline progressive-enhancement scripts where needed. All product media is served from a sibling `assets/` directory through a local HTTP server.

**Tech Stack:** Semantic HTML, CSS, minimal vanilla JavaScript, Playwright screenshot verification, PowerShell hashing.

## Global Constraints

- Research only public `urbeauty.store` pages.
- Do not alter or AI-generate product imagery.
- Use editable HTML text and exact verified store copy.
- Do not invent testimonials, metrics, or claims.
- Do not publish, upload, or touch application/database files.

## Tasks

- [x] Inventory public homepage and product sources.
- [x] Download nine exact Shopify assets and compute SHA-256 hashes.
- [x] Build three normal responsive concepts.
- [x] Build two cinematic-scroll responsive concepts with reduced-motion fallbacks.
- [x] Serve all files locally over HTTP.
- [x] Capture five desktop and five mobile screenshots.
- [x] Verify image loads, console output, HTTP failures, responsive overflow, editable text, and text inventory.
- [x] Record asset/screenshot hashes, source mapping, spellcheck evidence, and design review.

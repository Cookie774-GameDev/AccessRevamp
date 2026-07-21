# Skill: Safe Security Audit

## Goal

Produce useful security findings without harming the target, exceeding customer authorization, exposing sensitive data, or overstating passive evidence.

## Modes

### Passive mode — default

Review public headers, TLS/redirect behavior, cookies, scripts, dependencies, forms, authentication UX, source-map exposure, cache behavior, framing, content security policy, referrer policy, permissions policy, MIME handling, and customer-supplied configuration evidence. Use synthetic data and avoid state changes.

### Authorized active mode

Active testing is allowed only when `project_security_authorizations` has a matching active, unexpired record. Follow the exact targets, methods, time window, exclusions, request rate, data rules, and emergency-stop contact. The database rejects active-security findings without the authorization ID.

## Prohibited actions

No brute force, credential stuffing, denial of service, persistence, malware, destructive payloads, data extraction, privacy invasion, bypass of access controls, scope expansion, or production form/checkout submission without explicit scope. Stop when ownership, stability, or authorization is unclear.

## Finding structure

Target; authorization/mode; title; evidence; severity; confidence; affected user/business task; limitations; remediation; safe retest; source; reviewer; review time. Keep candidate findings private until human review. Customer-visible wording must not claim breach, compromise, legal noncompliance, or certification without independent proof.

## Output

`SECURITY_REVIEW.md`, structured `project_findings` rows, redacted evidence, and a test manifest. Each artifact must remain under 9,000,000 bytes or be split and hashed.

## Completion gate

All findings are reproducible, deduplicated, scoped, redacted, human-reviewed, and paired with actionable remediation. No prohibited action occurred.

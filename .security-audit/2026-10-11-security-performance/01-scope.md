# Security audit scope

## Authorization and boundary

Target: the Pocket repository at `C:\Users\spoop\OneDrive\Documents\Class\Side\astra\pocket\pocket-main`.

The user authorized a local source review, safe local HTTP checks, dependency audit, performance audit, and remediation of findings.

Allowed execution boundary: this checkout and locally started loopback services only.

No production hosts, public deployment, third-party APIs, real accounts, or private ledger data are in scope.

## Assumptions

- The repository's documented Render deployment and optional Neon database are not tested directly.
- `.env` is treated as secret configuration and is never read into the audit record or sent to any remote service.
- Existing browser-profile directories are user-owned test artifacts and are not modified.

## Exclusions

- Penetration testing of Render, Neon, Gemini, or any external network target.
- Credential guessing beyond the existing local authentication tests.
- Availability testing intended to exhaust resources.

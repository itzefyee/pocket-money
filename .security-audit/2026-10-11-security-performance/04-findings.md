# Findings

## SA-001: HTML responses lack Content-Security-Policy

Severity: Low.

Confidence: Confirmed.

Affected location: `server.js`, shared `security` response-header object.

Evidence: a locally started server returned `null` for `Content-Security-Policy` on `/`, `/app.js`, and `/api/capabilities`.

Impact: existing output escaping and static-file restrictions are the primary XSS controls. A future escaping regression or browser-side dependency compromise would have no browser-enforced resource and script execution boundary. The application has an optional remote OCR script, so an allowlist must preserve that intentional capability.

Reproduction: start `createServer({apiKey: ''})`, request a local path, and inspect the `content-security-policy` response header.

Severity rationale: no exploitable injection sink was confirmed in the reviewed paths, so this is defense-in-depth rather than a confirmed XSS vulnerability. It applies to a finance application that dynamically renders ledger information, which makes the missing protection actionable.

## Confirmed negative results

- `npm audit --omit=dev --json` found no known dependency vulnerabilities.
- The 51-test suite passed with 49 passes and 2 expected database skips.
- Syntax checks passed.
- The server already sets `nosniff`, `DENY` frame protection, `no-referrer`, Permissions Policy, and appropriate API cache control.

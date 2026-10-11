# Inventory

## Verified stack

- Node.js ESM HTTP server with a hand-maintained static-file allowlist.
- Browser-native ES modules, HTML, CSS, and browser storage for local-only mode.
- Optional PostgreSQL persistence through `pg` 8.23.1.
- Optional Gemini endpoints for receipt extraction and assistant query plans.
- Optional password-backed, database-mode authentication with scrypt password hashes and server-side sessions.

## Entry points and trust boundaries

| Surface | Protection observed |
| --- | --- |
| Static HTML, CSS, JS, font, SVG | Exact allowlist in `server.js`; unknown paths return 404. |
| Loopback server | Binds to `127.0.0.1` unless a configured public URL exists. |
| Public deployment hostname | Requires configured HTTPS origins and rejects unrecognised `Host` values. |
| Database workspace API | Authentication, same-origin check for writes, JSON content type and size limit, schema validation, optimistic revision control. |
| Authentication | HttpOnly, SameSite=Lax session cookie; `Secure` and `__Host-` cookie name on HTTPS; login throttling. |
| AI endpoints | Same-origin POST checks, JSON and size validation, optional key held server-side, bounded concurrent requests, provider response validation. |
| Browser rendering | Dynamic text is escaped before template insertion in the assistant; fixed SVG icon markup is inserted. |

## Sensitive flows

- Credentials and provider API keys enter only server-side configuration.
- Database-mode ledger records remain behind an authenticated session.
- The optional assistant sends a constrained question/context plan request rather than transactions or calculated answers.
- Receipt data is optionally sent to the configured Gemini provider only after explicit browser selection.

## Verification commands

- `npm.cmd audit --omit=dev --json`
- `npm.cmd test`
- `npm.cmd run check`

All three completed successfully during discovery. The dependency audit reported zero known vulnerabilities. The test suite reported 49 passes and 2 expected PostgreSQL skips.

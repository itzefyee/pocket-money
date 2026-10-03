# Verification record

## On-page sign-in (2026-10-03)

A clean Edge run against the previous deployment completed the native HTTP Basic challenge with the configured credentials and opened the dashboard.
The reported failure was not reproduced with those credentials, but the old entry point exposed only a browser prompt and had no in-app recovery.
Replaced that entry point with a styled login page and seven-day sessions stored as hashed random tokens in Neon.
46 Node tests pass, covering redirects, private API protection, incorrect credentials, origin validation, HttpOnly/Secure cookie flags, throttling, session reuse, password changes, and logout revocation.
The database browser check now enters credentials through the real form and verifies inline error recovery, password visibility, automatic navigation, reload persistence, separate devices, and sign-out.
Login layouts were checked at 1440px, 390px, 320px, and 740px landscape without horizontal overflow.
Inspected screenshots are saved in the ignored `.impeccable/review/login-*.png` files.
Deployed commit `c670719` to the existing Render URL and exercised the public HTTPS login page without injected authentication headers.
The live form recovered from an incorrect password, accepted the real password with Enter, and opened the unchanged 99-record workspace.
Confirmed a Secure, HttpOnly session cookie, persistence after reload, sign-out returning to the form, HTTP 401 for records after sign-out, and zero browser exceptions.
The existing Pocket password was preserved.

## Live Neon storage (2026-10-03)

Created the dedicated `pocket` Neon project in Singapore and initialized six relational tables with 99 demonstration transactions, three accounts, nine budgets, two goals, and settings.
The 43 existing Node tests and syntax checks pass.
The additional integration test passed against live Neon in an isolated schema, checking full record round trips, concurrent revision conflicts, rollback after a SQL error, foreign keys, positive cents, removals, and reopening the connection.
All 23 existing Edge browser checks pass in local storage mode.
Two isolated Edge browsers verified database saves, shared records, stale-save rejection, persistence after reload, sample isolation, responsive layout, and zero unhandled browser exceptions.
Desktop and mobile screenshots are stored in the ignored `.impeccable/review/database-*.png` files.
The browser review caught an outdated device-only storage label; database workspaces now display `Saved to database`.
Deployed commit `e127c67` to the existing Render service at https://pocket-money-w328.onrender.com with its existing access password preserved.
Live HTTPS checks confirmed database capabilities, HTTP 401 for unauthenticated records, and 99 seeded records.
An authenticated Edge browser created a temporary one-cent record, reloaded it from Neon, and deleted it; the final workspace matched the original seed exactly.
Live desktop and mobile screenshots are saved as `.impeccable/review/neon-live-*.png`, with no unhandled browser exceptions.
The server tests also pass with real deployment environment variables present; test servers explicitly isolate their passwords and allowed origins from the host environment.
Earlier entries below describe historical checks before Neon was connected.

Neon follow-up: the setup guide and `.env.example` now target Neon pooled connections, with Render hosting only the app.
The existing `pg` driver parsed the example Neon URL with TLS certificate verification enabled.
All 43 Node tests, `npm run check`, and `git diff --check` passed after the configuration update.
No Neon connection string or API credentials were available, so a live Neon connection has not been verified.

2026-10-03. Added optional PostgreSQL personal-workspace storage with HTTP Basic password protection, server validation, and revision checked saves.
All 43 Node tests, `npm run check`, and 23 Edge browser checks passed.
The PostgreSQL 16 adapter was exercised against a temporary Docker database for table creation, read, insert, update, and stale revision rejection.
An authenticated HTTP request through `server.js` then saved and read a workspace against that database.
The 23 browser checks exercised the existing localStorage mode.
A separate headless Edge check supplied the password with authenticated browser requests, opened the personal workspace, saved a transaction, reloaded, and confirmed it remained in PostgreSQL.
No external hosted database or deployment was configured.

## Render deployment preparation (2026-10-02)

On Node 24.4.1, all 40 Node tests and `npm run check` passed.
The added server test sends requests with Render's public hostname and checks HTTPS origin validation, asset delivery, API access, rejection of an unrelated hostname, and the health endpoint.
The test uses a stub provider; live Gemini access was not tested.
The follow-up custom-domain regression first returned HTTP 403 for the configured domain, then passed after allowing the explicit `POCKET_PUBLIC_URL` HTTPS origin.
It also confirms that an AI request from the Render origin cannot be submitted through the custom-domain host.
The full Node suite now passes 41 tests, `npm run check` passes, and Render CLI v2.28.0 validates `render.yaml` with `valid: true`.

2026-10-02. Tested on Node 24.15.0 and headless Microsoft Edge on Windows.

## Domain and API

39 Node tests passed after the optimization pass: 11 domain tests, 17 assistant query tests and 11 server/API tests. Initial implementations and focused corrections were preceded by failing tests. Provider integration uses stub responses, not a live key. Latest additions check complete signed amount parsing, compressed/conditional asset delivery, uncached APIs and cancellation propagation to both upstream AI endpoints.

Assistant regressions cover exact-cent totals, transfer exclusion, combined amount bounds, date scopes, merchant searches, contextual follow-ups and filter resets, equal-elapsed-day comparisons, budget scope, unsupported questions, invalid plans, request-origin checks, removal of ledger data from provider requests, and replacement of untrusted model clarification prose.

## Browser

Desktop 1440px and mobile 390px screenshots opened and inspected. Additional layout checks at 320, 768, 1024, and 1920px. All five routes tested for mobile overflow. No unhandled browser errors.

Flow coverage: capture and review, save and reload, search, edit, delete/undo, budgets, goals, debt opening balance, personal/demo isolation, CSV preview/import, safe user text rendering, same-account transfer rejection, voice transcript review, receipt UI, keyboard month/chart focus, dialog Escape, and named buttons. Final supplemental run verifies original capture-field focus after save.

Latest full regression run: 22 existing-app checks, 17 assistant checks, 18 interaction regressions and 32 layout checks passed. All six routes were checked with long labels and large balances at 1440×1000, 768×900, 390×844, 320×568 and 740×390. Additional flows include exact ledger-backed answers, evidence-to-editor focus restoration, comparisons, budget checks, unknown merchants, unsupported intent, HTML escaping, isolated conversations, older-answer follow-ups, Enter submitting once, simulated AI interpretation and visible local fallback. Dedicated desktop/mobile captures were inspected; the composer fits above bottom navigation and remains reachable in landscape.

Interaction regressions cover quick/settings/capture drafts, repeated submit events, pagination focus, cancelled CSV/restore reads, stale transaction edits, month boundaries, skip navigation, microphone lifecycle, storage failure/retry, export/file-picker wiring, restore confirmation, goal undo, account editing, capture keyboard tabs and interrupted AI capture. Tests use actual pointer events for relevant controls; file dialogs, microphone recognition and AI timing are simulated where noted in scripts.

Actual browser OCR passed with downloaded Tesseract assets after network access was granted. It recovered the exact fixture merchant/date/category/total and did not use cash tendered or change as the amount. No real user's receipt or financial data was used.

## Review

Independent reviewer initially requested fixes for numeric ambiguity and keyboard focus. Both resolved with regression coverage. Mobile navigation increased to 12px with compact labels. Reviewer re-opened both final screenshots and issued `ship` on the cited fixes. A separate documenter aligned DESIGN.md and design.json with the CSS.

The independent Ask Pocket review identified unrelated date questions becoming totals, incomplete multi-month/amount scope, incompatible follow-up filters, untrusted clarification prose and sidebar text contrast. All were corrected. Focused re-review independently confirmed the parser fixes and API regression, measured the corrected contrast at 5.78:1, and issued `ship` with no remaining material findings. Separate delayed-response checks confirmed workspace isolation, cancellation of cleared conversations and no transaction/opening-balance data in provider payloads.

The optimization reviewer independently verified repaired follow-up context, capture precision, skip navigation, microphone state, cached-answer refresh after transaction edits and draft retention, with zero browser exceptions. Final disposition: approve on correctness, no material blockers. Root completed all 32 layout checks and the real OCR check. See [optimization measurements](optimization.md).

## Limits

No live Gemini request, real microphone audio, physical mobile camera, bank integration, cross-device sync, comprehensive screen-reader session or production penetration test was performed. OCR accuracy on arbitrary real receipts remains variable and every result requires review.

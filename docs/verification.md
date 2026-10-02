# Verification record

## Render deployment preparation (2026-10-02)

On Node 24.4.1, all 40 Node tests and `npm run check` passed.
The added server test sends requests with Render's public hostname and checks HTTPS origin validation, asset delivery, API access, rejection of an unrelated hostname, and the health endpoint.
The test uses a stub provider; live Gemini access was not tested.

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

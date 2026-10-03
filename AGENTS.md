# Working in Pocket

Pocket is a local, single-user finance app built with browser ES modules and a Node HTTP server. Read [README.md](README.md) for setup and behavior. [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md) record product and visual decisions. Development notes are indexed in [docs/README.md](docs/README.md).

## Code map

- `domain.js`: integer-cent money operations, validation, capture parsing, CSV import/export, and summaries. Keep financial calculations here.
- `seed.js`: sample data. `format.js`: presentation formatting.
- `app.js`: routing, localStorage workspaces, transactions, capture review, and UI state. `index.html`, `styles.css`, `assistant.css`, and `icons.js` support the interface.
- `capture.js`: browser speech and lazy local receipt OCR.
- `assistant-query.js`: local, read-only question interpretation and aggregation. `assistant-ui.js`: conversation UI. `assistant-api.js`: validation for optional provider plans.
- `server.js`: loopback static-file allowlist and optional Gemini endpoints. Keep private files and the API key out of browser responses.
- `auth.js`: server-side session authentication. `login.html`, `login.css`, and `login.js`: public sign-in page. Keep ledger APIs behind a valid session and credentials out of browser storage.
- `tests/`: Node domain, assistant, and server tests. `scripts/`: Edge browser checks; see [scripts/README.md](scripts/README.md).
- `assets/`: self-hosted font and license. `.impeccable/design.json` is a design artifact; `.impeccable/review/` holds generated reports and is ignored.

## Working rules

- Use Node.js 22.9 or newer and `npm ci` to install the PostgreSQL driver. Run `npm test` and `npm run check` after code changes; use `npm.cmd` if PowerShell blocks `npm.ps1`.
- Preserve sample and personal workspace separation. Browser localStorage is the source of truth without database mode; Neon owns the personal workspace when configured. Changes to persistence and restore need validation and migration care.
- Store and calculate money as integer cents. Keep transfers separate from income and spending. Extraction and import results must be reviewed before saving; ambiguous amounts stay empty.
- Keep the assistant read-only. Validate model plans on the server and evaluate them against the current ledger in the browser. Do not send ledger rows or calculated answers to the provider.
- Keep optional AI opt-in, server-side credentials, loopback binding, and the static-file allowlist. Do not commit secrets, personal records, browser profiles, or generated review output.
- Update the root README when commands, features, data handling, or limits change. Update relevant notes under `docs/` when verification evidence changes.

## Verification

Run `npm test` and `npm run check` from the repository root. Browser scripts require a running `npm start` server and Microsoft Edge on Windows; see [scripts/README.md](scripts/README.md). Check `git status` before committing so only intended files are staged.

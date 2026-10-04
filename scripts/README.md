# Browser checks

Run these from the repository root after starting `npm start` in another terminal. They require Microsoft Edge on Windows. Checks use isolated `.browser-profile-*` directories and write generated results under `.impeccable/review/`; both locations are ignored by Git.

| Command | Coverage |
| --- | --- |
| `npm run test:browser` | Main app flows |
| `npm run test:assistant-browser` | Ask Pocket flows |
| `npm run test:interactions` | Interaction regressions |
| `npm run test:navigation` | Starts its own server; profile menus, keyboard navigation, sidebar preference, responsive layouts, and backup downloads |
| `npm run test:layout` | Responsive layouts |
| `npm run test:performance` | Synthetic performance run |
| `node scripts/ocr-check.js` | Generated receipt with real browser OCR; first use downloads Tesseract assets |
| `npm run test:database-browser` | Starts its own server; checks sign-in, registration, error recovery, sign-out, separate users, database saves, separate browsers, conflicts, reload, and sample isolation against Neon |

The database browser check requires `DATABASE_URL` in `.env` and creates a randomly named `pocket_test_*` schema, then removes only that test schema.
It does not modify the live `pocket` tables.
The database integration test in `tests/database.test.js` runs when `POCKET_TEST_DATABASE_URL` is set and uses the same schema isolation.
It verifies round-trip fidelity, concurrent saves, rollback, constraints, deletions, migration from the original schema, per-user ledgers, and reopening the connection.

Use `npm.cmd` in PowerShell if execution policy blocks `npm.ps1`. `browser-tools.js` is shared support code, not a standalone check. `POCKET_BROWSER` can override the Edge path for checks using that helper; `ocr-check.js` currently uses a fixed Edge path.

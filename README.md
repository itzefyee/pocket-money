# Pocket

A local-first money workspace. Understand spending at a glance, capture an expense in a sentence, turn receipt photos into reviewable transactions, and ask questions about your records.

## Run

Requires Node.js 22.9 or newer.

```powershell
npm ci
npm start
```

Open **http://127.0.0.1:4317**. The default is a clearly labeled sample workspace. Select **Make it yours** to open your separate, empty personal workspace. Currency defaults to MYR.

Run the command from the project root. On Windows PowerShell, use `npm.cmd start` if the execution policy blocks `npm.ps1`.

The server binds to loopback and rejects unrelated hostnames.
Browser-only mode is a local workspace without sign-in.
Database mode supports separate signed-in users and personal ledgers.
Desktop and mobile layouts work in the browser; opening it from a separate phone requires a separately configured secure hosting setup.
Do not expose this local server directly to the internet.

## Deploy on Render

Connect a Git repository containing this project to Render and create a Blueprint from [render.yaml](render.yaml).
The Blueprint runs the tests and syntax checks, starts a Node web service on Render's free plan in Singapore, and checks `/health`.
Render supplies the public URL and port; Pocket accepts that exact hostname over HTTPS and keeps the localhost development address working.
If you attach a custom domain in Render, set `POCKET_PUBLIC_URL` in the service environment to its exact HTTPS origin, such as `https://pocket.example`.
Pocket then accepts both the Render address and that domain, while AI requests still require the same origin as the address used to open the app.
Do not copy `.env` to Render.
The deployed app runs without a Gemini key, so optional AI extraction and understanding stay off.

Without a database, each browser keeps its own sample and personal workspaces in localStorage.
Records from `127.0.0.1` do not automatically appear at the Render address; use Settings backup and restore if you want to move them.
The Render URL is publicly reachable. Without database mode, Pocket has no access control, so use it only with data you are comfortable keeping in that browser and do not add a shared `GEMINI_API_KEY` to the public service.
Pocket refuses to start when a public URL and `GEMINI_API_KEY` are configured without both `DATABASE_URL` and `POCKET_ACCESS_PASSWORD`.
Render's free service may take time to respond after inactivity.

## Private Neon database

Pocket uses Neon Postgres to save a separate personal workspace for each registered user across their devices.
The Node server connects using the existing `pg` driver and `DATABASE_URL`, following [Neon's Node.js connection guidance](https://neon.com/docs/guides/node).
Create a project in the [Neon Console](https://console.neon.tech), choose a region near your Render service, and open **Connect**.
Select the database and role, enable **Connection pooling**, and copy the connection string.
The pooled hostname contains `-pooler`; Pocket's queries work with [Neon's transaction pooling](https://neon.com/docs/connect/connection-pooling).
Set both `DATABASE_URL` and `POCKET_ACCESS_PASSWORD` on the server, then restart.
Use `sslmode=verify-full` in the connection string to require TLS and verify the database server's certificate.
The Pocket password must have at least 16 characters and should differ from the Neon database password.
Open Pocket to see the on-page sign-in form, with username `pocket` already filled in.
To start fresh, choose **Create an account**, enter your name, choose a unique username and a password of at least 12 characters, then choose **Create my Pocket**.
Usernames contain 3-32 letters, numbers, underscores or dashes, are case-insensitive, and cannot use the reserved name `pocket`.
Registration signs you in and opens your own personal ledger with zero balances, no transactions, no budgets and no savings goals.
The starter accounts are Main account, E-wallet and Cash; rename them and set opening balances in Accounts.
Open Budgets & goals and choose **Add a budget** to create your monthly category limits.
Other people can register on the same deployment and get separate personal ledgers.
Each account can explore the sample workspace separately from its personal records.
Sign in again with the username and password you chose.
Password reset and account deletion are not available yet.
The original `pocket` login still accepts `POCKET_ACCESS_PASSWORD` and opens the existing workspace, preserving its records.
Everyone who knows that original access password can open that original workspace, so use your own account for personal records.
Incorrect details show an inline error without opening a browser password prompt.
The original login password is the server's `POCKET_ACCESS_PASSWORD`, not your Neon or Render account password.
Registered passwords are stored as salted scrypt hashes using [Node's crypto API](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback).
Sessions last seven days, survive server restarts, and use an HttpOnly, SameSite cookie with Secure enabled on HTTPS.
Only a hash of the random session token is stored in Neon; the password is never saved in browser storage.
Open the profile menu and choose **Sign out** to revoke the current session.
The profile control appears in the sidebar on desktop and the top bar on mobile, with only one visible at a time.
The profile menu also offers Settings, a backup download, and switching between personal and sample workspaces.
Use the sidebar button beside the desktop breadcrumbs to collapse or expand navigation; Pocket remembers your choice in this browser.
Changing `POCKET_ACCESS_PASSWORD` and restarting invalidates existing sessions on every device, including registered-user sessions.
Registered users can then sign in again with their own unchanged passwords.
Use HTTPS for any public address.
The sample workspace stays in each browser; only the personal workspace is stored in PostgreSQL.
Database mode creates the `pocket` schema and eight tables at startup: `users`, `workspaces`, `settings`, `accounts`, `transactions`, `budgets`, `goals`, and `sessions`.
Startup upgrades existing single-workspace tables and sessions without deleting or copying their records into new accounts.
The Neon role needs permission to create schemas and tables.
Amounts are integer cents, transactions reference valid accounts, and each save updates all tables and its revision in one database transaction.
An existing `public.pocket_workspace` snapshot is migrated once into these tables without deleting the original snapshot.
For the original `pocket` login only, an empty database workspace copies any existing personal workspace from that same browser origin, or creates an empty one.
Registered accounts always start fresh and never copy an earlier user's browser records.
A database that already has data always wins over browser storage.
New browsers open the database workspace by default; an explicitly selected sample workspace remains separate and local.
Download a JSON backup before enabling it if you want a separate copy.
Saves check the current revision, so a stale tab or device is told to reload instead of overwriting newer data.
If the database is unavailable, saves stop with an error.

For local development connected to Neon, copy `.env.example` to `.env`, then replace the placeholders with your project credentials:

```text
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-YOUR_ENDPOINT-pooler.YOUR_REGION.aws.neon.tech/neondb?sslmode=verify-full
POCKET_ACCESS_PASSWORD=choose-a-long-unique-password
```

For Render, set `DATABASE_URL` on the web service to the Neon connection string and set `POCKET_ACCESS_PASSWORD` as a secret environment variable, then redeploy.
Neon hosts the database; Render hosts the app.
The Blueprint installs dependencies, runs checks, and deploys the web service; it does not create a Neon project or set database credentials for you.
Keep both secrets out of Git and keep regular JSON backups from Settings.

To create the tables before starting the server, run `npm run db:setup`.
To populate an empty database with the existing demonstration ledger, run `npm run db:setup -- --sample`.
To migrate a downloaded Pocket JSON backup, run `npm run db:setup -- path/to/backup.json`.
These import commands initialize the original `pocket` workspace only and refuse to replace its existing records.
Registered users restore backups into their own workspace through Settings.
Use the app's reviewed backup restore flow if you intend to replace existing records.
Sample initialization copies 99 transactions, three accounts, nine budgets, two goals, and the sample settings into the database workspace.
These are demonstration records, not a bank feed.

## What works

- Overview: month selection, income, expenses, budget remainder, net cashflow, six-month charts, category allocation, recent transactions and goals.
- Quick capture: type `Coffee RM 12.90 at ZUS yesterday with cash`; review date, amount, category and account before saving. Ambiguous amounts remain empty. Local categorization is a transparent keyword heuristic, not a model inference.
- Receipt capture: upload or photograph JPG, PNG or WebP images up to 10 MB. Tesseract reads English text in the browser; the total, merchant, date and category become editable fields. Nothing saves automatically.
- Voice: supported browsers provide microphone dictation; transcripts are editable before review. Permission failures and unsupported browsers fall back to typing. The browser may use its own remote speech service.
- Transactions: create, edit, delete with undo, search, filter, pagination, expenses, income and transfers. Transfers move recorded balances without counting as income or spending.
- Ask Pocket: conversational search, category/merchant/account/month breakdowns, period comparisons, budget checks and recorded balances. Answers include exact filters and expandable matching transactions. Follow-up questions retain relevant context.
- Budgets: editable category limits applied across months, progress and overspend states.
- Savings goals: names, targets and manually recorded progress. Goal updates do not move account money.
- Accounts: bank, e-wallet, cash, credit card and loan records, including negative opening balances. Balances are opening amounts plus **all** recorded transactions, not live bank balances.
- Imports: CSV preview, validation, per-row errors and duplicate detection. JSON backup and validated restore. CSV export includes protection against spreadsheet formula interpretation.
- Responsive interface, native forms/dialogs, labeled controls, keyboard focus restoration, reduced-motion support, and accessible chart descriptions.
- Drafts survive chart/month changes and navigation; capture tabs keep typed text and edited transcripts. Repeated submits save once. File reads and AI requests are cancelled or ignored when their flow closes, and stale edits prompt you to reopen the newer record.

## Ask Pocket

Open **Ask Pocket** in desktop navigation or **Ask** in the mobile bottom bar. Type a question, tap a starter, or dictate and review your words before sending. Enter sends; Shift+Enter starts a new line. On mobile, Settings is available through the profile button at the top.

Try:

- `How much did I spend on food this month?` → `And last month?`
- `Find Grab payments over RM 20`
- `Food spending over RM 20 under RM 50`
- `Break down my spending by merchant`
- `Compare this month with last month`
- `How are my budgets doing?`
- `Show spending in the last 3 months`

On-device mode works without an API key and recognizes common question patterns. Inspect the date, category, account and amount chips to see the exact interpretation. “Last N months” means N complete calendar months before the current month; current-month comparisons use matching elapsed days in the preceding month. Budget limits are compared with recorded expenses, not forecasts. Unknown or unsupported questions request a clearer query. Exclusions, recurring-payment detection and financial predictions are not supported.

Expand **matching transactions** to inspect the evidence or open the existing editor. Answers recompute from the current ledger after edits. Chatting itself does not change records. Each workspace has its own in-memory conversation, limited to the latest 20 turns; refreshing the page or starting a new conversation clears it.

With a Gemini key configured below, opt in to **AI understanding** for more flexible wording. Only your question, prior query filters, date/month, currency and account names/IDs go to Google. Full ledger rows and calculated answers stay in the browser; details you include in your question do go to the provider. The model returns a validated query plan, and Pocket calculates the result locally in integer cents. Provider-written answer prose is never used. Failed AI calls fall back to on-device interpretation with a visible notice.

## Receipt OCR and optional AI

OCR runs locally, but first use downloads the pinned Tesseract.js 6.0.1 runtime and English recognition assets. An internet connection is needed for those downloads. Receipt images are not sent to an OCR service. Blurry, rotated, non-English, or unusual receipts may need manual correction. Upload failure includes a manual-entry path.

For optional Gemini extraction, copy `.env.example` to `.env`, add your own key, choose a supported model if needed, and restart:

```text
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=4317
```

An explicit checkbox appears in text/receipt capture when the server detects a key. Only the opted-in entry is sent to Google. The key never goes to the browser; the server validates input and normalizes model output. Extracted amounts are still reviewed before saving. Provider access and usage costs belong to your configured account.

Provider references: [Gemini generateContent API](https://ai.google.dev/api/generate-content), [Tesseract.js](https://github.com/naptha/tesseract.js/).

## CSV format

```csv
date,merchant,amount,type,category,account
2026-10-02,ZUS Coffee,12.90,expense,Food & drinks,ewallet
2026-10-02,Monthly salary,5800,income,Salary,bank
```

Required: `date` (YYYY-MM-DD), `merchant` (or `description`), `amount` (major currency units). Optional: `type`, `category`, `account`, `toAccount`, `note`. Absent type means expense; income must be marked explicitly. Transfers require a different valid destination account. Account IDs are shown in the import dialog. Missing account uses the first workspace account.

Duplicates match date, normalized merchant, amount, type and accounts. Two legitimate identical purchases on one day may therefore need manual entry. Import up to 10,000 rows / 5 MB per file. Categories must match the app's labels; absent categories are inferred. Bank-specific statement formats need their headers/date format adjusted before importing.

## Data and boundaries

- Without database mode, browser localStorage holds separate sample and personal workspaces; clearing browser storage deletes records.
  In database mode, each signed-in account has its own personal workspace shared across that user's devices.
  Back up from Settings in either mode; backups are plain-text financial data.
- Database mode supports separate usernames, password hashes and personal ledgers.
  Workspace access is determined by the session on the server.
  Sample records and workspace preferences use separate browser keys for registered users.
  No direct bank/e-wallet connection is included.
  No credentials or bank connectivity are simulated.
- Workspace currency is a label; changing it does **not** convert existing amounts.
- Balances include future-dated entries if you enter them. Budget limits are shared across months, not a historical versioned plan.
- This release tracks debt balances and transfers; it does not calculate loan interest, amortization schedules, investment returns, or financial advice.
- Registration is open to visitors when database mode is enabled.
  Sign-in and registration are rate limited.
  Email verification, password recovery, account deletion and administration are not included.

## Architecture

`domain.js` owns integer-cent arithmetic, validation, parsing and imports. `seed.js` supplies demonstrative data. `app.js` owns the UI, local or database persistence, and review workflows. `db.js` holds the optional PostgreSQL connection and revision checked saves. `capture.js` integrates queued, lazy OCR, browser speech and optional AI. `assistant-query.js` interprets and evaluates read-only query plans; `assistant-ui.js` renders conversations and evidence; `assistant-api.js` validates optional provider plans. `format.js` reuses locale formatters. `server.js` serves an explicit public-file allowlist with gzip and conditional asset caching, and proxies validated, cancellable AI requests. API responses remain uncached. `icons.js` contains the original consistent SVG icon set. Typography is self-hosted Manrope, with its license in `assets/OFL.txt`.

Contributor guidance is in [AGENTS.md](AGENTS.md). The [project notes](docs/README.md) and [browser-check guide](scripts/README.md) index the other documentation.

## Verification

```powershell
npm test
npm run check
# With the server running; Windows + Microsoft Edge:
npm run test:browser
npm run test:assistant-browser
npm run test:interactions
npm run test:layout
npm run test:performance
node scripts/ocr-check.js
# With .env configured for Neon; uses an isolated temporary database schema:
npm run test:database-browser
```

Domain/API suite: money validation, safe account and budget totals, dates, transfer-safe summaries, date/quantity-aware extraction, receipt totals, CSV escaping/deduplication, server file isolation, origin validation, and normalized AI output.

Assistant coverage: exact aggregation, date/account/merchant/amount filters, contextual follow-ups and resets, comparisons, budgets, unsupported questions, malformed model plans, no ledger data in provider payloads, and removal of provider-authored clarification prose.
Additional regressions cover malformed capture amounts, gzip/ETag delivery, custom-domain origin validation, authentication, registration, per-user ledger access, revision conflicts, public AI access control, and upstream request cancellation.
**49 domain/API tests pass; two opt-in database tests are skipped by default and also passed against isolated Neon test schemas.**

Browser suite: real rendering, persistence, capture/edit/delete/undo, focus restoration, imports, goals, budgets, debt accounts, separate workspaces, escaped content, responsive widths 320–1920, accessible button names, and no unhandled exceptions. Browser scripts use isolated profiles and never clear the user's normal browser records.

The latest local browser run passed **23 existing-app checks**. The earlier assistant, interaction, and layout runs passed **17, 18, and 32 checks**, respectively. These cover local answers, evidence/editor focus, follow-ups from older answers, comparisons, budget results, workspace isolation, Enter-to-send, optional AI and its fallback, repeated clicks, draft retention, import/restore cancellation, exports, storage-full recovery, stale edits, keyboard tabs, long labels and short landscape screens.

With a synthetic 10,000-row ledger and 4× CPU throttling in headless Edge, median search handling improved from 272.6 ms to 30 ms; chart-toggle round trips improved from 201.6 ms to 20.5 ms. These are controlled lab measurements, not guarantees for every device. Method, full results and limits: [optimization report](docs/optimization.md).

Actual image OCR was tested against a generated receipt: merchant **JAYA GROCER**, total **RM 44.52**, date **2026-10-01**, category **Groceries**. Live microphone recognition depends on hardware and permissions and was not exercised in headless testing; its editable transcript flow was tested. Gemini was verified with a simulated provider response; no live API key was available.

Screenshots and test results: `.impeccable/review/`. Independent finish review marked the reported extraction and keyboard-focus fixes resolved and issued **ship** for that reviewed scope. This is not a full WCAG certification or production security audit.

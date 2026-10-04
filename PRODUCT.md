# Pocket

A personal money workspace for a Malaysian software engineer who wants to understand spending in seconds and avoid manual bookkeeping. Default currency MYR. Responsive desktop and mobile web app. A clearly labeled sample workspace shows the experience; a separate personal workspace starts empty.

Primary loop: capture a sentence, dictated speech, or receipt image; inspect extracted fields; save once; see balances, budgets, charts and transactions update.
Monetary amounts use integer minor units.
No automatic saving of uncertain extraction.
Without database mode, personal records remain in this browser, with JSON backup/restore and CSV import/export.
Browser storage is not encrypted or cross-device synced.
With PostgreSQL configured, users create their own accounts and get separate personal ledgers available across devices.
New accounts start with zero balances and no transactions, budgets or goals.
The original shared login and its records remain available; sample workspaces stay separate.
Registration uses a name, unique username and password, with no email verification or password recovery yet.

Receipt OCR runs locally after downloading Tesseract assets. Browser speech support varies and may use the browser vendor's service. Optional Gemini extraction is explicitly enabled per request and proxied through a loopback Node server with a server-side environment key. Real bank/ewallet connectivity is out of scope without provider credentials; statement CSV is supported instead. No fabricated bank connections.

Success: useful glanceable dashboard, keyboard-usable controls, no mobile overflow, repeatable validated capture, correct category spending and balances, editable budgets and savings goals, import preview with duplicate detection, and documented operating limitations.

Ask Pocket adds a second loop: ask in ordinary language, see the interpreted filters and calculated result, follow up, and inspect matching transactions. It supports common on-device questions about merchants, categories, accounts, dates, amount thresholds, budgets, balances and period comparisons. Questions cannot mutate records; evidence opens the existing review editor. Transfers remain separate from spending. Partial-month comparisons use matching elapsed calendar days. Last N months refers to complete preceding calendar months.

Optional AI understanding translates questions into validated read-only query plans. It is opt-in and shares only the question, previous filters, dates, currency and account labels/IDs. Ledger rows and aggregation stay local. Provider answer prose is discarded; unsupported questions clarify and provider errors visibly fall back to on-device interpretation. Conversation is temporary, capped at 20 turns and isolated per workspace. Refresh clears chat, not the ledger. Supported dictation remains editable before explicit send.

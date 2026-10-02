# Pocket implementation plan

Goal: deliver a working local-first personal finance application with a polished responsive interface and honest optional AI capture.

Architecture: dependency-free ES modules for browser UI and financial domain; Node loopback HTTP server for static files and optional Gemini proxy. Lazy browser OCR. Node built-in tests and Playwright browser verification.

1. Domain: write failing tests for cents conversion, validation, month-filtered summaries, transfer-safe balances, natural-language/receipt parsing and CSV import/export; implement domain.js and seed.js; verify.
2. Interface: implement index.html, styles.css, icons.js and app.js. Views: overview, transactions, budgets, accounts, settings. Capture review, transaction edit/delete/undo, goals, month navigation, personal/demo separation, persistence and backups.
3. Capture: add capture.js with speech recognition and local OCR; server.js proxies explicit AI requests and validates input/output. API key remains server-side. No bank authentication claims.
4. Verify: Node tests plus real desktop/mobile browser flows, screenshot inspection, accessibility checks and finish review; document run commands and limitations.

User authorized building the application and delegated design choices. Defaults are documented rather than blocking implementation on optional preference questions. Existing projects are outside the write boundary. Workspace is not a Git repository.

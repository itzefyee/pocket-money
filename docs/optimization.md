# Performance and interaction audit

2026-10-02. Pocket's existing interface and storage model were retained. All tests use synthetic data in isolated Edge profiles.

## Measured performance

Fixture: 10,000 transactions, 40 merchant labels, six months of records and a ten-answer conversation. Headless Edge at 1440×1000 with 4× CPU throttling. Values are medians of five synchronous interaction samples after one warm-up and include forced layout. Round trips perform two clicks, out and back.

| Interaction | Before | After |
| --- | ---: | ---: |
| Chart view round trip | 201.6 ms | 20.5 ms |
| Dashboard month round trip | 223.6 ms | 62.3 ms |
| Transaction search | 272.6 ms | 30.0 ms |
| Month round trip with ten chat answers | 4341.8 ms | 10.9 ms |

The last result reflects a targeted month-control update: existing conversation answers keep their explicit date scopes, so changing the default month no longer rebuilds them. It does not measure model latency or the time to compute a new answer. Encoded resource payload in the captured run decreased from about 249 KB to 96 KB with gzip. Assets revalidate with ETags; private API responses remain `no-store`.

The largest costs were creating locale formatters for every number/date, rebuilding navigation and charts, recomputing unchanged query answers, and rendering the entire conversation on month changes. Shared formatters, state-keyed caches and targeted DOM updates remove that work. Monetary values remain integer cents. Caches invalidate after ledger updates; they do not survive a reload.

Raw results: `.impeccable/review/optimization/performance-before.json` and `performance-after.json`. Run `npm run test:performance` to repeat the after measurement. CPU emulation and local-loopback delivery are controlled lab conditions, not physical-device or field Core Web Vitals evidence. The baseline LCP observation was unavailable, so no LCP improvement is claimed.

## Interaction repairs

- Preserve quick-entry and settings drafts across redraws and navigation, independently per workspace. Capture tabs preserve typed text, transcripts and AI selection.
- Ignore repeated, busy or detached form submissions. Successful quick capture clears only the originating draft.
- Cancel or discard superseded capture/import/restore results. Closing a flow prevents late results or errors from reopening or changing another flow/workspace. Client cancellation propagates to upstream AI fetches. Local OCR jobs run in sequence; an already-running OCR operation can finish, but its cancelled result is ignored.
- Prevent an edit from replacing a record changed by a received update from another tab. Show a recoverable message while retaining the draft. This does not turn localStorage into a transactional, multi-user database.
- Preserve pagination and dialog focus; support arrow keys in capture tabs. Skip-to-content retains the current route. Month navigation respects valid boundaries.
- Bind a follow-up button to the answer beneath which it appears. Synchronize dictation state when an editor interrupts recording.
- Keep malformed negative or overprecision capture amounts empty for review. Retain forms after failed storage writes and allow retry.
- Increase mobile tap areas, wrap long labels, truncate sidebar names, reserve scroll space above bottom navigation, and keep the chat composer reachable on short screens.

## Verification

- 39 domain/API tests and JavaScript syntax checks pass.
- 22 original app checks, 17 assistant checks and 18 interaction regressions pass.
- 32 layout checks pass across all six routes, including long/CJK labels, large balances, narrow mobile and landscape.
- Actual browser OCR still recovers JAYA GROCER / RM 44.52 / 2026-10-01 / Groceries.
- Independent review approves correctness with no remaining material blocker in the reviewed scope.

Screenshots, interaction results and layout results are in `.impeccable/review/optimization/`. Browser automation checks real DOM, keyboard and pointer behavior; file-picker wiring, delayed AI and microphone events use controlled fixtures. Live Gemini, physical phone input/camera and a comprehensive assistive-technology session remain untested.

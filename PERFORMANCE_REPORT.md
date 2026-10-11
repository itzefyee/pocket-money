# Performance report

## Scope and environment

Audited URL: `http://127.0.0.1:4318/` in browser-storage mode with AI disabled.

The standard `npm.cmd start` command was verified first and used the local `.env` database configuration, so it redirected unauthenticated visitors to sign-in.

For reproducible public-app measurement without reading credentials or ledger data, a local server was started with `createServer({apiKey: ''})` on port 4318.

Commands run: `npm.cmd ci`, `npx.cmd --yes --package=lighthouse@12.8.2 lighthouse http://127.0.0.1:4318/ --output json --output html --output-path .performance-audit/baseline --chrome-path C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe --only-categories=performance,accessibility,best-practices,seo --preset=desktop --quiet`, and `npm.cmd run test:performance` with `POCKET_TEST_URL=http://127.0.0.1:4318/`.

Environment: commit `e999bf3`, Node 24.4.1, npm 11.6.2, Lighthouse 12.8.2, and Microsoft Edge on Windows.

The working tree began clean except for audit records created during this work.

Lighthouse artifacts are kept in the ignored `.performance-audit/` directory.

These local synthetic measurements are not real-user Core Web Vitals.

## Lighthouse results

| Measure | Before | After |
| --- | ---: | ---: |
| Performance | 100 | 100 |
| Accessibility | 96 | 96 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |
| FCP | 0.4 s | 0.4 s |
| LCP | 0.5 s | 0.5 s |
| CLS | 0.034 | 0.034 |
| TTFB | 0 ms | 0 ms |
| INP | Unavailable in navigation-only lab run | Unavailable in navigation-only lab run |
| Total Blocking Time | 0 ms | 0 ms |

## Top bottlenecks

1. The self-hosted Manrope font accounts for 96 KB of the 155 KB initial transfer weight, but it is preloaded and does not prevent a 0.4 s FCP or 0.5 s LCP locally.
   Source: `index.html:12`.

2. `assistant.css` is render-blocking on the overview route, and Lighthouse estimates 40 ms of savings despite its 3.7 KB compressed transfer.
   Source: `index.html:13`.

3. The initial ES module graph has fourteen local resource requests, yet compressed JavaScript is small and Total Blocking Time is 0 ms.
   Source: `index.html:49` and imports rooted at `app.js:1`.

4. Static assets use ETags and revalidation rather than long-lived immutable caching because their filenames are not content fingerprinted.
   Source: `server.js:117`.

5. Optional on-device OCR fetches Tesseract only after receipt processing begins, so it does not affect initial page metrics.
   Source: `capture.js:2`.

## Changes applied

No application performance change was applied because the baseline did not identify a proportionate high-impact, low-risk optimization.

The measured application already has a 100 Performance score, a 0 ms Total Blocking Time result, successful gzip compression, and a small initial transfer size.

Deferring the assistant stylesheet is a measurable but low-impact 40 ms lab opportunity that risks a flash of unstyled assistant UI and would not be proportionate to the current results.

The audit artifact directory was added to `.gitignore` so generated Lighthouse output remains untracked.

The separately approved security hardening added a Content Security Policy without changing the Lighthouse scores or metrics above.

## Manual attention and remaining issues

| Priority | Item | Expected benefit | Risk | Recommended next action |
| --- | --- | --- | --- | --- |
| Low | Evaluate route-level loading for `assistant.css` at `index.html:13` if a future product change makes the overview initial load materially heavier. | About 40 ms in this local Lighthouse run. | Styled-content flash or slower first Assistant route render. | Re-measure both overview and Assistant routes after any change. |
| Low | Consider font subsetting at `assets/manrope.woff2` only if field data shows slow-network text rendering. | Lowers the 96 KB initial font transfer. | Missing glyphs or typographic regressions. | Preserve the current preload and test Malay and currency text before adopting subsets. |
| Low | Add fingerprinted static filenames only with a build or release strategy. | Better repeat-visit caching. | Stale asset and deployment complexity. | Keep current ETag revalidation until that wider architecture change is approved. |

## Verification and limitations

`npm.cmd run test:performance` passed with a 10,000-transaction fixture under four-times CPU throttling.

Measured interaction medians were 5.2 ms for dashboard chart switching, 34.6 ms for a month round trip, 23.6 ms for transaction search, and 3.7 ms for a ten-answer assistant refresh.

The browser check reported no errors, a 36 ms observed LCP, 0.048 CLS, fourteen resources, and 139,008 encoded bytes.

Results are local, synthetic, and browser-storage-mode only.

The authenticated database route and first-use OCR download were not benchmarked because they depend on private configuration or external network access.

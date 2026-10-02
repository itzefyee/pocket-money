# Browser checks

Run these from the repository root after starting `npm start` in another terminal. They require Microsoft Edge on Windows. Checks use isolated `.browser-profile-*` directories and write generated results under `.impeccable/review/`; both locations are ignored by Git.

| Command | Coverage |
| --- | --- |
| `npm run test:browser` | Main app flows |
| `npm run test:assistant-browser` | Ask Pocket flows |
| `npm run test:interactions` | Interaction regressions |
| `npm run test:layout` | Responsive layouts |
| `npm run test:performance` | Synthetic performance run |
| `node scripts/ocr-check.js` | Generated receipt with real browser OCR; first use downloads Tesseract assets |

Use `npm.cmd` in PowerShell if execution policy blocks `npm.ps1`. `browser-tools.js` is shared support code, not a standalone check. `POCKET_BROWSER` can override the Edge path for checks using that helper; `ocr-check.js` currently uses a fixed Edge path.

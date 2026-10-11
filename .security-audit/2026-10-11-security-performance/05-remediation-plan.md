# Remediation plan

## SA-001

Risk: an absent Content Security Policy leaves an avoidable gap if an XSS or third-party script compromise occurs.

Change: add a restrictive Content-Security-Policy to the shared server response headers.

Compatibility: retain only the browser capabilities Pocket already uses: same-origin application assets and APIs, `data:` and `blob:` receipt/download resources, the pinned jsDelivr OCR library and its worker resources, and the fixed Gemini endpoint. Disallow plugins, embedding, arbitrary navigation forms, and unapproved resource origins.

Affected files:

- `server.js`
- `tests/server.test.js`

Verification:

- Assert the header contains the intended directives in the existing static asset/server test.
- Run `npm.cmd test` and `npm.cmd run check`.
- Re-run the local response-header reproduction and verify the policy is present.

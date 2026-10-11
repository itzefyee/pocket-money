# Research and threat model

## Sources selected

- [OWASP Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html): applicable because the application renders user-controlled ledger values through dynamic templates and currently has no CSP response header.
- [OWASP Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html): applicable because database mode uses browser session cookies for state-changing endpoints.
- [OWASP Server-Side Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html): applicable because optional AI features call an external provider.
- [OWASP HTTP Security Response Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html): applicable to the custom Node HTTP response layer.

## Credible attack paths

| Path | Assessment | Evidence |
| --- | --- | --- |
| Cross-site workspace write or sign-in request | Blocked | State-changing routes require the exact configured Origin, use JSON content types, and session cookies use SameSite=Lax. Server tests exercise hostile origins. |
| Cross-account ledger access | Blocked in tested paths | Database pages and APIs require a session, and workspace requests bind the declared browser user to the authenticated user. Tests cover registration and account switching. |
| Static-file traversal or source-secret disclosure | Blocked | An exact public-file allowlist is used after decoding the request path. Tests confirm `.env`, sources, and tests return 404. |
| Provider request forgery | Not reachable from client input | Provider destination and operation are constructed from configured model values, not a user-provided URL. |
| Stored or reflected script injection | Reduced but not fully contained | User-controlled assistant-rendered strings are HTML escaped, but many dynamic rendering sinks exist and the server sends no CSP. |
| Dependency exploitation | No known vulnerable dependency found | `npm audit --omit=dev --json` reports zero known vulnerabilities. |

## Inapplicable or unverified categories

- File upload is limited to browser-local receipt processing or base64 submission to the configured provider. There is no server filesystem upload endpoint.
- There is no shell execution, template engine, XML parser, deserialization endpoint, or user-controlled outbound URL.
- Deployment configuration was reviewed but public Render, Neon, and Gemini services were deliberately not probed.

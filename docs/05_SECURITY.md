# 05 · Security

## 1. Assets and trust boundaries

| Asset | Why it matters |
| --- | --- |
| Session tokens | Grant full account access. |
| Passwords | Reused across sites by many people. |
| Private collections | Personal reading history and notes. |
| Share tokens | Grant read access to a whole collection. |
| `JWT_SECRET`, `MONGODB_URI`, `GEMINI_API_KEY` | Full compromise or billing abuse. |

Boundaries: browser ↔ web proxy ↔ API (untrusted input); API ↔ Python worker (separate process,
validated both ways); worker ↔ internet (SSRF risk); worker ↔ AI provider (prompt injection, data sharing).

## 2. Controls

### Authentication and sessions
- bcrypt with cost 12 (≥ 10 enforced in production). Passwords over 72 bytes are rejected rather than truncated.
- Login compares against a dummy hash for unknown users, and returns the same error for both cases (no enumeration).
- HS256 JWT (`sub`, `ver`, `exp`), algorithm pinned on verification, in an HTTP-only, `SameSite=Lax`,
  `Secure` (production) cookie. Never readable by JavaScript.
- Server-side revocation: `ver` must equal `users.tokenVersion`. Logout, password change and account
  deletion revoke sessions immediately.
- Rate limits on login (failed attempts), registration, account operations and the whole API.

### Authorization
- Every service function takes the authenticated `userId`, and every query includes it. Other users'
  resources return `404`, so their existence isn't revealed.
- Public share access is read-only and limited to title, link, type, tags and date.

### Input handling (OWASP A03)
- Zod validation of every body, path parameter and query; unknown shapes are rejected.
- Mongo operator injection is impossible: inputs are parsed to primitives before reaching queries;
  search text is regex-escaped (tested with `(a+)+`).
- Links must be `http(s)` without credentials, which blocks `javascript:` and `data:` URLs. Links open with
  `rel="noopener noreferrer"`.
- React escapes all rendered text; there is no `dangerouslySetInnerHTML`. AI output is rendered as text.
- JSON bodies are capped at 256 KB.

### CSRF and cross-origin
- `SameSite=Lax` cookie, plus an origin guard rejecting unsafe methods from origins outside `CORS_ORIGINS`.
- Credentialed CORS restricted to an explicit allow-list. CORS is never treated as authorization.

### Transport and browser hardening
- API: Helmet with `default-src 'none'`, `frame-ancestors 'none'`, `nosniff` and HSTS; `X-Powered-By` removed;
  `Cache-Control: no-store` on every endpoint.
- Web (NGINX): strict CSP (`script-src 'self'`, no inline scripts or styles), `Referrer-Policy: no-referrer`
  (share URLs never leak via Referer), `Permissions-Policy`, `Cross-Origin-Opener-Policy`, no server tokens.
- `TRUST_PROXY_HOPS` must match the real proxy chain, so client IPs (rate limiting) can't be spoofed.

### Secrets and logging
- All secrets come from the environment and are validated at startup. Nothing secret is in the frontend
  bundle (`VITE_*` values are public by definition).
- Logs are structured JSON. Cookies, `Authorization`, `Set-Cookie`, passwords and tokens are redacted;
  `/shared/<token>` paths are rewritten to `/shared/[REDACTED]` in API logs and excluded from NGINX
  access logs.
- Unexpected errors are logged server-side with a request ID; clients only receive a generic message.

### AI worker
- No network listener; one short-lived process per call, with a concurrency cap, a hard deadline
  (`RAG_TIMEOUT_MS`) and a 16 MB output cap.
- Minimal environment: only `PATH`, provider settings and TLS/proxy variables. `JWT_SECRET` and
  `MONGODB_URI` are never passed (verified by a unit test).
- SSRF defenses when fetching pages: http(s) on standard ports only; every DNS answer must be a
  public address (blocks loopback, private, link-local and metadata IPs, IPv4-mapped and NAT64-embedded
  addresses, and multicast); the socket is pinned to the vetted IP; each redirect is revalidated
  (≤ 4); 1 MB / 10 s limits; HTML and plain text only; no JavaScript execution.
- Prompt-injection mitigation: excerpts are framed as untrusted data, structured JSON output is
  required, every quote must appear verbatim in its excerpt (checked in Python **and** again in
  Node), and a separate support check must pass. Otherwise the assistant abstains.
- The worker's output is schema-validated by the API before use.

### Supply chain
- Lockfiles for every package; `npm audit --omit=dev --audit-level=high` in CI; Dependabot for npm,
  GitHub Actions and base images. The Python worker has zero third-party dependencies.
- Containers run as non-root users (`node`, unprivileged NGINX).

## 3. Known limitations and required operator controls

| Limitation | Mitigation / action |
| --- | --- |
| Rate limits are per process (in-memory). | Use one instance, or add a shared store (e.g. Redis) and edge rate limiting before scaling out. |
| No MFA or password recovery. | Planned; until then, an operator must reset passwords manually. |
| Share links are bearer secrets. | Shown once, revocable and rotatable; the UI explains this. Treat them like passwords. |
| SSRF checks are application-level. | Also block private ranges and cloud metadata in egress firewall rules. |
| AI answers can still be wrong. | Quotes are shown for verification; the UI states the limitation. |
| JWT secret rotation signs everyone out. | Planned rotation windows; no key-ID support yet. |

## 4. Reporting a vulnerability

Please do not open public issues for security reports. Contact the repository owner privately with
steps to reproduce, and allow time for a fix before disclosure.

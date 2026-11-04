# 07 · Deployment and Operations

## 1. Topology

One public HTTPS hostname. A TLS-terminating load balancer (or the platform's ingress) forwards to the
**web** container (NGINX), which serves the SPA and proxies `/api/` to the private **api** container. The
API connects to a private, backed-up **MongoDB** (managed service recommended) and, if the assistant is
enabled, makes outbound HTTPS calls to Gemini through its Python worker. Only the web container is exposed.

Same-origin hosting is required: the session cookie is `SameSite=Lax`, and the frontend calls `/api/v1`
relatively.

## 2. Configuration

All API variables are validated at startup (`backend/src/config/environment.ts`). If any are invalid,
the process exits with a message listing every problem.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | — | `development` | Use `production` (Secure cookies, stricter checks). |
| `PORT` | — | `8000` | |
| `LOG_LEVEL` | — | `info` | `fatal`…`trace`, `silent`. |
| `MONGODB_URI` | **yes** | — | Include the database name and TLS options. |
| `JWT_SECRET` | **yes** | — | ≥ 32 random characters (`openssl rand -hex 32`). Changing it signs everyone out. |
| `SESSION_TTL_DAYS` | — | `7` | 1–90. |
| `BCRYPT_ROUNDS` | — | `12` | 4–15; ≥ 10 in production. |
| `CORS_ORIGINS` | prod: **yes** | `http://localhost:5173` | Exact public origin(s), comma-separated, no trailing slash. |
| `TRUST_PROXY_HOPS` | — | unset | Exact number of trusted proxies in front of the API (Compose: `1`). Wrong values let clients spoof IPs. |
| `RAG_ENABLED` | — | `false` | `true` enables the assistant. |
| `GEMINI_API_KEY` | if AI | — | Secret manager only. |
| `GEMINI_EMBEDDING_MODEL` | — | `gemini-embedding-001` | Changing it marks existing indexes stale. |
| `GEMINI_CHAT_MODEL` | — | `gemini-3.8-flash` | Must support structured JSON output. |
| `RAG_PYTHON` | — | `python3` | Python 3.10+. |
| `RAG_WORKER_DIR` | — | `../rag` (image: `/app/rag`) | Directory containing `brainspace_rag/`. |
| `RAG_TIMEOUT_MS` | — | `120000` | Hard deadline per worker call. Keep the proxy read timeout above it. |
| `RAG_MAX_CONCURRENCY` | — | `4` | Concurrent worker processes per API instance. |

Web image: `API_UPSTREAM` (default `http://api:8000`); build argument `VITE_API_URL` (default `/api/v1`, public).

## 3. Deploying

### 3.1 Containers (recommended)

```bash
docker build -f backend/Dockerfile  -t <registry>/brainspace-api:<git-sha> .
docker build -f frontend/Dockerfile -t <registry>/brainspace-web:<git-sha> .
```

Both images are built from the repository root and run as non-root users. Tag images with the commit
SHA, and promote the same image through staging and production.

Try it locally with the production-like stack:

```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
# → http://localhost:8080
```

### 3.2 Without containers

```bash
npm ci --prefix backend && npm run build --prefix backend
npm ci --prefix frontend && npm run build --prefix frontend
# Serve frontend/dist with the NGINX config in frontend/nginx (substitute API_UPSTREAM), then:
cd backend && NODE_ENV=production node dist/server.js     # with the environment above
```

Run the API under a supervisor that restarts it on failure and sends SIGTERM on stop. On SIGTERM the
API stops accepting connections, lets in-flight requests finish (up to 10 s), then closes MongoDB.

### 3.3 TLS and proxies

Terminate TLS before the web container and redirect HTTP to HTTPS. If another proxy sits in front of
NGINX, set `TRUST_PROXY_HOPS` to the full count (e.g. load balancer + NGINX = `2`). Make sure no layer
logs full request URLs for `/shared/*` or `/api/v1/shared/*` (they contain bearer tokens).

## 4. Pre-launch verification

1. `GET /api/v1/health/ready` returns 200 through the public hostname; deep links such as `/folders/x`
   load the app (SPA fallback).
2. Register a disposable account. Then save, search, edit and delete an item; create and delete a folder; sign out and in.
3. Create a share link, open it in a private window, rotate it (the old link must 404), then revoke it.
4. With a second account, confirm the first account's items return 404.
5. Inspect the cookie (`HttpOnly`, `Secure`, `SameSite=Lax`) and response headers (CSP, `nosniff`, `no-store` on the API).
6. Confirm a cross-origin `POST` is rejected (403) and that `.env`/secrets aren't served.
7. If AI is enabled, index pasted text, ask a question, and check the quoted evidence.
8. Delete the disposable accounts through **Settings → Delete account**.

## 5. Observability

- **Logs:** one JSON line per request (`req.id`, method, redacted URL, status, `responseTime`), plus
  lifecycle events. Ship stdout to your log platform. Health-check requests aren't logged.
- **Request IDs:** taken from an incoming `X-Request-Id` (NGINX sets one) or generated, echoed in the
  response header and included in error bodies, so a user's report can be traced.
- **Probes:** liveness `GET /api/v1/health/live`; readiness `GET /api/v1/health/ready` (database ping).
  The images define Docker `HEALTHCHECK`s.
- **Alert on:** 5xx rate, p95 latency, readiness failures, restart loops, `RATE_LIMITED` spikes,
  AI error rate and spend, MongoDB storage/connections, backup failures, certificate expiry.

## 6. Scaling

The API is stateless apart from **in-memory rate-limit counters**. Before running more than one
instance, either move rate limiting to a shared store (an `express-rate-limit` store backed by Redis)
or enforce limits at the edge. AI work is bounded per instance by `RAG_MAX_CONCURRENCY`; each worker
call is a short-lived Python process (roughly 30–60 MB).

## 7. Data protection

- Enable automated MongoDB backups with point-in-time recovery, and test restores regularly.
- Indexes are created at startup (`ensureIndexes`, non-destructive). Before upgrading a database
  with existing data, check for violations of the unique indexes listed in 04_DATA_MODEL.md.
- Deleting an account or AI index removes the data from the live database; backups retain it for
  their retention period. Document this in your privacy policy.
- With AI enabled, indexed text, questions and selected excerpts are sent to Google. Review the
  provider's data terms and set spending limits.

## 8. Runbook

| Symptom | Likely cause | Action |
| --- | --- | --- |
| API exits at start with "Invalid environment configuration" | Missing or invalid variable | Fix the listed variables. |
| Readiness 503 | MongoDB unreachable | Check network, credentials, TLS and the database's health. |
| Users signed out unexpectedly | `JWT_SECRET` changed, or they signed out elsewhere (logout is global) | Expected behaviour; communicate planned rotations. |
| 403 `ORIGIN_NOT_ALLOWED` | `CORS_ORIGINS` doesn't match the public origin exactly | Fix the scheme, host and port; remove the trailing slash. |
| Everyone rate-limited together | `TRUST_PROXY_HOPS` unset behind a proxy (all clients share one IP) | Set it to the exact proxy count. |
| AI 503 `AI_NOT_CONFIGURED` | `RAG_ENABLED`/`GEMINI_API_KEY` missing | Configure, then restart. |
| AI 503 `AI_UNAVAILABLE` "unavailable" | Python missing, or `RAG_WORKER_DIR` wrong | Check the image or the paths. |
| AI 504 | Provider slow or the page fetch timed out | Retry; check provider status; raise `RAG_TIMEOUT_MS` cautiously (and the NGINX read timeout). |
| Sources shown as "Reindex needed" | Embedding model changed | Users reindex those sources. |

## 9. Releases and rollback

1. Merge to `main` with green CI. Build images tagged with the commit SHA.
2. Deploy to staging, run section 4, then promote the **same** images to production.
3. **Rollback:** redeploy the previous image tags with their matching configuration. Schema changes are
   additive (new collections/fields/indexes), so the previous version keeps working against the newer
   database. If a release needs a data migration, it must ship a tested rollback plan. Never restore
   an old backup over newer user data without assessing data loss.

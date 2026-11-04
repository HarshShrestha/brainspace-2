# 06 · Testing Strategy

## 1. Test pyramid

| Level | Where | Tools | What it proves | Count |
| --- | --- | --- | --- | --- |
| Backend unit | `backend/tests/unit` | Vitest | Pure logic: ranking, cursor codec, environment validation, share-token parsing, log redaction, and the worker subprocess boundary (timeouts, garbage output, error relay, environment isolation, concurrency). | 34 |
| Backend integration | `backend/tests/integration` | Vitest + Supertest + MongoDB | Real HTTP handlers against a real database: auth and sessions, account management, ownership isolation, validation, pagination/search, folders, sharing and revocation, and the assistant through the **real Python worker** with a stub provider. | 48 |
| AI worker | `rag/tests` | `unittest` | Chunking, quote validation, SSRF address filtering, HTML extraction, pipeline abstention paths, worker protocol. | 26 |
| Frontend | `frontend/src/**/*.test.ts(x)` | Vitest + Testing Library + jsdom | API client contract, accessible modal, auth form, content form/card, assistant chat and indexing consent, share dialog, route guards, pagination hook. | 37 |
| End-to-end | `e2e/tests` | Playwright (Chromium) | Six user journeys through the built API, built web app and worker: registration, library, AI, sharing/revocation, theme + phone layout, sign-out everywhere. Fails on any JS error or 5xx. | 6 |

## 2. Running the suites

```bash
# Backend (uses an in-memory MongoDB by default; needs python3 on PATH for assistant tests)
cd backend && npm ci && npm test
#   …or against an existing disposable server (a random database is created and dropped):
TEST_MONGODB_URI=mongodb://127.0.0.1:27017 npm test

# AI worker
cd rag && PYTHONPATH=tests/stubs python3 -m unittest discover -s tests -t .

# Frontend
cd frontend && npm ci && npm test

# End-to-end (build first)
npm run build --prefix backend && npm run build --prefix frontend
npm ci --prefix e2e && npx --prefix e2e playwright install chromium
E2E_MONGODB_URI=mongodb://127.0.0.1:27017 npm test --prefix e2e

# Everything except e2e, from the repository root
npm test
```

Coverage reports: `npm run test:coverage` in `backend/` or `frontend/`.

> **Restricted networks.** `mongodb-memory-server` downloads a MongoDB binary on first use. Where
> that's blocked, point `TEST_MONGODB_URI`/`E2E_MONGODB_URI` at any disposable MongoDB-compatible
> server. This repository's suites were also run against FerretDB 1.24 (SQLite backend) during
> development. Real MongoDB is used in CI.

## 3. Test design rules

1. **Behaviour over implementation.** Integration tests call the HTTP API; component tests query by
   role and label, as a user would (which also checks accessibility).
2. **Isolation.** Each backend test file gets a randomly named database (dropped afterwards) and a
   fresh app instance (fresh rate-limit counters). Frontend tests mock feature services, never `fetch`
   internals, except in the API client's own test.
3. **No real network or cost.** The AI provider is replaced by `rag/tests/stubs/sitecustomize.py`, a
   deterministic simulator (bag-of-words embeddings, so relevance and abstention behave realistically).
   It's loaded only through `PYTHONPATH` in tests and is excluded from images.
4. **Every feature tests success, invalid input, authorization and failure.** For example, content
   tests cover creation, `javascript:` links, another user's ID, and malformed IDs.
5. **Security properties are tests:** enumeration-safe login, session revocation, cookie flags, origin
   rejection, token hashing at rest, identical 404s for malformed/unknown tokens, log redaction,
   worker environment isolation, SSRF address classes, fabricated-quote abstention.
6. **Deterministic configuration.** `backend/tests/setup/environment.ts` sets a test environment before
   any module loads; suites that need different settings use `vi.hoisted` (see `assistant.test.ts`).

## 4. Continuous integration

`.github/ci/ci.yml` (activate by moving it to `.github/workflows/`; see `.github/ci/README.md`) runs
on every pull request:

| Job | Steps |
| --- | --- |
| backend | `npm ci` · lint · format check · typecheck · tests · build · `npm audit --omit=dev` |
| rag | unit tests on Python 3.10 and 3.12 |
| frontend | `npm ci` · lint · format check · tests · build (includes typecheck) · `npm audit --omit=dev` |
| e2e | builds everything, starts MongoDB 7, runs Playwright; uploads traces on failure |
| docker | builds both images |

A pull request is mergeable only when all jobs pass.

## 5. Known gaps

- No load or soak testing yet; capacity bounds are enforced by design (see 04_DATA_MODEL.md §5).
- E2E covers Chromium only; Firefox/WebKit and screen-reader audits are manual.
- Answer **quality** with a real model isn't measured by these suites (they verify safety behaviour).
  See [08_AI_ASSISTANT.md](08_AI_ASSISTANT.md#evaluation) for the evaluation plan.
- No automated visual regression testing.

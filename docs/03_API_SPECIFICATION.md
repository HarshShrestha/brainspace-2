# 03 · API Specification (v1)

Base path: **`/api/v1`**. All bodies are JSON (`Content-Type: application/json`, max 256 KB).
Source of truth: `backend/src/routes`, `backend/src/validators`, `backend/src/types/api.types.ts`.

## 1. Conventions

### Envelopes

```jsonc
// 2xx (except 204 No Content, which has no body)
{ "success": true, "data": <payload> }

// 4xx / 5xx
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",              // stable, machine-readable
    "message": "Title is required",          // safe to show to users
    "details": [{ "path": "title", "message": "Title is required" }],  // validation only
    "requestId": "6f1c…"                     // matches the X-Request-Id response header
  }
}
```

### Authentication

Successful `register`, `login` and `account/password` calls set the `bs_session` cookie (HTTP-only,
`SameSite=Lax`, `Secure` in production, `Path=/`, lifetime `SESSION_TTL_DAYS`). Browsers send it
automatically (`credentials: "include"`). Non-browser clients may send `Authorization: Bearer <token>`.
Protected endpoints return `401 UNAUTHENTICATED` without a valid, unrevoked session.

### CSRF / origins

State-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) that carry an `Origin` header outside
`CORS_ORIGINS` are rejected with `403 ORIGIN_NOT_ALLOWED`.

### Pagination

List endpoints use keyset pagination, newest first:
`?limit=1..100` (default 24) and `?cursor=<opaque>`. Responses are
`{ "items": [...], "nextCursor": "<opaque>" | null }`. Cursors are opaque; do not parse them.

### Caching

Every endpoint responds with `Cache-Control: no-store`.

### Error codes

| Code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Input failed validation (see `details`), or a malformed ID/cursor. |
| `INVALID_JSON` | 400 | The body is not valid JSON. |
| `UNAUTHENTICATED` | 401 | No session, or it expired or was revoked. |
| `INVALID_CREDENTIALS` | 401 | Wrong username/password, or wrong current password. |
| `ORIGIN_NOT_ALLOWED` | 403 | Cross-origin state-changing request. |
| `NOT_FOUND` | 404 | The resource doesn't exist **or isn't yours** (never 403, so existence isn't revealed). |
| `CONFLICT` | 409 | Duplicate username/folder name, or deleting a non-empty folder. |
| `LIMIT_EXCEEDED` | 409 | The indexed-source limit (250) was reached. |
| `PAYLOAD_TOO_LARGE` | 413 | Body over 256 KB. |
| `AI_SOURCE_UNREADABLE` | 422 | The page can't be read safely, or the text is too short. Paste the text instead. |
| `RATE_LIMITED` | 429 | Too many requests (see rate limits). Honor the `RateLimit` headers. |
| `INTERNAL_ERROR` | 500 | Unexpected failure (logged with the request ID). |
| `AI_UNAVAILABLE` | 502/503/504 | Provider or worker failure, invalid output, or timeout. |
| `AI_NOT_CONFIGURED` | 503 | The assistant is disabled on this server. |
| `SERVICE_UNAVAILABLE` | 503 | Readiness check failed (database unreachable). |

### Rate limits (per API process, 15-minute windows)

| Scope | Limit | Key |
| --- | --- | --- |
| All `/api/v1` routes | 1000 | client IP |
| `POST /auth/login` (failed attempts only) | 20 | client IP |
| `POST /auth/register` | 10 | client IP |
| `/account/*` | 10 | client IP |
| `GET /shared/:token` | 120 | client IP |
| `PUT /assistant/sources/:id`, `POST /assistant/ask` | 30 | user |

## 2. Data shapes

```ts
User          { id, username, createdAt }
ContentItem   { id, title, link, type: "article"|"video"|"audio"|"image", tags: string[],
                folderId: string|null, ai: AiIndex|null, createdAt, updatedAt }
AiIndex       { indexedAt, sourceType: "page"|"pasted", chunkCount, stale: boolean }
PublicItem    { id, title, link, type, tags, createdAt }          // no folder, no AI data
Folder        { id, name, itemCount, createdAt }
Tag           { title, count }
ShareStatus   { active: boolean, createdAt: string|null }
SharedSpace   { owner: { username }, items: PublicItem[], nextCursor }
ReceivedShare { id, ownerUsername: string|null, available: boolean, createdAt }
AssistantStatus { enabled, indexedSources, readySources, staleSources, sourceLimit }
Answer        { answer, abstained: boolean, sources: AnswerSource[] }
AnswerSource  { contentId, title, link, quote, sourceType, indexedAt }
```

All timestamps are ISO-8601 UTC strings; all IDs are 24-character hex strings.

## 3. Endpoints

### Health

| Method & path | Auth | Response |
| --- | --- | --- |
| `GET /health/live` | — | `200 { status: "ok" }` (process is serving) |
| `GET /health/ready` | — | `200 { status: "ready" }`, or `503 SERVICE_UNAVAILABLE` if MongoDB doesn't answer a ping |

### Authentication — `/auth`

| Method & path | Body | Success | Errors |
| --- | --- | --- | --- |
| `POST /auth/register` | `{ username, password }` | `201 User` + cookie | 400, 409, 429 |
| `POST /auth/login` | `{ username, password }` | `200 User` + cookie | 400, 401 `INVALID_CREDENTIALS`, 429 |
| `POST /auth/logout` | — | `204`, cookie cleared; **all** sessions revoked if the token was valid | — (always succeeds) |
| `GET /auth/session` | — | `200 User` | 401 |

`username`: trimmed, lowercased, `^[a-z0-9_]{3,30}$`. `password` (register): 8+ characters, ≤ 72 UTF-8 bytes.

### Account — `/account` (signed in)

| Method & path | Body | Success | Errors |
| --- | --- | --- | --- |
| `PATCH /account/password` | `{ currentPassword, newPassword }` | `204` + fresh cookie; other sessions revoked | 400, 401 |
| `DELETE /account` | `{ password }` | `204`, cookie cleared; account and all owned data deleted | 400, 401 |

### Content — `/content` (signed in)

| Method & path | Input | Success | Errors |
| --- | --- | --- | --- |
| `GET /content` | query: `folder` (ID or `root`), `type`, `tag`, `q` (≤ 200, matches title/link/tags, case-insensitive), `cursor`, `limit` | `200 Page<ContentItem>` | 400 |
| `POST /content` | `{ title, link, type, tags?: string[], folderId?: string|null }` | `201 ContentItem` | 400, 404 (folder) |
| `GET /content/:id` | — | `200 ContentItem` | 400, 404 |
| `PATCH /content/:id` | any non-empty subset of the create fields | `200 ContentItem`. A changed `link` clears `ai`. | 400, 404 |
| `DELETE /content/:id` | — | `204` (its AI chunks are deleted too) | 400, 404 |
| `GET /tags` | — | `200 Tag[]` (tags in use, most used first) | — |

Validation: `title` 1–200 chars; `link` http(s), ≤ 2048, no `user:pass@`; ≤ 20 tags of 1–40 chars,
normalized to lowercase and de-duplicated.

### Folders — `/folders` (signed in)

| Method & path | Body | Success | Errors |
| --- | --- | --- | --- |
| `GET /folders` | — | `200 Folder[]` sorted by name | — |
| `POST /folders` | `{ name }` (1–100) | `201 Folder` | 400, 409 (case-insensitive duplicate) |
| `PATCH /folders/:id` | `{ name }` | `200 Folder` | 400, 404, 409 |
| `DELETE /folders/:id` | — | `204` | 404, 409 (folder not empty) |

### Sharing

| Method & path | Auth | Success | Errors |
| --- | --- | --- | --- |
| `GET /share-link` | signed in | `200 ShareStatus` | — |
| `POST /share-link` | signed in | `201 { token, createdAt }` — the raw token is returned **only here, once**. Replaces any previous link. | — |
| `DELETE /share-link` | signed in | `204` | 404 (no active link) |
| `GET /shared/:token` | public | `200 SharedSpace` (paginated via `cursor`, `limit`) | 404 (unknown, rotated, revoked or malformed — indistinguishable) |

Share URL format used by the web app: `https://<host>/shared/<43-char token>`.

### Shared with me — `/received-shares` (signed in)

| Method & path | Body / query | Success | Errors |
| --- | --- | --- | --- |
| `GET /received-shares` | — | `200 ReceivedShare[]` newest first | — |
| `POST /received-shares` | `{ link }` (a share URL or the bare token) | `200 ReceivedShare` (idempotent) | 400 (invalid link or own link), 404 (not shared) |
| `GET /received-shares/:id` | `cursor`, `limit` | `200 SharedSpace` | 400, 404 (not yours, or revoked) |
| `DELETE /received-shares/:id` | — | `204` | 400, 404 |

### Assistant — `/assistant` (signed in)

| Method & path | Body | Success | Errors |
| --- | --- | --- | --- |
| `GET /assistant/status` | — | `200 AssistantStatus` (works when disabled) | — |
| `PUT /assistant/sources/:id` | `{ consent: true, text?: string (≤ 24,000) }` | `200 ContentItem` with `ai` set. Without `text`, the public page is fetched. | 400, 404, 409 `LIMIT_EXCEEDED`, 422, 429, 502–504, 503 `AI_NOT_CONFIGURED` |
| `DELETE /assistant/sources/:id` | — | `204` (chunks deleted, item kept) | 400, 404 |
| `POST /assistant/ask` | `{ question }` (3–1000) | `200 Answer`. `abstained: true` with no sources when evidence is insufficient. | 400, 429, 502–504, 503 |

## 4. Versioning policy

Breaking changes (removed fields, changed semantics, new required inputs) require `/api/v2`.
Adding optional inputs, response fields, endpoints or error codes is backwards compatible; clients
must ignore unknown fields.

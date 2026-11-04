# Spec: Share Link

## Overview
Let a user share a **read-only** view of their whole library with anyone who has a
link. The user can create a link (shown exactly once), create a new one (which
invalidates the old one) or turn sharing off. Only a SHA-256 hash of the random
token is stored. Anyone opening `/shared/<token>` — no account needed — sees the
owner's username and their items (title, link, type, tags, date), but never folders
or private metadata.

## Depends on
- Step 03 — Login and Logout
- Step 05 — Content list (`listContent`, `ContentGrid`, `usePaginatedList`)
- Step 06 — Add content (`Modal`)

## API endpoints
- `GET /api/share` — `{ active: boolean, createdAt: string | null }` — logged-in
- `POST /api/share` — create or rotate — logged-in — `201 { data: { token, createdAt } }` (raw token returned only here)
- `DELETE /api/share` — turn sharing off — logged-in — `204` · `404` "You don't have an active share link"
- `GET /api/share/:token?limit=&cursor=` — public read-only view
  - `200 { data: { owner: { username }, items: PublicContentDto[], nextCursor } }`
  - `PublicContentDto = { id, title, link, type, tags, createdAt }`
  - `404` "This shared space doesn't exist or is no longer shared" — for unknown, rotated, revoked **and malformed** tokens alike
  - Rate limited: 120 requests / 15 min / IP

## Frontend routes
- `/shared/:token` — `PublicSharePage` inside `PublicLayout` — public (works signed in or out)

## Database changes
- **New model `ShareLink`** (`models/share-link.model.ts`):
  | Field | Type | Constraints |
  |---|---|---|
  | userId | ObjectId → User | required, **unique** (one active link per user) |
  | tokenHash | String | required, unique (SHA-256 hex) |
  | createdAt / updatedAt | Date | timestamps (`updatedAt` = when the current link was created) |

## Components and pages
- **Create:** `features/sharing/types/share.types.ts`, `features/sharing/services/share.service.ts`
  (`status`, `rotate`, `revoke`, `viewPublic(token, cursor)`, `shareUrl(token)` = `${origin}/shared/${token}`)
- **Create:** `features/sharing/components/ShareDialog.tsx` — explains what's shared; "Create link" /
  "Create new link"; read-only input with "Copy" (clipboard, with a fallback message); "Turn off sharing" (danger);
  when a link is active but not shown: "For security the link is only shown when it is created — create a new one to copy it again."
- **Create:** `features/sharing/components/SharedSpaceView.tsx` — header (eyebrow "Shared space · read only",
  H1 "<username>’s space") + read-only `ContentGrid` + "Load more"
- **Create:** `pages/PublicSharePage.tsx`
- **Modify:** `components/layout/Topbar.tsx` / `AppLayout.tsx` — "Share" button opens `ShareDialog`
- **Modify:** `routes/router.tsx` — replace the `/shared/:token` "Coming soon" route
- **Modify:** `frontend/index.html` — `<meta name="referrer" content="no-referrer">` so share URLs don't leak via Referer

## Files to change
- `backend/src/routes/share.routes.ts`, `backend/src/types/api.types.ts`
- `backend/src/services/content.service.ts` — export `toPublicContentDto`
- frontend files listed above; `docs/02_SYSTEM_ARCHITECTURE.md` (add `features/sharing`)

## Files to create
- `backend/src/models/share-link.model.ts`, `backend/src/services/share.service.ts`,
  `backend/src/controllers/share.controller.ts`, `backend/src/validators/share.validator.ts`
- `backend/src/utils/crypto.ts` — `generateBearerToken()` (32 random bytes, base64url → 43 chars),
  `sha256(value)`, `BEARER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/`
- `backend/tests/12-share-link.test.ts`
- frontend files listed above (+ `ShareDialog.test.tsx`)

## New dependencies
No new dependencies (`node:crypto` is built in).

## Rules for implementation
- Never store or log the raw token; store `sha256(token)` only
- Rotate = `findOneAndUpdate({ userId }, { $set: { tokenHash } }, { upsert: true })` — the old token stops working immediately
- Public view: validate the token format first (malformed → same 404), look up by hash, load the owner's username,
  list content via `listContent(ownerId, page)` and map with `toPublicContentDto` — **no `folderId`, no userId**
- Public endpoint responses send `Cache-Control: no-store`
- The public page shows no edit/delete/move controls (don't pass action props to the cards)
- Use CSS variables only

## Tests to write
Backend — `backend/tests/12-share-link.test.ts`
| Case | Expected |
|---|---|
| `GET /api/share` initially | `{ active: false, createdAt: null }` |
| `POST /api/share` | 201, 43-char token; DB stores a hash ≠ token |
| `GET /api/share/:token` signed out | 200, owner username, items with exactly the public keys |
| rotate, then old token | 404; new token 200 |
| `DELETE /api/share`, then token | 404; deleting again → 404 |
| malformed token vs unknown 43-char token | identical 404 message |
| owner's later-added item | visible through the link |
| `POST/DELETE /api/share` signed out | 401 |

Frontend — `ShareDialog.test.tsx`
- No active link → "Create link" → shows the URL `${origin}/shared/<token>` in the input
- Active link → explains it can't be shown again; "Turn off sharing" calls `revoke` and returns to "Create link"

## Definition of done
- [ ] "Share" in the top bar opens the dialog; "Create link" shows a copyable URL
- [ ] Opening the URL in a private window shows "<username>’s space" with all items, read-only
- [ ] No folder names, edit, delete or move controls appear on the public page
- [ ] "Create new link" makes the old URL show "This shared space doesn't exist or is no longer shared"
- [ ] "Turn off sharing" makes the current URL stop working immediately
- [ ] The raw token is not stored in MongoDB (only its hash)

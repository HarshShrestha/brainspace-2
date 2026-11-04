# Spec: Shared With Me

## Overview
Give signed-in users a place to keep the BrainSpace links other people shared with
them. On `/shared-with-me` they paste a share URL (or the bare token) to save it,
see each saved space with its owner, open it read-only inside the app, and remove
it. Saved entries store only the token hash, so when the owner rotates or turns off
their link the entry shows as "Unavailable" automatically.

## Depends on
- Step 03 — Login and Logout
- Step 12 — Share link (`ShareLink`, `share.service.ts`, `SharedSpaceView`, `crypto.ts`)

## API endpoints
- `GET /api/received-shares` — `200 { data: ReceivedShareDto[] }` newest first — logged-in
  - `ReceivedShareDto = { id, ownerUsername: string | null, available: boolean, createdAt }`
- `POST /api/received-shares` — `{ link }` (full URL `http(s)://host/shared/<token>` or bare token) — logged-in
  - `200 { data: ReceivedShareDto }` — **idempotent** (saving the same link twice returns the same entry)
  - `400` "Paste a valid BrainSpace share link" · `400` "This is your own space" · `404` link not shared
- `GET /api/received-shares/:id?limit=&cursor=` — same shape as the public view — logged-in · `404` if not yours or revoked
- `DELETE /api/received-shares/:id` — `204` · `404`

## Frontend routes
- `/shared-with-me` — `SharedWithMePage` (inside `AppLayout`) — logged-in
- `/shared-with-me/:id` — `ReceivedSpacePage` (inside `AppLayout`, "← Shared with me" back link) — logged-in

## Database changes
- **New model `ReceivedShare`** (`models/received-share.model.ts`):
  | Field | Type | Constraints |
  |---|---|---|
  | userId | ObjectId → User | required (the recipient) |
  | tokenHash | String | required |
  | createdAt / updatedAt | Date | timestamps |
  Unique index `{ userId: 1, tokenHash: 1 }`; index `{ userId: 1, createdAt: -1 }`.

## Components and pages
- **Create:** `features/sharing/components/AddSharedSpaceForm.tsx` — URL input + "Add"; errors inline
- **Create:** `features/sharing/components/ReceivedShareList.tsx` — rows with `Users` icon,
  "<owner>’s space" link (or "Unavailable space" + "The owner turned off or replaced this link."), remove `IconButton`
- **Create:** `pages/SharedWithMePage.tsx`, `pages/ReceivedSpacePage.tsx` (reuses `SharedSpaceView`)
- **Modify:** `features/sharing/services/share.service.ts` — `listReceived`, `saveReceived`, `viewReceived`, `removeReceived`
- **Modify:** `routes/router.tsx` (move `/shared-with-me` under `RequireAuth` + `AppLayout`), `routes/paths.ts`
- Remove with `ConfirmDialog` ("Remove this shared space?")

## Files to change
- `backend/src/routes/received-share.routes.ts`, `backend/src/types/api.types.ts`
- `backend/src/services/share.service.ts` — export `resolveShareHash(hash)` and `viewSharedSpaceByHash(hash, page)` for reuse
- frontend files listed above

## Files to create
- `backend/src/models/received-share.model.ts`, `backend/src/services/received-share.service.ts`
  (`extractShareToken`, `saveReceivedShare`, `listReceivedShares`, `viewReceivedShare`, `removeReceivedShare`),
  `backend/src/controllers/received-share.controller.ts`
- `backend/tests/13-shared-with-me.test.ts`
- frontend files listed above (+ `AddSharedSpaceForm.test.tsx`)

## New dependencies
No new dependencies.

## Rules for implementation
- `extractShareToken(input)`: accept a bare 43-char token, or a URL whose path is exactly `/shared/<token>` (optional trailing slash)
  with http(s) protocol and **no** query string, fragment or credentials; anything else → 400
- Save = upsert `{ userId, tokenHash }` with `$setOnInsert` (idempotent; concurrency-safe via the unique index)
- `list` resolves availability in bulk: load all entries → load matching `ShareLink`s by hash → load owners — no per-row queries
- Every query is scoped to the recipient's `userId`; another user's entry id → 404
- Never store or return the raw token
- Use CSS variables only

## Tests to write
Backend — `backend/tests/13-shared-with-me.test.ts` (alice shares, bob receives)
| Case | Expected |
|---|---|
| bob saves alice's full URL | 200, `ownerUsername: "alice"`, `available: true` |
| bob saves it again | same `id`; list length stays 1 |
| bob saves a bare token | 200 |
| alice saves her own link | 400 "This is your own space" |
| URL with `?x=1`, `#frag`, wrong path, `ftp:` | 400 |
| unknown valid-format token | 404 |
| bob opens the entry | 200 with alice's public items |
| alice opens bob's entry id | 404 |
| alice revokes; bob lists | `available: false`, `ownerUsername: null`; opening → 404 |
| bob deletes the entry | 204; list empty |
| signed out | 401 on all endpoints |

Frontend — `AddSharedSpaceForm.test.tsx`
- Empty input shows "Paste a share link first." without calling `onAdd`; valid input calls `onAdd` and clears; server error shown

## Definition of done
- [ ] "Shared with me" lists saved spaces; pasting a share URL adds "<owner>’s space"
- [ ] Opening it shows the owner's items read-only inside the app, with a back link
- [ ] Adding the same link twice doesn't create a duplicate
- [ ] Pasting your own link shows "This is your own space"
- [ ] After the owner turns off sharing, the entry shows "Unavailable space" and can be removed
- [ ] A signed-out visitor to `/shared-with-me` is redirected to `/login`

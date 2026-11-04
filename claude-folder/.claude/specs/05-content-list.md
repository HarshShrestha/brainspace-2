# Spec: Content List (Backend Connection)

## Overview
Replace the hardcoded sample data on the dashboard with the signed-in user's real
library. `GET /api/content` returns the user's items newest-first with tag titles,
paginated with a cursor, and the dashboard loads it through a feature service and
a reusable list hook with loading, error and empty states. After this step every
user sees only their own content.

## Depends on
- Step 01 — Database setup (`Content`, `Tag` models, seed data)
- Step 03 — Login and Logout (`requireAuth`, `req.userId`)
- Step 04 — Dashboard UI (cards, grid, empty state)

## API endpoints
- `GET /api/content?limit=24&cursor=<opaque>` — list own content — logged-in
  - `limit`: integer 1–100, default 24
  - `200 { success: true, data: { items: ContentDto[], nextCursor: string | null } }`
  - `ContentDto`: `{ id, title, link, type, tags: string[], createdAt, updatedAt }` (tags are titles)
  - `400` invalid limit/cursor · `401` signed out

## Frontend routes
- `/dashboard` — now shows real data — logged-in

## Database changes
No database changes (the `{ userId, createdAt, _id }` index from Step 01 serves this query).

## Components and pages
- **Create:** `features/content/services/content.service.ts` — `contentService.list({ cursor })`
- **Create:** `hooks/usePaginatedList.ts` — generic: `items`, `status` (`loading`/`ready`/`error`),
  `error`, `hasMore`, `loadMore()`, `reload()`, `setItems()`; aborts superseded requests and ignores stale responses
- **Create:** `features/content/hooks/useContentList.ts` — wraps `usePaginatedList` for content
- **Modify:** `ContentGrid.tsx` — `status`, `error`, `onRetry`, `hasMore`, `onLoadMore` props: spinner while loading,
  error `Alert` with "Try again", "Load more" button when `hasMore`
- **Modify:** `DashboardPage.tsx` — use `useContentList`; empty state text "Save a link to start building your space."
- **Delete:** `features/content/fixtures/sampleContent.ts` and the `?empty=1` switch

## Files to change
- `backend/src/routes/content.routes.ts` — `GET /` → `requireAuth` → `validate(listContentSchema)` → controller
- `backend/src/types/api.types.ts` — `ContentDto`, `Page<T>`
- `frontend/src/features/content/components/ContentGrid.tsx`, `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/types/api.types.ts` — `Page<T>` (create if missing)

## Files to create
- `backend/src/validators/content.validator.ts` — `listContentSchema` (query: `limit`, `cursor`)
- `backend/src/validators/common.validator.ts` — `objectId()` helper, `paginationQuery`
- `backend/src/utils/cursor.ts` — `encodeCursor({ createdAt, _id })` / `decodeCursor(str)` (base64url of `ISO|id`; invalid → `ApiError(400, "Invalid pagination cursor")`)
- `backend/src/services/content.service.ts` — `listContent(userId, { limit, cursor }): Promise<Page<ContentDto>>`, `toContentDto(doc)`
- `backend/src/controllers/content.controller.ts` — `list`
- `backend/tests/05-content-list.test.ts`
- frontend files listed under Components and pages (+ `hooks/usePaginatedList.test.tsx`)

## New dependencies
No new dependencies.

## Rules for implementation
- Query is always `{ userId }`-scoped; sort `{ createdAt: -1, _id: -1 }`; fetch `limit + 1` to compute `nextCursor`
- Use `.populate("tags", "title").lean()`; map to `ContentDto` in the service — never send Mongoose documents
- Cursor condition: `createdAt < c.createdAt OR (createdAt = c.createdAt AND _id < c.id)`
- Controllers only read validated input and call `listContent`
- Frontend: components never call the service directly — `DashboardPage` uses `useContentList`
- No setState inside an effect body synchronously — derive loading from a request key (React hooks lint rules must pass)
- Use CSS variables only; keep loading/empty/error states visually consistent

## Tests to write
Backend — `backend/tests/05-content-list.test.ts`
| Case | Expected |
|---|---|
| signed out | 401 |
| new user | 200, `{ items: [], nextCursor: null }` |
| user with 3 items | newest first; each item has the `ContentDto` keys only; `tags` are strings |
| two users | each sees only their own items |
| 5 items, `limit=2` | pages of 2, 2, 1 via `nextCursor`; no duplicates; last `nextCursor` null |
| `limit=0`, `limit=101`, `cursor=garbage` | 400 |

Frontend — `usePaginatedList.test.tsx`
- Loads the first page, then `loadMore` appends the next one
- When the key changes, a late response from the old request is ignored
- Exposes the error message on failure

## Definition of done
- [ ] Signing in as `demo` shows the 8 seeded items, newest first, with their tags
- [ ] A newly registered user sees the empty state — no errors
- [ ] With more than 24 items, "Load more" appends the next page
- [ ] Stopping the API and reloading shows an error with a working "Try again"
- [ ] User A never sees user B's items
- [ ] The sample-content fixture file is gone
- [ ] `GET /api/content` no longer returns 501

# Spec: Search and Filter

## Overview
Make the dashboard toolbar from Step 04 functional. `GET /api/content` gains optional
`q` (search over title, link and tag titles), `type` and `tag` filters, applied on the
server so they work across all pages of results. A new `GET /api/tags` endpoint feeds
the tag dropdown with the tags in use. Filter state lives in the URL query string, so
filtered views survive a reload and can be bookmarked. Clicking a tag pill on a card
filters by that tag.

## Depends on
- Step 04 — Dashboard UI (`ContentToolbar`)
- Step 05 — Content list (`listContent`, pagination)
- Step 06 — Add content (per-user tags)

## API endpoints
- `GET /api/content?q=&type=&tag=&limit=&cursor=` — logged-in
  - `q`: trimmed, ≤ 200 chars, case-insensitive substring match on title, link **or** tag title
  - `type`: one of `CONTENT_TYPES`
  - `tag`: tag title (normalised lowercase); unknown tag → empty page, not an error
  - Filters combine with AND; pagination works on the filtered set
- `GET /api/tags` — tags in use by the user's content — logged-in
  - `200 { data: { title: string, count: number }[] }` sorted by count desc, then title

## Frontend routes
- `/dashboard?q=&type=&tag=` — filters reflected in and read from the URL — logged-in

## Database changes
Add index `{ userId: 1, tags: 1 }` to `Content`.

## Components and pages
- **Create:** `hooks/useDebouncedValue.ts` (300 ms)
- **Create:** `features/content/hooks/useTags.ts` — loads `GET /api/tags`; reloads after content changes
- **Modify:** `ContentToolbar.tsx` — controlled `values` + `onChange`; tag select lists `#tag (count)`;
  "Clear filters" link when any filter is active
- **Modify:** `ContentCard.tsx` — optional `onTagClick`; tags render as buttons when provided
- **Modify:** `DashboardPage.tsx` — reads/writes `useSearchParams` (replace history, not push); debounces `q`;
  passes filters to `useContentList(filters)`; empty state "No matches — try a different search or clear the filters" when filtering
- **Modify:** `useContentList.ts` — accepts filters; refetches from page 1 when they change

## Files to change
- `backend/src/models/content.model.ts` — new index
- `backend/src/validators/content.validator.ts` — extend `listContentSchema`
- `backend/src/services/content.service.ts` — build the filter in a private `buildContentFilter()`
- `backend/src/services/tag.service.ts` — `listTagsInUse(userId)`
- `backend/src/routes/tag.routes.ts` — replace the `GET /` stub (`requireAuth` → `tags` controller)
- `backend/src/controllers/content.controller.ts` — `tags`
- `frontend/src/features/content/services/content.service.ts` — `list(filters, cursor)`, `tags()`
- frontend components/hooks listed above

## Files to create
- `backend/src/utils/escapeRegex.ts`
- `backend/tests/09-search-and-filter.test.ts`
- `frontend/src/hooks/useDebouncedValue.ts`, `frontend/src/features/content/hooks/useTags.ts`
- `frontend/src/features/content/components/ContentToolbar.test.tsx`

## New dependencies
No new dependencies.

## Rules for implementation
- User text in `$regex` **must** be escaped with `escapeRegex` (a search for `(a+)+` must work and not hang)
- Tag search: find the user's tag IDs whose title matches `q`, then `$or: [title, link, tags $in ids]`
- All filters stay `userId`-scoped; combine clauses with `$and`
- `listTagsInUse` aggregates over the user's content (`$match` userId as ObjectId → `$unwind` tags → `$group`), then loads titles — unused tags are not listed
- Frontend: URL is the single source of truth for filters; don't duplicate it in state
- Changing filters resets pagination; stale responses for old filters are ignored (already handled by `usePaginatedList`)
- Use CSS variables only

## Tests to write
Backend — `backend/tests/09-search-and-filter.test.ts` (seed 5 items with varied titles/links/tags/types)
| Query | Expected |
|---|---|
| `?type=audio` | only audio items |
| `?tag=Rust` | items tagged `rust` (case-insensitive) |
| `?tag=unknown` | `items: []` |
| `?q=compil` | matches a tag `compilers` |
| `?q=music.example` | matches by link |
| `?q=(a%2B)%2B` | matches the title containing `(a+)+`, returns quickly |
| `?type=audio&q=jazz` | AND of both |
| `?type=podcast` | 400 |
| other user's matching item | never returned |
| `GET /api/tags` | `[{ title, count }]` sorted; excludes tags with no content |

Frontend — `ContentToolbar.test.tsx`
- Typing in search calls `onChange` with the new `q`
- Selecting a type/tag calls `onChange`; "Clear filters" resets all three

## Definition of done
- [ ] Typing "rust" in search shows only matching items (title, link or tag) after a short pause
- [ ] The type and tag dropdowns filter the list; the tag dropdown shows counts
- [ ] Clicking a `#tag` on a card filters by that tag
- [ ] The URL reflects the filters; reloading keeps them; "Clear filters" resets everything
- [ ] A search with no results shows the "No matches" state, not the first-run empty state
- [ ] Searching for `(a+)+` does not error or hang
- [ ] "Load more" continues within the filtered results

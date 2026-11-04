# Spec: Edit Content

## Overview
Let a signed-in user edit any field of their own items. Each card gets an edit
button that opens the existing content dialog pre-filled with the item's values;
saving sends a partial update to `PATCH /api/content/:id`, which validates the
fields, re-resolves tags and enforces ownership. A `GET /api/content/:id` endpoint
is added for fetching a single item.

## Depends on
- Step 05 — Content list
- Step 06 — Add content (`ContentFormDialog`, `content.validation.ts`, `resolveTagIds`)
- Step 07 — Delete content (card actions area, `contentIdSchema`)

## API endpoints
- `GET /api/content/:id` — one own item — logged-in — `200 { data: ContentDto }` · `400` · `404`
- `PATCH /api/content/:id` — partial update — logged-in
  - Body: any non-empty subset of `{ title, link, type, tags }` (same rules as create)
  - `200 { data: ContentDto }` (updated)
  - `400` invalid field or empty body ("Provide at least one field to update") · `401` · `404`

## Frontend routes
No frontend route changes.

## Database changes
No database changes.

## Components and pages
- **Modify:** `ContentFormDialog.tsx` — optional `item` prop: title "Edit item", fields pre-filled
  (tags joined with ", "), submit label "Save changes"; without `item` it behaves exactly as in Step 06
- **Modify:** `ContentCard.tsx` — optional `onEdit` prop renders an `IconButton` (`Pencil`) labelled "Edit <title>"
- **Modify:** `DashboardPage.tsx` — opens the dialog in edit mode; on success replaces the card in place; toast "Changes saved"
- **Modify:** `useContentList.ts` — `replaceItem(item)` helper

## Files to change
- `backend/src/routes/content.routes.ts` — `GET /:id`, `PATCH /:id`
- `backend/src/validators/content.validator.ts` — `updateContentSchema` (params id + partial body, non-empty refine)
- `backend/src/services/content.service.ts` — `getContent(userId, id)`, `updateContent(userId, id, input)`
- `backend/src/controllers/content.controller.ts` — `get`, `update`
- `frontend/src/features/content/services/content.service.ts` — `get(id)`, `update(id, input)`
- `frontend/src/features/content/components/ContentFormDialog.tsx`, `ContentCard.tsx`, `frontend/src/pages/DashboardPage.tsx`, `frontend/src/features/content/hooks/useContentList.ts`

## Files to create
- `backend/tests/08-edit-content.test.ts`

## New dependencies
No new dependencies.

## Rules for implementation
- Reuse the create field schemas — define each field rule once and compose `createContentSchema` / `updateContentSchema` from them
- Update with `Content.updateOne({ _id: id, userId }, { $set })`; `matchedCount === 0` → 404
- Only fields present in the body change; `tags` provided → replaced (re-resolved via `resolveTagIds`)
- Return the fresh `ContentDto` after the update
- Frontend: one dialog component for create and edit — no duplicated form
- On validation error the dialog keeps the user's **edited** values, not the originals
- Use CSS variables only

## Tests to write
Backend — `backend/tests/08-edit-content.test.ts`
| Case | Expected |
|---|---|
| `GET` own item | 200 with correct fields |
| `GET` another user's item / non-existent id | 404 |
| `PATCH` title only | 200; title changed, link/type/tags unchanged |
| `PATCH` tags `["New"]` | tags = `["new"]` |
| `PATCH` `{}` | 400 "Provide at least one field to update" |
| `PATCH` `link: "javascript:x"` | 400; DB unchanged |
| user B patches A's item | 404; A's item unchanged |
| signed out | 401 |

Frontend
- `ContentFormDialog.test.tsx` (extend): with `item`, shows "Edit item", fields pre-filled; submit sends the edited values; server error keeps edited values

## Definition of done
- [ ] Each card has an edit button that opens the dialog with the item's current values
- [ ] Changing the title and saving updates the card in place and shows "Changes saved"
- [ ] Changing tags replaces them (old tags no longer shown on the card)
- [ ] An invalid link shows an error and keeps the edited values
- [ ] Refreshing shows the edited values (persisted)
- [ ] Editing another user's item via the API returns 404
- [ ] `PATCH /api/content/:id` no longer returns 501

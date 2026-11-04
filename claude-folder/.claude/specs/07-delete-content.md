# Spec: Delete Content

## Overview
Let a signed-in user permanently delete one of their own items from the library.
Each card gets a delete icon button that opens a confirmation dialog; confirming
calls `DELETE /api/content/:id`, which verifies ownership before removing the
document. The card disappears from the list without a page reload.

## Depends on
- Step 05 — Content list (cards on the dashboard, `useContentList`)
- Step 06 — Add content (`Modal`, notifications)

## API endpoints
- `DELETE /api/content/:id` — delete own item — logged-in
  - `204` (no body)
  - `400` "Invalid content ID" (not a 24-hex ObjectId) · `401` signed out
  - `404` "Content not found" — missing **or owned by someone else**

## Frontend routes
No frontend route changes.

## Database changes
No database changes. (Orphaned tags are harmless; Step 09's tag list only counts tags in use.)

## Components and pages
- **Create:** `components/common/ConfirmDialog.tsx` — title, message, confirm label, `onConfirm` async;
  shows a spinner while running and an error `Alert` if it fails (dialog stays open)
- **Modify:** `ContentCard.tsx` — optional `onDelete` prop renders an `IconButton` (`Trash2`) labelled
  "Delete <title>"; cards on public/shared views won't pass it
- **Modify:** `DashboardPage.tsx` — opens `ConfirmDialog` ("Delete this item?" / "“<title>” will be permanently removed."),
  removes the item from the list on success, toast "Item deleted"

## Files to change
- `backend/src/routes/content.routes.ts` — `DELETE /:id`
- `backend/src/validators/content.validator.ts` — `contentIdSchema` (params `id` via `objectId()`)
- `backend/src/services/content.service.ts` — `deleteContent(userId, id)`
- `backend/src/controllers/content.controller.ts` — `remove`
- `frontend/src/features/content/services/content.service.ts` — `remove(id)`
- `frontend/src/features/content/hooks/useContentList.ts` — `removeItem(id)` helper
- `frontend/src/features/content/components/ContentCard.tsx`, `frontend/src/pages/DashboardPage.tsx`

## Files to create
- `frontend/src/components/common/ConfirmDialog.tsx`
- `backend/tests/07-delete-content.test.ts`

## New dependencies
No new dependencies.

## Rules for implementation
- Delete with `Content.deleteOne({ _id: id, userId })`; if `deletedCount === 0` → 404
- Never `findByIdAndDelete(id)` without the `userId` filter
- Return 404 (not 403) for another user's item — don't reveal it exists
- Only `DELETE` is accepted; no state-changing GET routes
- The list updates only after the server confirms (no optimistic removal)
- Use CSS variables only; the delete button uses the danger token on hover

## Tests to write
Backend — `backend/tests/07-delete-content.test.ts`
| Case | Expected |
|---|---|
| signed out | 401 |
| delete own item | 204; `Content.findById` returns null; item gone from `GET /api/content` |
| delete it again | 404 |
| user B deletes user A's item | 404, and A's item still exists |
| `id = "not-an-id"` | 400 |
| `GET /api/content/:id/delete` | 404 (no such GET route) |

Frontend
- `ContentCard.test.tsx` (extend): with `onDelete`, the "Delete <title>" button calls it with the item; without it, no delete button

## Definition of done
- [ ] Each card on the dashboard has a delete button with an accessible label
- [ ] Clicking it asks for confirmation; Cancel keeps the item
- [ ] Confirming removes the card without a reload and shows "Item deleted"
- [ ] After a refresh, the item is still gone
- [ ] Trying to delete another user's item via the API returns 404
- [ ] `DELETE /api/content/:id` no longer returns 501

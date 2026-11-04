# Spec: Add Content

## Overview
Let a signed-in user save a new link to their library from a dialog. This replaces
the `POST /api/content` stub with a validated endpoint that creates per-user tags as
needed, and enables the sidebar "New item" button and an "Add item" button on the
dashboard. The new item appears at the top of the list immediately.

## Depends on
- Step 03 — Login and Logout (`requireAuth`)
- Step 05 — Content list (`content.service.ts`, `ContentDto`, `useContentList`)

## API endpoints
- `POST /api/content` — create an item — logged-in
  - Body: `{ title: string, link: string, type: ContentType, tags?: string[] }`
  - `201 { success: true, data: ContentDto }`
  - `400` with the first validation message · `401` signed out

## Frontend routes
No frontend route changes.

## Database changes
No database changes. Tags are upserted into the existing per-user `Tag` collection.

## Components and pages
- **Create (or reuse if the landing warm-up in PROMPTS.md already added it):** `components/ui/Modal.tsx` — accessible dialog: `role="dialog"`, `aria-modal`, labelled by its
  title, focus trap, Escape and backdrop click close it, focus returns to the opener
- **Create:** `components/forms/SelectField.tsx` — labelled select with hint/error, same API as `TextField`
- **Create:** `features/content/components/ContentFormDialog.tsx` — fields Title, Link (`type="url"`),
  Type (select of the 4 types), Tags (optional, comma-separated); "Save to space" / "Cancel";
  field errors under fields, server error in an `Alert`; stays open on failure
- **Create:** `features/content/validation/content.validation.ts` — `contentFormSchema`, `parseTags(text)`
- **Create:** `hooks/useNotify.ts` + `store/notifications.atoms.ts` + `components/common/Toaster.tsx` —
  short-lived "Saved to your space" toast in a polite live region
- **Modify:** `Sidebar.tsx` — enable "New item"
- **Modify:** `DashboardPage.tsx` — "Add item" button in the header and in the empty state;
  on save, prepend the returned item to the list
- **Modify:** `AppLayout.tsx` — owns the dialog open state; exposes `openNewItem()` to pages via outlet context
  and accepts `onCreated` so the dashboard can prepend

## Files to change
- `backend/src/routes/content.routes.ts` — `POST /`
- `backend/src/validators/content.validator.ts` — `createContentSchema`
- `backend/src/services/content.service.ts` — `createContent(userId, input)`
- `backend/src/controllers/content.controller.ts` — `create`
- `frontend/src/features/content/services/content.service.ts` — `create(input)`
- `frontend/src/components/layout/Sidebar.tsx`, `frontend/src/layouts/AppLayout.tsx`, `frontend/src/pages/DashboardPage.tsx`, `frontend/src/App.tsx` (mount `Toaster`)

## Files to create
- `backend/src/services/tag.service.ts` — `resolveTagIds(userId, titles)` (upsert per user with `$setOnInsert`)
- `backend/tests/06-add-content.test.ts`
- frontend files listed under Components and pages (+ `ContentFormDialog.test.tsx`, `Modal.test.tsx`)

## New dependencies
No new dependencies.

## Rules for implementation
- Validation (backend, mirrored on the frontend):
  - `title`: trimmed, 1–200 chars — "Title is required"
  - `link`: trimmed, ≤ 2048, must parse as a URL with protocol `http:` or `https:` and **no embedded
    credentials** (`user:pass@`) — "Enter a valid http(s) link"
  - `type`: one of `CONTENT_TYPES`
  - `tags`: optional, ≤ 20 items, each trimmed, lowercased, 1–40 chars, de-duplicated
- `javascript:`, `data:` and `ftp:` links are rejected
- Tags are created per user only; another user's tag of the same name is a different document
- The service returns a `ContentDto` (populated tag titles) — never the raw document
- Frontend calls go through `contentService` — no `fetch` in components
- Use CSS variables only; no inline styles

## Tests to write
Backend — `backend/tests/06-add-content.test.ts`
| Case | Expected |
|---|---|
| signed out | 401 |
| valid item with tags `["Design", "design ", "Ideas"]` | 201; `tags` = `["design", "ideas"]` |
| item appears in `GET /api/content` first | yes |
| `link: "javascript:alert(1)"` | 400 |
| `link: "https://user:pw@example.com"` | 400 |
| `type: "podcast"` | 400 |
| empty title / 201-char title | 400 |
| 21 tags | 400 |
| same tag name for two users | each user has their own `Tag` document |

Frontend
- `ContentFormDialog.test.tsx`: invalid link shows a field error and doesn't submit; valid input calls `onSubmit`
  with parsed lowercase tags and closes; server error keeps the dialog open and shows the message
- `Modal.test.tsx`: labelled dialog; Escape calls `onClose`; Tab cycles within the dialog

## Definition of done
- [ ] "New item" in the sidebar and "Add item" on the dashboard open the dialog
- [ ] Saving a valid link closes the dialog, shows "Saved to your space", and the card appears first in the list
- [ ] Tags typed as "Design, ideas, design" are saved as `#design #ideas`
- [ ] A `javascript:` link shows "Enter a valid http(s) link" and is not saved
- [ ] Escape, Cancel and backdrop click close the dialog without saving
- [ ] Refreshing the page shows the new item (persisted)
- [ ] `POST /api/content` no longer returns 501

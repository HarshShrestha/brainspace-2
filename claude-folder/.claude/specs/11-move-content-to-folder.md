# Spec: Move Content to Folder

## Overview
Let users file items into folders. `POST /api/content` and `PATCH /api/content/:id`
accept a `folderId` (or `null` for "No folder"), verified to belong to the user. Each
card gets a "Move to folder" select, and the add/edit dialog gets a Folder field that
defaults to the current folder when opened from a folder page. Folder counts in the
sidebar stay accurate after every change.

## Depends on
- Step 06 — Add content, Step 08 — Edit content (create/update endpoints and dialog)
- Step 10 — Folders (`Folder` model, `foldersState`, folder pages)

## API endpoints
- `POST /api/content` — body may include `folderId: string | null` (default `null`)
- `PATCH /api/content/:id` — body may include `folderId: string | null`
- Both: `404` "Folder not found" if the folder doesn't exist or belongs to another user; `400` invalid id

## Frontend routes
No frontend route changes.

## Database changes
No database changes (`Content.folderId` exists since Step 10).

## Components and pages
- **Modify:** `ContentCard.tsx` — optional `folders` + `onMove(item, folderId | null)`; renders a compact
  labelled select ("Move <title> to folder") with "No folder" + each folder
- **Modify:** `ContentFormDialog.tsx` — Folder select (`folders`, `defaultFolderId` props)
- **Modify:** `DashboardPage.tsx` — handle move: in a folder view, an item moved elsewhere disappears from the list;
  otherwise it is replaced in place; toast "Moved to “<name>”" / "Removed from folder"; reload folder counts
- **Modify:** `AppLayout.tsx` — `openNewItem(folderId?)`; when creating from a folder page the dialog defaults to that folder;
  reload folder counts after create

## Files to change
- `backend/src/validators/content.validator.ts` — `folderId: objectId().nullable()` on create (default null) and update
- `backend/src/services/content.service.ts` — `assertFolderOwned(userId, folderId)` before writes; race guard after writes
- `frontend/src/features/content/components/ContentCard.tsx`, `ContentFormDialog.tsx`,
  `frontend/src/pages/DashboardPage.tsx`, `frontend/src/layouts/AppLayout.tsx`, `frontend/src/features/content/types/content.types.ts`

## Files to create
- `backend/tests/11-move-content-to-folder.test.ts`

## New dependencies
No new dependencies.

## Rules for implementation
- Before writing, check `Folder.exists({ _id: folderId, userId })` → else 404 "Folder not found"
- Race guard: after the write, re-check the folder still exists; if it was deleted meanwhile, set the item's
  `folderId` back to `null` and return 404 — an item must never reference a missing folder
- Moving never changes any other field
- Frontend only updates the list after the server confirms the move
- After any create/move/delete, call `useFolders().reload()` so sidebar counts are correct
- Use CSS variables only; the move select must have an accessible label

## Tests to write
Backend — `backend/tests/11-move-content-to-folder.test.ts`
| Case | Expected |
|---|---|
| create with own `folderId` | 201, `folderId` set; folder `itemCount` 1 |
| create with another user's `folderId` | 404; nothing created |
| `PATCH { folderId }` own folder | 200; appears in `?folder=<id>` |
| `PATCH { folderId: null }` | 200; appears in `?folder=root` |
| `PATCH` with another user's folder | 404; item unchanged |
| `PATCH { folderId: "bad" }` | 400 |
| move then delete folder | delete returns 409 until the item is moved out |

Frontend — `ContentCard.test.tsx` (extend)
- Selecting a folder in the move select calls `onMove(item, folderId)`; selecting "No folder" passes `null`

## Definition of done
- [ ] Each card has a "Move to folder" select listing your folders
- [ ] Moving an item updates the sidebar counts immediately
- [ ] On a folder page, moving an item to another folder removes it from that page
- [ ] "Add item" on a folder page pre-selects that folder; the new item appears on that page
- [ ] The edit dialog can change an item's folder
- [ ] Moving into another user's folder via the API returns 404

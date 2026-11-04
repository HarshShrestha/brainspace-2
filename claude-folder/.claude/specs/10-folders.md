# Spec: Folders

## Overview
Introduce single-level folders. Users can create folders (names unique per user,
case-insensitively), see them in the sidebar with item counts, open a folder page
that lists only its items, and delete a folder **only when it is empty** — deleting
a folder never deletes content. Moving items into folders arrives in Step 11; in this
step the `folderId` field exists and folder pages simply show what is filed there
(seed some data with `/seed-content` to see it).

## Depends on
- Step 05 — Content list (`listContent`, filters)
- Step 07 — Delete content (`ConfirmDialog`)
- Step 09 — Search and filter (filter pipeline in `buildContentFilter`)

## API endpoints
- `GET /api/folders` — own folders sorted by name — logged-in
  - `200 { data: FolderDto[] }`, `FolderDto = { id, name, itemCount, createdAt }`
- `POST /api/folders` — `{ name }` (trimmed, 1–100) — logged-in — `201 { data: FolderDto }` · `400` · `409` "A folder with this name already exists"
- `DELETE /api/folders/:id` — logged-in — `204` · `400` · `404` · `409` "Move all items out of this folder before deleting it"
- `GET /api/content?folder=<folderId>|root` — new optional filter (`root` = items in no folder)

## Frontend routes
- `/dashboard/folders/:folderId` — `DashboardPage` in folder mode — logged-in
  - Unknown/other user's folder → "Folder not found" empty state with "Back to library"

## Database changes
- **New model `Folder`** (`models/folder.model.ts`):
  | Field | Type | Constraints |
  |---|---|---|
  | userId | ObjectId → User | required |
  | name | String | required, trim, maxlength 100 |
  | nameKey | String | required (lowercased name) |
  | createdAt / updatedAt | Date | timestamps |
  Unique index `{ userId: 1, nameKey: 1 }`.
- **`Content.folderId`**: ObjectId → Folder, default `null`. Index `{ userId: 1, folderId: 1, createdAt: -1 }`.
- `ContentDto` gains `folderId: string | null`.

## Components and pages
- **Create:** `features/folders/types/folder.types.ts`, `features/folders/services/folder.service.ts`
- **Create:** `store/folders.atoms.ts` — `foldersState { status, folders }` (shared by sidebar and pages)
- **Create:** `features/folders/hooks/useFolders.ts` — `folders`, `status`, `reload()`, `create(name)`, `remove(id)`
- **Create:** `features/folders/components/FolderFormDialog.tsx` — name field, "Create folder"
- **Create:** `features/folders/components/FolderNav.tsx` — sidebar list (`Folder` icon, name, count), active link styling
- **Create:** `features/folders/validation/folder.validation.ts`
- **Modify:** `Sidebar.tsx` — "New folder" secondary button under "New item"; render `FolderNav` (replace the Step 04 placeholder text)
- **Modify:** `DashboardPage.tsx` — read `folderId` param: eyebrow "Folder", H1 = folder name, "N items";
  header delete-folder `IconButton` → `ConfirmDialog`; show the 409 message inside the dialog if not empty;
  after delete navigate to `/dashboard`
- **Modify:** `AppLayout.tsx` — load folders once on mount; after creating a folder, navigate to it
- **Modify:** `routes/router.tsx`, `routes/paths.ts` — `paths.folder(id)`

## Files to change
- `backend/src/models/content.model.ts`, `backend/src/services/content.service.ts` (`folder` filter, `folderId` in DTO),
  `backend/src/validators/content.validator.ts`, `backend/src/types/api.types.ts`, `backend/src/routes/folder.routes.ts`
- `backend/src/db/seed.ts` — create folders "Research" and "Reading list"; file 2 demo items into "Research"
- frontend files listed above; `docs/02_SYSTEM_ARCHITECTURE.md` (add `features/folders`)

## Files to create
- `backend/src/models/folder.model.ts`, `backend/src/validators/folder.validator.ts`,
  `backend/src/services/folder.service.ts`, `backend/src/controllers/folder.controller.ts`
- `backend/tests/10-folders.test.ts`
- frontend files listed under Components and pages (+ `FolderFormDialog.test.tsx`)

## New dependencies
No new dependencies.

## Rules for implementation
- Case-insensitive uniqueness via `nameKey` + unique index; convert duplicate-key error 11000 to 409
- `itemCount` computed with one aggregation over the user's content (`$match` with `new Types.ObjectId(userId)`, `$group` by `folderId`) — no N+1 queries
- Delete: 404 if not owned; 409 if any content has that `folderId`; then delete; then
  `updateMany({ userId, folderId: id }, { $set: { folderId: null } })` to fix any item moved in concurrently
- `?folder=<id>` for another user's folder simply returns an empty page (scoped by userId)
- Folder queries live in `folder.service.ts`; content filter logic stays in `content.service.ts`
- Use CSS variables only; folder names truncate with ellipsis in the sidebar

## Tests to write
Backend — `backend/tests/10-folders.test.ts`
| Case | Expected |
|---|---|
| create "Research" | 201, `itemCount: 0` |
| create "research" again | 409 |
| another user creates "Research" | 201 |
| list | sorted by name; counts correct for items with `folderId` set directly in the DB |
| delete empty folder | 204 |
| delete folder with an item | 409; folder still exists |
| delete another user's folder | 404 |
| `GET /api/content?folder=<id>` | only that folder's items |
| `GET /api/content?folder=root` | only items with `folderId: null` |
| `name: ""` / 101 chars | 400 |

Frontend — `FolderFormDialog.test.tsx`
- Empty name shows an error and doesn't submit; valid name calls `onSubmit` with the trimmed name; server 409 message shown

## Definition of done
- [ ] "New folder" creates a folder, which appears in the sidebar and opens its (empty) page
- [ ] Creating "research" when "Research" exists shows "A folder with this name already exists"
- [ ] After `npm run seed` on a fresh DB, "Research" shows 2 items in the sidebar count and on its page
- [ ] Deleting a folder that contains items is refused with an explanation; deleting an empty folder works
- [ ] Visiting another user's folder URL shows "Folder not found"
- [ ] Search and filters also work inside a folder page

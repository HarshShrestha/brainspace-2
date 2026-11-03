# 04 · Data Model

MongoDB via Mongoose 9. Schemas live in `backend/src/models`. All collections except `users` carry
`userId`, and **every** query on them is scoped by the authenticated user's ID in the service layer.

## 1. Collections

### `users`
| Field | Type | Notes |
| --- | --- | --- |
| `username` | string | Unique, stored lowercase (so uniqueness is case-insensitive), ≤ 30. |
| `passwordHash` | string | bcrypt (cost `BCRYPT_ROUNDS`, default 12). `select: false`. |
| `tokenVersion` | number | Embedded in session tokens; incrementing it revokes all sessions. `select: false`. |
| `createdAt`, `updatedAt` | Date | Timestamps. |

Indexes: `{ username: 1 }` unique.

### `contents`
| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId → users | Owner. |
| `title` | string | ≤ 200. |
| `link` | string | http(s), ≤ 2048. |
| `type` | enum | `article`, `video`, `audio`, `image`. |
| `tags` | ObjectId[] → tags | Owner's tags. |
| `folderId` | ObjectId → folders \| null | `null` = not in a folder. |
| `ai` | object \| null | `{ indexedAt, model, sourceType: page\|pasted, chunkCount, generation }`. Metadata only. |
| `createdAt`, `updatedAt` | Date | |

Indexes: `{ userId, createdAt: -1, _id: -1 }` (listing and cursor), `{ userId, folderId, createdAt: -1 }`,
`{ userId, tags }`, `{ userId, "ai.model" }`.

### `contentchunks`
| Field | Type | Notes |
| --- | --- | --- |
| `userId` | ObjectId | Owner (duplicated for scoped streaming). |
| `contentId` | ObjectId → contents | Source item. |
| `generation` | string (UUID) | Must equal `contents.ai.generation` to be used. |
| `model` | string | Embedding model that produced `embedding`. |
| `ordinal` | number | Position within the source. |
| `text` | string | ≤ ~1,000 characters. |
| `embedding` | number[] | 768 dimensions with the default model. |

Indexes: `{ userId, model }` (retrieval stream), `{ contentId, generation }` (cleanup).

### `tags`
`{ userId, title (lowercase, ≤ 40), timestamps }` — unique `{ userId, title }`.

### `folders`
`{ userId, name (≤ 100), nameKey (lowercase name), timestamps }` — unique `{ userId, nameKey }`.

### `sharelinks`
`{ userId (unique), tokenHash (SHA-256 hex, unique), timestamps }`. At most one per user; the raw token
is never stored. `updatedAt` is when the current link was created.

### `receivedshares`
`{ userId (recipient), tokenHash, timestamps }` — unique `{ userId, tokenHash }`, plus `{ userId, createdAt: -1 }`.
Resolves through `sharelinks.tokenHash`, so rotation or revocation makes it unavailable automatically.

## 2. Invariants and how they are enforced

| Invariant | Enforcement |
| --- | --- |
| Usernames unique, case-insensitive | Lowercased on input + unique index. |
| Folder names unique per user, case-insensitive | `nameKey` + unique compound index; explicit pre-check for a clear message. |
| Content never references another user's folder | Ownership check before write; post-write recheck moves the item to the root if the folder vanished concurrently. |
| Deleting a folder never deletes content | Delete refused (409) while non-empty; items moved in concurrently are reset to root. |
| Searchable AI text never outlives its content | Chunks deleted **before** content; link changes and index removal delete chunks. |
| Only the current index generation is used | Retrieval ignores chunks whose `generation` ≠ `contents.ai.generation`; superseded generations are deleted after each index. |
| Share tokens are unrecoverable from the DB | Only SHA-256 digests stored (tokens have 256 bits of entropy). |

Transactions are intentionally not required (standalone MongoDB is supported). Each multi-step write is
ordered so that a partial failure leaves the data safe (no leaked text, no orphaned references) and
can be retried.

## 3. Account deletion order

`sharelinks` → `contentchunks` → `contents` → (`tags`, `folders`, `receivedshares`) → `users`.
The public link stops working first; the user record goes last, so an interrupted deletion can be
retried by the same user.

## 4. Index management and migrations

- `autoIndex` is disabled; `ensureIndexes()` runs `createIndexes()` for every model at startup. It is
  idempotent and never drops indexes. Unique indexes fail loudly if existing data violates them.
- There is no migration framework yet. Any change that alters existing documents must ship a
  dedicated, idempotent script, tested on a restored backup, and be documented in
  [07_DEPLOYMENT_AND_OPERATIONS.md](07_DEPLOYMENT_AND_OPERATIONS.md).
- Changing `GEMINI_EMBEDDING_MODEL` doesn't need a migration: old indexes are reported as `stale`
  and excluded until reindexed.
- BrainSpace 2 uses new collection layouts and is not schema-compatible with original BrainSpace
  databases. Import old data with a one-off script if needed (users must reset passwords only if
  hashes are not carried over; share links must be re-created).

## 5. Capacity guide

| Quantity | Bound |
| --- | --- |
| Items per page | ≤ 100 |
| Indexed sources per user | 250 |
| Chunks per source | ≤ 30 |
| Chunk vectors scanned per question | ≤ 7,500 (streamed, O(5) memory) |
| Pasted text per source | 24,000 characters |

# 01 · Product Requirements

## 1. Vision

BrainSpace is a calm, personal "second brain": one place to keep the links worth remembering —
articles, documents, videos, audio and images — find them again quickly, share a read-only view
with people you trust, and ask questions across what you have saved, with answers that quote
their evidence.

BrainSpace 2 keeps the idea and the technology of the original BrainSpace project and rebuilds it
from scratch to production standards: explicit contracts, layered modules, validated
configuration, complete test coverage of the main workflows, and deployable artifacts.

## 2. Users

| Persona | Need |
| --- | --- |
| **Owner** (signed-in user) | Save, organize, search and revisit their own links; optionally ask an AI over sources they choose to index. |
| **Viewer** (anyone with a share link) | Browse the owner's collection read-only, without an account. |
| **Recipient** (another signed-in user) | Keep share links they received in one list ("Shared with me"). |
| **Operator** | Deploy, configure, monitor and recover the service safely. |

## 3. Functional requirements

Each requirement is covered by automated tests (see [06_TESTING_STRATEGY.md](06_TESTING_STRATEGY.md)).

### 3.1 Accounts and sessions
- **FR-A1** Register with a username (3–30 of `a-z 0-9 _`, case-insensitive, unique) and a password (8+ characters, ≤ 72 bytes).
- **FR-A2** Sign in and out. Signing out ends the session on **every** device.
- **FR-A3** Sessions last a configurable number of days and are carried in an HTTP-only cookie.
- **FR-A4** Change password (requires the current password); other devices are signed out, the current one stays signed in.
- **FR-A5** Delete the account and **all** of its data after re-entering the password.
- **FR-A6** Wrong username and wrong password produce the same response (no account enumeration).

### 3.2 Library (content)
- **FR-C1** Save an item: title (≤ 200), http(s) link without embedded credentials (≤ 2048), type (`article`, `video`, `audio`, `image`), up to 20 tags, optional folder.
- **FR-C2** Tags are normalized (trimmed, lowercased, de-duplicated) and private to the owner.
- **FR-C3** Browse newest first with pagination ("Load more").
- **FR-C4** Search across titles, links and tags; filter by type, tag and folder. The current search/filter state is part of the URL.
- **FR-C5** Edit any field of an item. Changing the link discards its AI index.
- **FR-C6** Delete an item after confirmation; its AI index is deleted with it.
- **FR-C7** Every item, tag and folder is visible only to its owner.

### 3.3 Folders
- **FR-F1** Create, rename and delete single-level folders; names are unique per owner, case-insensitively.
- **FR-F2** Move items into and out of folders. Folders show item counts.
- **FR-F3** Only empty folders can be deleted; deleting a folder never deletes items.

### 3.4 Sharing
- **FR-S1** Create a read-only public link to the whole collection. The link is shown once.
- **FR-S2** Creating a new link invalidates the old one; turning sharing off invalidates it immediately.
- **FR-S3** Viewers see titles, links, types, tags and dates only — never folders or AI data.
- **FR-S4** Recipients can save a pasted share link to "Shared with me", open it read-only and remove it. Saving is idempotent; an owner cannot add their own link.
- **FR-S5** A saved space shows as unavailable once its owner rotates or revokes the link.

### 3.5 AI assistant (optional, off by default)
- **FR-AI1** The operator enables the assistant; when disabled, the UI explains this and no AI work happens.
- **FR-AI2** The owner explicitly consents each time an item is indexed. Text can be pasted, or the public page is fetched.
- **FR-AI3** Ask questions over indexed sources. Every answer shows exact quotes and links to their sources, labelled "pasted" or "from the page".
- **FR-AI4** If evidence is missing, misquoted or unsupported, the assistant abstains instead of guessing.
- **FR-AI5** Indexes can be refreshed or removed; at most 250 indexed sources per account.
- **FR-AI6** Sources indexed with a different embedding model are flagged as needing reindexing and are excluded from answers.

### 3.6 Experience
- **FR-X1** Responsive from 360 px phones to wide desktops, with no horizontal scrolling.
- **FR-X2** Light and dark themes; the choice persists locally.
- **FR-X3** Keyboard accessible: labelled controls, focus-trapped dialogs, skip link, announced status and errors.
- **FR-X4** Every data view has loading, empty and error states; failures never lose user input.

## 4. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Security | OWASP-aligned controls described in [05_SECURITY.md](05_SECURITY.md). No secret ever reaches the browser bundle or logs. |
| Reliability | Startup fails fast on invalid configuration; liveness and readiness probes; graceful shutdown on SIGTERM. |
| Performance | List endpoints are paginated (≤ 100 per page) and served from compound indexes. AI ranking is bounded (≤ 250 sources × 30 chunks). |
| Observability | One structured JSON log line per request with a request ID; bearer tokens are redacted. |
| Maintainability | Layered, feature-oriented modules documented in [02_SYSTEM_ARCHITECTURE.md](02_SYSTEM_ARCHITECTURE.md); strict TypeScript; lint and format enforced in CI. |
| Portability | Container images for API and web; one-command local stack with Docker Compose. |

## 5. Out of scope (current release)

Password recovery and multi-factor authentication, nested folders, file uploads, collaborative
editing, OCR/transcription, scheduled re-indexing, conversational memory in the assistant,
multi-instance rate limiting (requires a shared store), and a dedicated vector database.

## 6. Changes from the original BrainSpace

| Area | Original | BrainSpace 2 |
| --- | --- | --- |
| Structure | Flat `src/` API, few large components (e.g. a 450-line workspace) | Layered backend, feature-based frontend, documented boundaries |
| API | Unversioned, unpaginated, `{success, message}` errors | `/api/v1`, cursor pagination, server-side search, stable error codes |
| Content | Create and delete only | Full edit, including link changes that invalidate the AI index |
| Folders | Create/delete | Create/rename/delete with counts; DB-enforced case-insensitive names |
| Accounts | Sign up/in/out | + change password, delete account, timing-safe login |
| AI storage | Vectors embedded in content documents | Separate chunk collection with generation IDs (safe reindexing, light listings) |
| Worker | Inherited the API's full environment | Minimal allow-listed environment, concurrency cap, output cap |
| Config | Ad-hoc checks | Zod-validated environment, all problems reported at once |
| Ops | Manual | Dockerfiles, Compose, NGINX config, CI pipeline, health/readiness probes |
| Routing | Manual path matching | React Router with guards, deep links and an error boundary |

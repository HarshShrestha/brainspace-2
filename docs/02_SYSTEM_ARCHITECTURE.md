# 02 · System Architecture

This document is the contract for where code lives. Every contributor (human or agent) must follow
it, and must update it in the same change whenever the structure changes.

## 1. System overview

```
                 HTTPS (single origin)
 Browser ───────────────────────────────► web  (NGINX: static SPA + reverse proxy)
   React SPA                                │  /api/*  (same origin → SameSite cookie works)
                                            ▼
                                         api  (Node 22 · Express 5 · TypeScript)
                                            │            │ stdin/stdout JSON, one process per call
                                            │            ▼
                                            │         rag worker (Python 3.10+, stdlib only)
                                            │            │ HTTPS
                                            ▼            ▼
                                         MongoDB     Google Gemini API  (only when AI is enabled)
```

| Unit | Directory | Technology | Deployed as |
| --- | --- | --- | --- |
| Web app | `frontend/` | React 18, TypeScript, Vite 7, Recoil, React Router 7, Zod | Static files in the `web` NGINX image |
| API | `backend/` | Node 22, Express 5, TypeScript, Mongoose 9, Zod, JWT, bcrypt, pino | `api` image |
| AI worker | `rag/` | Python 3.10+ standard library | Bundled into the `api` image; started per request |
| E2E tests | `e2e/` | Playwright | CI only |

Key design decisions:

1. **Same origin.** The SPA and API share one origin behind a proxy. The session is an HTTP-only,
   `SameSite=Lax` cookie, so cross-site requests cannot carry it and no token is exposed to JavaScript.
2. **Layered API.** `routes → middleware → controllers → services → models`. Business rules live only
   in services; controllers never touch models.
3. **Feature-based UI.** Each feature owns its components, hooks, services, types and validation.
   Shared building blocks live in `components/`, `hooks/` and `utils/`.
4. **AI isolation.** The Python worker has no network listener, receives a minimal allow-listed
   environment (never `JWT_SECRET` or `MONGODB_URI`) and only sees the excerpts the API selected.
5. **Contracts at boundaries.** Every request is validated with Zod; every response uses one
   envelope; every worker response is validated before use.

## 2. Repository layout

```
brainspace-2/
├── backend/            API (TypeScript)
├── frontend/           Web app (TypeScript/React)
├── rag/                AI worker (Python)
├── e2e/                Browser tests (Playwright)
├── docs/               Numbered design documents (this folder)
├── .github/            Dependabot config; CI pipeline in .github/ci (see its README)
├── docker-compose.yml  Production-like local stack
├── package.json        Root convenience scripts only (no dependencies)
└── .editorconfig, .prettierrc.json, .prettierignore, .dockerignore, .gitignore
```

Each of `backend/`, `frontend/` and `e2e/` is an independent npm package with its own lockfile, so
it can be built, tested and deployed alone. **Deviation from the template:** `rag/` and `e2e/` are
additional top-level units because the AI worker is a different language/runtime and the browser
tests span all units.

## 3. Backend (`backend/`)

```
backend/
├── src/
│   ├── app.ts                 createApp(): middleware pipeline + /api/v1 router (no I/O)
│   ├── server.ts              Process entry: connect DB, ensure indexes, listen, graceful shutdown
│   ├── config/                environment.ts · cors.ts · database.ts · session.ts
│   ├── constants/             auth · content · assistant constants, errorCodes.ts
│   ├── db/                    connection.ts · indexes.ts
│   ├── models/                user · tag · folder · content · content-chunk · share-link · received-share
│   ├── validators/            common · auth · content · folder · share · assistant  (Zod)
│   ├── middleware/            auth · csrf · validation · rateLimit · cache · requestLogger · error
│   ├── controllers/           auth · account · content · folder · share · received-share · assistant · health
│   ├── services/              auth · account · content · tag · folder · share · received-share
│   │   └── assistant/         assistant.service.ts · ranking.ts · ragWorker.ts
│   ├── routes/                index.ts + one *.routes.ts per resource (router factories)
│   ├── types/                 api.types.ts (DTO contracts) · express.d.ts (Request augmentation)
│   └── utils/                 ApiError · ApiResponse · asyncHandler · crypto · cursor · escapeRegex · logger
├── tests/
│   ├── setup/environment.ts   Deterministic test configuration (loaded before every file)
│   ├── helpers/               database.ts (isolated DB) · client.ts (signed-in agents, fixtures)
│   ├── unit/                  Pure modules: ranking, cursor, environment, share tokens, logger, worker client
│   └── integration/           Real HTTP + real database: auth, content/folders, sharing, assistant
├── Dockerfile · .env.example · eslint.config.js · vitest.config.ts · tsconfig*.json · package.json
```

### 3.1 Request lifecycle

```
request → requestLogger → helmet → cors → originGuard → express.json → cookieParser
        → apiLimiter → router → [requireAuth] → [rate limiter] → validate(schema) → controller
        → service(s) → model(s) → sendSuccess(...)                 (any throw) → errorHandler
```

### 3.2 Directory contracts

| Directory | Responsibility | May contain | Must not contain | May import |
| --- | --- | --- | --- | --- |
| `config/` | Read and validate configuration; build library options (CORS, Mongoose, cookies). | `env` (validated once), option factories. | Business logic, request handling, direct `process.env` reads elsewhere. | `zod`, Node built-ins, `constants/`. |
| `constants/` | Fixed values shared across layers: limits, enums, error codes. | `as const` objects and derived types. | Logic, I/O, environment-dependent values. | Nothing (leaf). |
| `db/` | Connection lifecycle, readiness ping, index creation. | `connectDatabase`, `disconnectDatabase`, `isDatabaseReady`, `ensureIndexes`. | Queries for features. | `config/`, `models/`, `utils/logger`. |
| `models/` | Mongoose schemas, model-level validation and indexes. | Schema definitions, `InferSchemaType` exports. | Business rules, HTTP concepts, cross-model workflows. | `mongoose`, `constants/`. |
| `validators/` | Zod schemas for `body`, `params`, `query` of each route. | Schema objects shaped `{ body?, params?, query? }`. | Database access, side effects. | `zod`, `constants/`, `validators/common`. |
| `middleware/` | Cross-cutting request concerns. | Auth, origin guard, validation, rate limits, caching headers, logging, error handling. | Feature business rules. | `config/`, `constants/`, `services/auth` (session resolution only), `utils/`. |
| `controllers/` | HTTP adapters: read validated input, call one service, send the envelope. | Thin handlers wrapped in `asyncHandler`; cookie setting. | Mongoose models, business rules, try/catch for flow control. | `middleware/` (getters), `services/`, `validators/` (types), `utils/`. |
| `services/` | All business logic and data access; ownership checks; DTO mapping. | Plain async functions taking `userId` first; `toXDto` mappers. | `req`/`res`, status-code decisions other than throwing `ApiError`. | `models/`, `config/`, `constants/`, `types/`, `utils/`, other services. |
| `services/assistant/` | AI orchestration: indexing, retrieval, answering; worker client; ranking. | `assistant.service.ts` (orchestration), `ranking.ts` (pure), `ragWorker.ts` (subprocess client). | HTTP concerns, direct Gemini calls (the worker owns them). | Same as `services/`. |
| `routes/` | Map URLs to middleware and controllers. | Router **factories** (`createXRouter()`), so every app instance gets fresh rate-limit counters. | Logic beyond wiring. | `controllers/`, `middleware/`, `validators/`. |
| `types/` | Shared TypeScript contracts. | Response DTOs (`api.types.ts`), Express augmentation. | Runtime code. | `constants/` (types only). |
| `utils/` | Small, generic, dependency-light helpers. | `ApiError`, response helpers, `asyncHandler`, crypto, cursor codec, regex escape, logger. | Feature knowledge. | `config/`, `constants/`. |

**Deviations from the template:** there is no `interfaces/` directory. All TypeScript contracts live in
`types/` (one strategy, no duplication). There are also no `index.ts` barrels, except `routes/index.ts`,
which composes the versioned API router.

### 3.3 Key files

| File | Role | Depends on | Used by |
| --- | --- | --- | --- |
| `config/environment.ts` | Parses `process.env` with Zod into a typed, frozen `env`; throws one message listing every invalid variable. `loadEnvironment()` is exported for tests. | `zod` | Everything that needs configuration. |
| `app.ts` | Builds the Express app (no port, no DB), which makes it importable by Supertest. | config, middleware, routes | `server.ts`, integration tests. |
| `server.ts` | Connects MongoDB, runs `ensureIndexes`, listens, handles SIGTERM/SIGINT and fatal errors. | app, db, logger | Container entry point. |
| `middleware/validation.middleware.ts` | `validate(schema)` parses input into `req.validated`; `getValidated(req, schema)` returns it fully typed. | `zod` | All routes and controllers. |
| `middleware/auth.middleware.ts` | `requireAuth` resolves the cookie or Bearer token to `req.userId`; `authUserId(req)` reads it. | `services/auth.service` | Protected routers, controllers. |
| `middleware/error.middleware.ts` | Maps `ApiError`, `ZodError`, JSON-parse, payload-size, duplicate-key and cast errors to the error envelope; logs only unexpected errors. | `utils/ApiError`, logger | `app.ts`. |
| `services/assistant/ragWorker.ts` | Spawns `python -m brainspace_rag.worker`, enforces a deadline, output cap and concurrency semaphore, and maps worker errors to `ApiError`. | Node `child_process` | `assistant.service.ts`. |
| `utils/cursor.ts` | Opaque keyset cursor over `(createdAt desc, _id desc)`. | `mongoose` types | `content.service.ts`. |

### 3.4 Module relationships

```
auth.service ◄── account.service           content.service ──► tag.service
     ▲                                          ▲   ▲
     │ (resolveSession)                         │   └── share.service ◄── received-share.service
auth.middleware                                 │
                                         assistant.service ──► ranking, ragWorker
folder.service (independent)
```

Services may call other services in the direction of the arrows; cycles are not allowed.

## 4. AI worker (`rag/`)

```
rag/
├── brainspace_rag/
│   ├── worker.py      Entry point and wire protocol (stdin → stdout, user-safe errors)
│   ├── pipeline.py    Operations: index, embed_query, answer (generate + verify)
│   ├── extraction.py  SSRF-safe public page fetch + HTML→text
│   ├── chunking.py    Overlapping, word-boundary chunking
│   ├── evidence.py    Verbatim-quote validation
│   ├── provider.py    Gemini REST client (embeddings, structured JSON generation)
│   ├── config.py      Provider configuration from the worker's minimal environment
│   ├── limits.py      Bounds (mirror of backend constants)
│   └── errors.py      RagError(status, user-safe message)
├── tests/             unittest suites + stubs/sitecustomize.py (test-only provider simulator)
├── pyproject.toml · README.md
```

| Module | Must not |
| --- | --- |
| `worker.py` | Contain business logic; print anything except the single JSON response. |
| `pipeline.py` | Rank vectors (the API ranks), read MongoDB, or trust model output without validation. |
| `extraction.py` | Follow redirects without revalidating them, connect to unvalidated IPs, or execute JavaScript. |
| `provider.py` | Log prompts, source text or credentials. |
| `tests/stubs/` | Be shipped: it is excluded from images by `.dockerignore`. |

The worker is the only component that talks to the AI provider. The API is the only component that
talks to MongoDB.

## 5. Frontend (`frontend/`)

```
frontend/
├── index.html · public/favicon.svg
├── nginx/                     default.conf.template · security-headers.conf  (web image)
├── scripts/build-icon-font.py Regenerates the icon subset font + typed codepoint map
├── src/
│   ├── main.tsx               React root + RecoilRoot + global CSS
│   ├── App.tsx                Session bootstrap, theme, RouterProvider, Toaster
│   ├── assets/fonts/          Material Symbols subset (+ licence)
│   ├── components/
│   │   ├── ui/                Button · IconButton · Modal · Spinner
│   │   ├── forms/             Field · TextField · TextAreaField · SelectField · CheckboxField
│   │   ├── common/            Icon (+ generated iconCodepoints.ts) · Logo · Alert · EmptyState · LoadingState · ConfirmDialog · Toaster
│   │   └── layout/            Sidebar · Topbar · UserMenu · ThemeToggle
│   ├── features/
│   │   ├── authentication/    components/AuthForm · hooks/useSessionBootstrap, useAuthActions · services · types · validation
│   │   ├── content/           components/ContentCard, ContentGrid, ContentToolbar, ContentFormDialog · hooks/useContentList, useTags · services · types · validation
│   │   ├── folders/           components/FolderFormDialog, FolderNav · hooks/useFolders · services · types · validation
│   │   ├── sharing/           components/ShareDialog, AddSharedSpaceForm, ReceivedShareList, SharedSpaceView · services · types
│   │   ├── assistant/         components/AssistantChat, AnswerCard, IndexSourceDialog, SourceList · hooks/useAssistantStatus · services · types · validation
│   │   └── settings/          components/ChangePasswordForm, DeleteAccountForm · services/account.service · validation
│   ├── hooks/                 usePaginatedList · useTheme/useApplyTheme · useNotify · useDebouncedValue · useDocumentTitle
│   ├── layouts/               AppLayout (authenticated shell + app-wide dialogs) · AuthLayout · PublicLayout
│   ├── pages/                 One component per route (Library, Assistant, SharedWithMe, ReceivedSpace, PublicShare, Settings, Login, Register, NotFound, RouteError)
│   ├── routes/                router.tsx (route table) · RequireAuth.tsx (guards) · paths.ts (URL builders)
│   ├── services/              apiClient.ts (fetch wrapper, ApiError, 401 handling)
│   ├── store/                 Recoil atoms: session · folders · library (revision) · notifications · theme
│   ├── styles/                tokens · base · components · layout · features  (imported by index.css)
│   ├── types/                 api.types.ts (wire envelope, Page<T>)
│   ├── utils/                 errorMessage · fieldErrors · formatDate · url
│   └── constants/             content · assistant · storage
├── tests/                     setup.ts · render.tsx (providers + fixtures)
└── Dockerfile · .env.example · eslint.config.js · vite.config.ts · vitest.config.ts · tsconfig*.json
```

### 5.1 Directory contracts

| Directory | Responsibility | May contain | Must not contain | May import |
| --- | --- | --- | --- | --- |
| `components/ui/` | Generic, unstyled-by-domain primitives. | Buttons, modal, spinner. | Feature or API knowledge. | `components/common/Icon`, React. |
| `components/forms/` | Accessible form controls with label/hint/error wiring. | Field wrappers. | Validation rules, API calls. | React. |
| `components/common/` | Reusable app-level presentational pieces. | Icon, alerts, empty/loading states, confirm dialog, toaster. | API calls. | `components/ui`, `store/notifications` (Toaster only), `utils/`. |
| `components/layout/` | Layout chrome with no feature knowledge. | Sidebar/top bar shells, user menu, theme toggle. | Feature imports (layouts compose features instead). | `components/*`, `hooks/useTheme`. |
| `features/<name>/components` | Feature UI. | Components for that feature. | `fetch`, direct `apiClient` use (go through the feature service). | Own feature, `components/`, `hooks/`, `utils/`, `constants/`, other features' **types**, and the specific shared components noted below. |
| `features/<name>/services` | The feature's API calls. | Typed functions using `apiClient`. | React, state. | `services/apiClient`, own types. |
| `features/<name>/hooks` | Feature state and effects. | Hooks combining services and store. | JSX. | Own services/types, `store/`, `hooks/`. |
| `features/<name>/types` | Feature data contracts (mirror backend DTOs). | Interfaces/types. | Runtime code. | `constants/`, other types. |
| `features/<name>/validation` | Zod schemas for forms in the feature. | Schemas and pure parsers. | React. | `zod`, `constants/`, `utils/`. |
| `hooks/` | Reusable non-feature hooks. | Pagination, theme, notifications, debounce, title. | Feature knowledge. | `store/`, `types/`, `utils/`. |
| `layouts/` | Route shells composing features. | AppLayout, AuthLayout, PublicLayout. | Page-specific logic. | Anything below them. |
| `pages/` | One screen per route; orchestrates features for that screen. | Data hooks, dialogs state, composition. | Reusable UI (extract it), raw `fetch`. | Features, components, hooks, layouts (`useAppLayout`). |
| `routes/` | Routing configuration and guards. | Route table, guards, path builders. | Page implementation. | Pages, layouts, store. |
| `services/` | Cross-feature network infrastructure. | `apiClient`. | Feature endpoints. | `types/`. |
| `store/` | Global client state (Recoil atoms). | Session, folders, list revision, notifications, theme. | Derived server data that a single page owns. | Feature types. |
| `styles/` | Global design system. | Tokens (CSS variables, light/dark), base, component, layout and feature styles. | Inline colour values outside `tokens.css`. | — |
| `utils/` | Pure helpers. | Formatting, URL and error helpers. | React, I/O. | `zod` types. |

**Allowed cross-feature imports** (shared domain building blocks, kept deliberately small):
`content/components/ContentGrid` (used by `sharing` to render read-only spaces);
`authentication/hooks/useAuthActions` (used by `settings` to sign out after account deletion);
`authentication/validation/newPasswordSchema` (used by `settings`); and feature **types** wherever needed.
Any new cross-feature import must be added to this list or extracted into `components/`/`hooks/`.

**Deviations from the template:**
- `lib/` is omitted: there is no third-party wrapper that isn't already a service or hook.
- `styles/` is added for the global CSS design system (tokens + layers), which the template doesn't cover.
- `services/` contains only the HTTP client; feature endpoints live in each feature's `services/`.

### 5.2 State management

| State | Where | Why |
| --- | --- | --- |
| Session (`loading`/`authenticated`/`anonymous`) | `store/session.atoms.ts` | Read by guards, layouts and pages. |
| Folders | `store/folders.atoms.ts` via `useFolders()` | Shown in the sidebar and used by library dialogs. |
| Content revision counter | `store/library.atoms.ts` | Lets app-wide actions (e.g. "New item" in the sidebar) tell mounted lists to refetch. |
| Notifications, theme | `store/` | App-wide UI concerns. |
| Lists (items, pages, cursors) | `usePaginatedList` inside pages | Owned by the screen showing them; refetched when filters change. |
| Form and dialog state | Local `useState` | Ephemeral. |

Writes always go through the API first; local state is updated only with the server's response.

### 5.3 Routing

| Path | Guard | Page |
| --- | --- | --- |
| `/login`, `/register` | redirect if signed in | LoginPage, RegisterPage (AuthLayout) |
| `/shared/:token` | public | PublicSharePage (PublicLayout) |
| `/` · `/folders/:folderId` | requires sign-in | LibraryPage (AppLayout) |
| `/assistant` · `/shared-with-me` · `/shared-with-me/:id` · `/settings` | requires sign-in | respective pages |
| `*` | — | NotFoundPage; render errors → RouteErrorPage |

## 6. Cross-cutting conventions

- **Naming.** Backend: `feature.controller.ts`, `feature.service.ts`, `feature.routes.ts`,
  `feature.model.ts` (kebab-case for multi-word features, e.g. `received-share.model.ts`),
  `feature.validator.ts`, `name.middleware.ts`, `name.constants.ts`; utilities in camelCase
  (`ApiError.ts` and `ApiResponse.ts` are PascalCase because they are classes/types per the template).
  Frontend: components `PascalCase.tsx`, hooks `useThing.ts`, services `feature.service.ts`,
  types `feature.types.ts`, validation `feature.validation.ts`, tests `Name.test.tsx`.
- **Imports.** The frontend uses the `@/` alias (and `@tests/` in tests); lint forbids `../../` imports.
- **Errors.** The backend throws `ApiError` with a stable code; the frontend shows `error.message`
  and branches only on `error.code`/`status`.
- **Limits** are defined once per side (`constants/`) and mirrored in `rag/limits.py`; the server is
  always the source of truth.

## 7. Changing the architecture

1. Inspect the existing structure and reuse the closest existing pattern.
2. If a new directory or a cross-boundary import is needed, document it here first, with the reason.
3. Keep each new module independently testable and add tests at the matching level.
4. Verify import boundaries (`npm run lint`) and types (`npm run typecheck`) after refactoring.

# 02 · System Architecture

This document is the contract for **where code lives** in BrainSpace. Claude and every
contributor must follow it. If a step adds, renames or moves a directory, this file is
updated in the same change (`/ship-feature` checks this).

## 1. System overview

```
Browser (React SPA, :5173 in dev)
   │  fetch('/api/...', credentials: 'include')   ← same origin via Vite proxy / reverse proxy
   ▼
API (Express 5 + TypeScript, :8000)
   │  routes → middleware → controllers → services → models
   ▼
MongoDB (Mongoose)
```

- **Same origin.** The frontend calls relative `/api` URLs. In development Vite proxies them to
  `:8000`; in production a reverse proxy serves the built SPA and forwards `/api`. This lets the
  session live in an HTTP-only, `SameSite=Lax` cookie that JavaScript can never read.
- **Two independent packages.** `backend/` and `frontend/` each have their own `package.json`,
  lockfile, tests and tooling. Neither imports from the other; they share only the HTTP contract.
- **Envelope.** Every API response is `{ success: true, data }` or `{ success: false, message }`.

## 2. Repository layout

```
brainspace/
├── CLAUDE.md                 Agent rulebook (conventions, constraints, step status)
├── .claude/                  Agentic workflow: commands, agents, skills, specs, hooks
├── docs/02_SYSTEM_ARCHITECTURE.md
├── backend/
└── frontend/
```

## 3. Backend (`backend/`)

```
backend/
├── src/
│   ├── app.ts            createApp(): helmet, cors, json, cookies, /api router, 404, errors. No I/O.
│   ├── server.ts         Connect DB → listen → graceful shutdown. The only process entry point.
│   ├── config/           environment.ts (zod-validated env), session.ts (cookie options)
│   ├── constants/        content.constants.ts (CONTENT_TYPES, limits)
│   ├── db/               connection.ts, seed.ts
│   ├── models/           user, tag, content, folder, share-link, received-share (.model.ts)
│   ├── validators/       common, auth, content, folder, share (.validator.ts)
│   ├── middleware/       auth, validation, rateLimit, error (.middleware.ts)
│   ├── controllers/      one per feature (.controller.ts) + health, notImplemented
│   ├── services/         one per feature (.service.ts)
│   ├── routes/           index.ts + one router factory per feature (.routes.ts)
│   ├── utils/            ApiError, ApiResponse, asyncHandler, cursor, crypto, escapeRegex
│   └── types/            api.types.ts (DTOs), express.d.ts (req.userId, req.validated)
├── tests/
│   ├── setup/            env.ts — deterministic test environment
│   ├── helpers/          database.ts (in-memory MongoDB), agents/fixtures
│   └── NN-<spec>.test.ts one file per spec, written by brainspace-test-writer
└── package.json · tsconfig*.json · vitest.config.ts · eslint.config.js · .env.example
```

### Request lifecycle
```
request → helmet → cors → express.json → cookieParser → router
        → [rate limiter] → [requireAuth] → validate(schema) → controller → service → model
        → sendSuccess(res, dto)                     (anything thrown) → errorHandler
```

### Directory contracts

| Directory | Responsibility | May contain | Must not contain | May import |
|---|---|---|---|---|
| `config/` | Read and validate configuration once | `env`, cookie/CORS option builders | Business logic; `process.env` reads anywhere else | `zod`, `constants/` |
| `constants/` | Fixed shared values | `as const` enums and limits | Logic, I/O | nothing |
| `db/` | Connection lifecycle and seeding | `connectDatabase`, `disconnectDatabase`, `seed.ts` | Feature queries used by routes | `config/`, `models/` |
| `models/` | Mongoose schemas + indexes | Schema definitions, inferred types | Business rules, hashing, HTTP concepts | `mongoose`, `constants/` |
| `validators/` | zod schemas for body/params/query | `{ body?, params?, query? }` objects | DB access | `zod`, `constants/` |
| `middleware/` | Cross-cutting request concerns | Auth, validation, rate limits, errors | Feature business logic | `config/`, `services/auth` (session check), `utils/` |
| `controllers/` | HTTP adapters | Read validated input, call one service, send envelope, set cookies | Mongoose calls, business rules | `services/`, `middleware/` getters, `utils/` |
| `services/` | **All** business logic and DB queries | Functions taking `userId` first; DTO mappers | `req`/`res`, response formatting | `models/`, `config/`, `constants/`, `types/`, `utils/`, other services |
| `routes/` | URL → middleware → controller wiring | `createXRouter()` factories | Logic | `controllers/`, `middleware/`, `validators/` |
| `utils/` | Small generic helpers | Errors, response helpers, crypto, cursor | Feature knowledge | `constants/` |
| `types/` | Shared TS contracts | DTO interfaces, Express augmentation | Runtime code | `constants/` (types) |

There is **no `interfaces/` directory**: all TypeScript contracts live in `types/` (one strategy, no duplication).

### Service dependency direction
```
auth.service ◄── account.service          content.service ──► tag.service
     ▲                                          ▲
     │ (session check)                          ├── share.service ◄── received-share.service
auth.middleware                                 └── folder.service (folder ownership checks)
```
Arrows point to the module being used. Cycles are not allowed.

## 4. Frontend (`frontend/`)

```
frontend/src/
├── main.tsx · App.tsx         RecoilRoot, session bootstrap, theme, RouterProvider, Toaster
├── components/
│   ├── ui/                    Button, IconButton, Modal, Spinner
│   ├── forms/                 TextField, SelectField, (Field wrapper)
│   ├── common/                Logo, Alert, EmptyState, LoadingState, ConfirmDialog, Toaster
│   └── layout/                Sidebar, Topbar, UserMenu, ThemeToggle
├── features/
│   ├── authentication/        components · hooks · services · types · validation
│   ├── content/               components · hooks · services · types · validation
│   ├── folders/               components · hooks · services · types · validation
│   ├── sharing/               components · services · types
│   └── settings/              components · services · validation
├── pages/                     One component per route (LandingPage, DashboardPage, …)
├── layouts/                   PublicLayout, AuthLayout, AppLayout
├── routes/                    router.tsx, RequireAuth.tsx, paths.ts
├── services/                  apiClient.ts — the only place that calls fetch
├── store/                     Recoil atoms: session, folders, notifications, theme
├── hooks/                     usePaginatedList, useDebouncedValue, useNotify, useTheme, useDocumentTitle
├── utils/                     formatDate, url, fieldErrors
├── constants/                 content.constants.ts, storage keys
├── types/                     api.types.ts (Page<T>)
└── styles/                    tokens.css · base.css · components.css · layout.css · <page>.css · index.css
```

Feature folders are created by the step that first needs them (see each spec).

### Directory contracts

| Directory | Responsibility | May contain | Must not contain | May import |
|---|---|---|---|---|
| `components/ui`, `forms` | Generic, accessible primitives | Buttons, dialog, labelled fields | Feature or API knowledge | React, `lucide-react` |
| `components/common` | App-level presentational pieces | Alerts, empty/loading states, toaster | API calls | `components/ui`, `store/notifications` (Toaster) |
| `components/layout` | Layout chrome | Sidebar/top-bar shells, user menu | Feature imports (layouts compose features) | `components/*`, `hooks/` |
| `features/<f>/components` | Feature UI | Feature components | `fetch`, direct `apiClient` use | own feature, `components/`, `hooks/`, `utils/`, other features' **types** |
| `features/<f>/services` | Feature API calls | Typed functions over `apiClient` | React, state | `services/apiClient`, own types |
| `features/<f>/hooks` | Feature state/effects | Hooks combining services + store | JSX | own services/types, `store/`, `hooks/` |
| `features/<f>/types` | Data contracts mirroring API DTOs | Types only | Runtime code | `constants/` |
| `features/<f>/validation` | zod form schemas | Schemas, pure parsers | React | `zod`, `constants/`, `utils/` |
| `pages/` | One screen per route | Composition, page-level dialog state | Reusable UI, `fetch` | features, components, hooks, layouts |
| `layouts/` | Route shells | App/Auth/Public layouts | Page logic | anything below them |
| `routes/` | Routing config and guards | Route table, guards, path builders | Page implementations | pages, layouts, store |
| `services/` | Network infrastructure | `apiClient` | Feature endpoints | `types/` |
| `store/` | Global client state | Recoil atoms | Server data owned by one page | feature types |
| `styles/` | Design system | Tokens (light/dark), layered CSS | Hex values outside `tokens.css` | — |
| `utils/`, `hooks/` | Pure helpers / reusable hooks | Formatting, debounce, pagination | Feature knowledge | `types/`, `store/` |

Allowed cross-feature imports (keep this list short and update it when adding one):
`sharing` → `content/components/ContentGrid`; `settings` → `authentication/hooks/useAuthActions`
and `authentication/validation` (password schema); any feature → another feature's `types`.

### State
| State | Where |
|---|---|
| Session (`loading` / `authenticated` / `anonymous`) | `store/session.atoms.ts` |
| Folders (sidebar + pages) | `store/folders.atoms.ts` via `useFolders()` |
| Notifications, theme | `store/` |
| Paginated lists | `usePaginatedList` inside the page that shows them |
| Form and dialog state | local `useState` |

Writes go to the API first; local state changes only with the server's response.

## 5. Testing layout
- Backend: `backend/tests/NN-<spec>.test.ts`, real Express app via `createApp()` + Supertest,
  isolated MongoDB per file (`mongodb-memory-server`, or `TEST_MONGODB_URI`).
- Frontend: `<Component>.test.tsx` next to the component; services mocked with `vi.spyOn`;
  queries by role/label.
- Each spec's "Tests to write" section defines the cases; `brainspace-test-writer` writes them from the spec.

## 6. Changing the architecture
1. Prefer the closest existing pattern.
2. If a new directory or cross-boundary import is genuinely needed, record it here first, with the reason.
3. Keep new modules independently testable.
4. Run `npm run typecheck && npm run lint` in both packages after refactoring.

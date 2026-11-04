# CLAUDE.md

## Project overview

BrainSpace is a personal "second brain": users save links (articles, videos, audio,
images), tag them, organise them into folders, search them, and share a read-only
view of their collection. It is a TypeScript monorepo with a React frontend and an
Express + MongoDB API.

---

## Architecture
```
brainspace/
├── CLAUDE.md
├── docs/
│   └── 02_SYSTEM_ARCHITECTURE.md   # Source of truth for folder responsibilities
├── backend/                        # Express 5 + TypeScript + Mongoose
│   ├── src/
│   │   ├── app.ts                  # createApp(): middleware + routers, no I/O
│   │   ├── server.ts               # connect DB, listen, graceful shutdown
│   │   ├── config/                 # environment.ts (zod-validated env), cors.ts
│   │   ├── constants/              # content.constants.ts (CONTENT_TYPES, limits)
│   │   ├── db/                     # connection.ts, seed.ts
│   │   ├── models/                 # *.model.ts — Mongoose schemas only
│   │   ├── validators/             # *.validator.ts — zod request schemas
│   │   ├── middleware/             # auth, validation, error middleware
│   │   ├── controllers/            # *.controller.ts — HTTP in/out only
│   │   ├── services/               # *.service.ts — ALL business logic + DB queries
│   │   ├── routes/                 # index.ts + *.routes.ts
│   │   ├── utils/                  # ApiError.ts, ApiResponse.ts, asyncHandler.ts
│   │   └── types/                  # express.d.ts, api.types.ts (DTOs)
│   └── tests/                      # vitest + supertest + mongodb-memory-server
└── frontend/                       # React 18 + TypeScript + Vite + Recoil
    ├── src/
    │   ├── App.tsx, main.tsx
    │   ├── components/{common,layout,forms,ui}/   # reusable, feature-agnostic
    │   ├── features/<feature>/{components,hooks,services,types,validation}/
    │   ├── pages/                  # one component per route
    │   ├── layouts/                # AppLayout, AuthLayout, PublicLayout
    │   ├── routes/                 # router.tsx, RequireAuth.tsx, paths.ts
    │   ├── services/apiClient.ts   # the ONLY place fetch() is called
    │   ├── store/                  # Recoil atoms
    │   ├── hooks/ utils/ constants/ types/
    │   └── styles/                 # tokens.css (CSS variables) + global css
    └── tests/setup.ts
```

**Where things belong:**
- New API endpoint → route in `routes/<feature>.routes.ts` → thin handler in `controllers/<feature>.controller.ts` → logic in `services/<feature>.service.ts`
- DB queries → `services/` only — never in controllers, routes or middleware
- Request validation → zod schema in `validators/<feature>.validator.ts`, applied with `validate()` middleware
- Response shapes → `types/api.types.ts` DTOs; services map Mongoose docs to DTOs
- New page → `frontend/src/pages/<Name>Page.tsx` + register it in `routes/router.tsx` and `routes/paths.ts`
- Feature UI, hooks, API calls, types, form schemas → `frontend/src/features/<feature>/...`
- Reusable UI (Button, Modal, TextField…) → `frontend/src/components/...`
- Colours, spacing, radii → CSS variables in `styles/tokens.css`; page styles in `styles/<page>.css`

If you add or move a directory, update `docs/02_SYSTEM_ARCHITECTURE.md` in the same change.

---

## Code style

- TypeScript `strict` everywhere — no `any`, use `import type` for types
- Backend files: `feature.controller.ts`, `feature.service.ts`, `feature.routes.ts`,
  `feature.model.ts`, `feature.validator.ts`, `name.middleware.ts`
- Frontend files: components `PascalCase.tsx`, hooks `useThing.ts`,
  services `feature.service.ts`, types `feature.types.ts`, schemas `feature.validation.ts`
- Controllers: one responsibility — read validated input, call one service, send response
- Every API response uses the envelope `{ success: true, data }` or `{ success: false, message }`
- Errors: `throw new ApiError(status, message)` — never `res.status(...).send("string")` in services
- Frontend: never call `fetch` in components — go through `features/<f>/services` → `services/apiClient.ts`
- Imports in the frontend use the `@/` alias — no `../../` chains

---

## Tech constraints

- **Frontend: React 18 + TypeScript + Vite + Recoil + react-router** — no Redux, no Next.js, no Tailwind, no UI kits (MUI/shadcn/Bootstrap)
- **Backend: Express 5 + TypeScript + Mongoose + MongoDB** — no Prisma, no SQL databases, no NestJS
- **Validation: zod** on both sides; **auth: bcrypt + jsonwebtoken in an HTTP-only cookie**
- **Icons: `lucide-react`** only
- **No new npm packages** beyond those installed in Step 00 unless the active spec lists them under "New dependencies"
- Node 22+, MongoDB 7+ (local or Atlas)
- **No AI / RAG features** — out of scope for this project

---

## Subagent Policy
- Always use a builtin explore subagent for codebase exploration
  before implementing any new feature
- Always use a subagent to verify test results
  after any implementation
- When asked to plan, delegate codebase research
  to a subagent before presenting the plan
- Always use a builtin plan subagent in plan mode

---

## Commands
```bash
# Setup (first time)
cd backend && npm install && cp .env.example .env && cd ..
cd frontend && npm install && cd ..

# Run API (port 8000) — terminal 1
cd backend && npm run dev

# Run web app (port 5173, proxies /api to 8000) — terminal 2
cd frontend && npm run dev

# Seed the demo user and sample content
cd backend && npm run seed

# Backend tests
cd backend && npm test                              # all
cd backend && npx vitest run tests/<file>.test.ts   # one file
cd backend && npx vitest run -t "test name"         # one test

# Frontend tests
cd frontend && npm test

# Type-check and lint
cd backend && npm run typecheck && npm run lint
cd frontend && npm run typecheck && npm run lint
```

Demo login after seeding: **username `demo` / password `demo1234`**

---

## Implemented vs stub routes

### API (`/api/...`)
| Endpoint | Status |
|---|---|
| `GET /api/health` | Implemented — returns `{ status: "ok" }` |
| `POST /api/auth/register` | Stub (501) — Step 02 |
| `POST /api/auth/login` | Stub (501) — Step 03 |
| `POST /api/auth/logout` | Stub (501) — Step 03 |
| `GET /api/auth/me` | Stub (501) — Step 03 |
| `GET /api/content` | Stub (501) — Step 05 (filters in Step 09) |
| `POST /api/content` | Stub (501) — Step 06 |
| `DELETE /api/content/:id` | Stub (501) — Step 07 |
| `GET /api/content/:id` | Stub (501) — Step 08 |
| `PATCH /api/content/:id` | Stub (501) — Step 08 (folder move in Step 11) |
| `GET /api/tags` | Stub (501) — Step 09 |
| `GET/POST /api/folders`, `DELETE /api/folders/:id` | Stub (501) — Step 10 |
| `GET/POST/DELETE /api/share`, `GET /api/share/:token` | Stub (501) — Step 12 |
| `GET/POST /api/received-shares`, `GET/DELETE /api/received-shares/:id` | Stub (501) — Step 13 |
| `PATCH /api/account/password`, `DELETE /api/account` | Stub (501) — Step 15 |

### Frontend pages
| Path | Status |
|---|---|
| `/` | Implemented — `LandingPage` |
| `/register` | UI only (form not wired) — Step 02 |
| `/login` | UI only (form not wired) — Step 03 |
| `/dashboard` | Stub ("Coming soon") — Step 04 |
| `/dashboard/folders/:folderId` | Not created — Step 10 |
| `/shared/:token` | Stub ("Coming soon") — Step 12 |
| `/shared-with-me` | Stub ("Coming soon") — Step 13 |
| `/shared-with-me/:id` | Not created — Step 13 |
| `/settings` | Not created — Step 15 |

**Do not implement a stub unless the active task explicitly targets that step.**
`/ship-feature` updates these tables when a step is merged.

---

## Warnings and things to avoid

- **Never put Mongoose queries in controllers or routes** — they belong in `services/`
- **Never trust `req.body` directly** — every write endpoint goes through a zod validator
- **Always scope queries by `userId`** — `Content.findOne({ _id: id, userId })`, never `findById(id)` for owned data
- **Return 404, not 403, for another user's resource** — don't reveal that it exists
- **Never return `passwordHash`** — it is `select: false` on the model; DTOs never include it
- **Never store tokens in localStorage** — the session lives in the HTTP-only `accessToken` cookie
- **Never hardcode URLs** in the frontend — use `paths.ts` builders and the `/api` base in `apiClient.ts`
- **Never hardcode hex colours** in components or page CSS — only `var(--…)` tokens from `tokens.css`
- **Never install packages mid-feature** without the spec listing them — keep `package.json` honest
- **Never commit `.env`** — only `.env.example`
- **Mongoose helpers don't exist until their step** — don't assume a model or service exists before the step that creates it
- The API runs on **port 8000** and the web app on **5173** — don't change these

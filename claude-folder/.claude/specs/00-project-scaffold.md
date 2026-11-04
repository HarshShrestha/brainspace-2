# Spec: Project Scaffold

## Overview
Create the BrainSpace starter project: two independent TypeScript packages
(`backend/` and `frontend/`) laid out exactly as `docs/02_SYSTEM_ARCHITECTURE.md`
describes, with tooling, a working health endpoint, a landing page, static (unwired)
register and login pages, and **stubs** for every later feature. After this step the
app runs, every future endpoint answers `501 Not Implemented`, and every future page
shows "Coming soon". This is the equivalent of Spendly's starter commit: later steps
only ever *replace stubs*, never invent structure.

## Depends on
Nothing — this is the first step. The repo contains only `CLAUDE.md`, `.claude/` and
`docs/02_SYSTEM_ARCHITECTURE.md`.

## API endpoints
- `GET /api/health` — returns `200 { success: true, data: { status: "ok" } }` — public
- Every endpoint in the CLAUDE.md API table is registered and returns
  `501 { success: false, message: "Not implemented yet" }` via a shared
  `notImplemented` handler in `backend/src/controllers/notImplemented.controller.ts`
- Unknown routes return `404 { success: false, message: "Route not found" }`

## Frontend routes
- `/` — `LandingPage` (hero: headline "Make room for ideas.", one-line pitch,
  "Get started" → `/register`, "Sign in" → `/login`; footer with © line) — public
- `/register` — `RegisterPage`, static form: Username, Password, Confirm password,
  "Create account" button (submit does nothing yet), link to `/login` — public
- `/login` — `LoginPage`, static form: Username, Password, "Sign in", link to `/register` — public
- `/dashboard`, `/shared/:token`, `/shared-with-me` — `ComingSoonPage` — public for now
- `*` — `NotFoundPage`

## Database changes
No database changes. MongoDB is not connected yet (Step 01).

## Components and pages
- **Create (frontend):**
  - `src/components/ui/Button.tsx` (variants: primary, secondary, ghost, danger; `loading` prop)
  - `src/components/forms/TextField.tsx` (label, hint, error, `useId` wiring, `aria-invalid`)
  - `src/components/common/Logo.tsx` ("brainspace" + accent dot, `Brain` lucide icon)
  - `src/layouts/PublicLayout.tsx`, `src/layouts/AuthLayout.tsx` (split hero + form panel)
  - `src/pages/LandingPage.tsx`, `RegisterPage.tsx`, `LoginPage.tsx`, `ComingSoonPage.tsx`, `NotFoundPage.tsx`
  - `src/routes/router.tsx` (createBrowserRouter), `src/routes/paths.ts` (path builders)
  - `src/services/apiClient.ts` — `apiClient.get/post/patch/delete`, `credentials: "include"`,
    base `"/api"`, unwraps `{ success, data }`, throws `ApiError(message, status)`
  - `src/styles/tokens.css` (all design tokens, light + `:root[data-theme="dark"]`),
    `src/styles/base.css`, `src/styles/components.css`, `src/styles/landing.css`, `src/styles/auth.css`,
    `src/styles/index.css` (imports all of them in order)
  - `src/App.tsx` (RecoilRoot + RouterProvider), `src/main.tsx`
- **Create (backend):** see Files to create

## Files to change
None (new project).

## Files to create
Root:
- `.gitignore` (node_modules, dist, coverage, .env, .env.*, !.env.example, .claude/plans/)
- `.prettierrc.json` (`{ "printWidth": 120, "trailingComma": "all" }`), `.editorconfig`
- `README.md` — one paragraph + the commands from CLAUDE.md

Backend (`backend/`):
- `package.json` — scripts: `dev` (`tsx watch --env-file-if-exists=.env src/server.ts`),
  `build` (`tsc -p tsconfig.build.json`), `start` (`node dist/server.js`), `test` (`vitest run`),
  `typecheck` (`tsc --noEmit`), `lint` (`eslint .`), `seed` (`tsx --env-file=.env src/db/seed.ts` — script file created in Step 01)
- `tsconfig.json` (strict, `noUncheckedIndexedAccess`, NodeNext), `tsconfig.build.json`, `eslint.config.js`, `vitest.config.ts`
- `.env.example` — `PORT=8000`, `MONGODB_URI=mongodb://127.0.0.1:27017/brainspace`,
  `JWT_SECRET=replace-with-at-least-32-random-characters`, `CORS_ORIGIN=http://localhost:5173`, `NODE_ENV=development`
- `src/app.ts` — `createApp()`: `helmet()`, `cors({ origin: CORS_ORIGIN, credentials: true })`,
  `express.json({ limit: "100kb" })`, `cookieParser()`, mounts `routes/index.ts` at `/api`, 404 + error middleware
- `src/server.ts` — `createApp().listen(PORT)`; handles SIGTERM/SIGINT by closing the server
- `src/routes/index.ts` + `auth.routes.ts`, `content.routes.ts`, `tag.routes.ts`, `folder.routes.ts`,
  `share.routes.ts`, `received-share.routes.ts`, `account.routes.ts`, `health.routes.ts` — each exports a
  `createXRouter()` factory; every endpoint except health is wired to `notImplemented`
- `src/controllers/health.controller.ts`, `src/controllers/notImplemented.controller.ts`
- `src/middleware/error.middleware.ts` — `notFoundHandler` + `errorHandler`
  (maps `ApiError` → its status, `ZodError` → 400 with joined messages, malformed JSON → 400,
  everything else → 500 "Something went wrong" without leaking details)
- `src/utils/ApiError.ts`, `src/utils/ApiResponse.ts` (`sendSuccess(res, data, status?)`),
  `src/utils/asyncHandler.ts`
- `src/types/api.types.ts` (empty DTO module with a header comment), `src/types/express.d.ts` (`req.userId?: string`)
- `tests/health.test.ts` — health 200, stub 501, unknown 404

Frontend (`frontend/`):
- `package.json` — scripts `dev`, `build` (`tsc --noEmit && vite build`), `test` (`vitest run`), `typecheck`, `lint`
- `vite.config.ts` — React plugin, `@` → `src` alias, dev proxy `/api` → `http://localhost:8000`, port 5173
- `vitest.config.ts` (jsdom, `tests/setup.ts`), `tsconfig.json`, `eslint.config.js` (incl. react-hooks plugin), `index.html`
- `tests/setup.ts` (jest-dom matchers + cleanup)
- all files listed under Components and pages
- `src/pages/LandingPage.test.tsx` — renders headline and both CTAs linking to `/register` and `/login`

Empty feature folders are **not** created now — each step creates the folders it needs.

## New dependencies
This step defines the complete allowed dependency set for the project.

Backend `dependencies`: `express@^5`, `mongoose@^9`, `zod@^4`, `bcrypt@^6`, `jsonwebtoken@^9`,
`cookie-parser`, `cors`, `helmet`, `express-rate-limit`
Backend `devDependencies`: `typescript@~5.9`, `tsx`, `vitest`, `supertest`, `mongodb-memory-server`,
`@types/express`, `@types/node@^22`, `@types/bcrypt`, `@types/jsonwebtoken`, `@types/cookie-parser`,
`@types/cors`, `@types/supertest`, `eslint`, `@eslint/js`, `typescript-eslint`, `globals`, `prettier`

Frontend `dependencies`: `react@18.3.1`, `react-dom@18.3.1`, `recoil@0.7.7`, `react-router@^7`, `zod@^4`, `lucide-react`
Frontend `devDependencies`: `vite@^7`, `@vitejs/plugin-react`, `typescript@~5.9`, `@types/react@^18`,
`@types/react-dom@^18`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`,
`@testing-library/jest-dom`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals`, `prettier`

(React is pinned to 18 because Recoil 0.7.7 is not verified on React 19.)

## Rules for implementation
- Follow `docs/02_SYSTEM_ARCHITECTURE.md` exactly — if something must differ, update that doc in the same change
- No feature logic: every non-health endpoint returns 501; every future page is `ComingSoonPage`
- Register/Login forms are presentational only — no submit handlers that call the API
- `apiClient.ts` is the only file that calls `fetch`
- All colours, spacing, radii and shadows defined once in `tokens.css`; components use `var(--…)` only
- No inline styles; class-based CSS
- Accessible from day one: labelled inputs, visible focus ring, `lang="en"`, skip link on layouts with nav
- Responsive: no horizontal scroll at 360px; auth layout hides the hero panel under 900px
- TypeScript strict; `npm run typecheck` and `npm run lint` pass in both packages

## Tests to write
Backend — `backend/tests/health.test.ts`
| Request | Expected |
|---|---|
| `GET /api/health` | 200, `{ success: true, data: { status: "ok" } }` |
| `POST /api/auth/register` | 501, `success: false` |
| `GET /api/does-not-exist` | 404, `{ success: false, message: "Route not found" }` |
| `POST /api/auth/login` with malformed JSON | 400, `success: false` |

Frontend — `src/pages/LandingPage.test.tsx`
- Renders the "Make room for ideas." heading
- "Get started" links to `/register`, "Sign in" links to `/login`

## Definition of done
- [ ] `cd backend && npm run dev` starts the API on port 8000; `curl localhost:8000/api/health` returns `{"success":true,"data":{"status":"ok"}}`
- [ ] Any stubbed endpoint (e.g. `POST /api/content`) returns 501 with the JSON envelope
- [ ] `cd frontend && npm run dev` serves the landing page at http://localhost:5173
- [ ] `/register` and `/login` show styled, labelled forms (no functionality yet)
- [ ] `/dashboard`, `/shared/abc`, `/shared-with-me` show "Coming soon"; `/nope` shows the 404 page
- [ ] `curl localhost:5173/api/health` works through the Vite proxy
- [ ] `npm test`, `npm run typecheck` and `npm run lint` pass in both packages
- [ ] No hex colour appears outside `tokens.css`
- [ ] The folder layout matches `docs/02_SYSTEM_ARCHITECTURE.md`

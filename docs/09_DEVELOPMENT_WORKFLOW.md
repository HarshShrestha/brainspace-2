# 09 · Development Workflow

## 1. Setup

Prerequisites: Node.js 22.12+, npm 10+, Python 3.10+, and a MongoDB you can write to (local, Docker or Atlas).

```bash
git clone https://github.com/HarshShrestha/brainspace-2.git && cd brainspace-2
npm run install:all                      # backend, frontend and e2e dependencies
cp backend/.env.example backend/.env     # then set MONGODB_URI and JWT_SECRET
npm run dev:api                          # http://localhost:8000  (watch mode)
npm run dev:web                          # http://localhost:5173  (proxies /api → :8000)
```

To try the assistant locally without a Gemini key or any cost, run the API with the test stub:

```bash
cd backend && RAG_ENABLED=true GEMINI_API_KEY=stub PYTHONPATH="$PWD/../rag/tests/stubs" npm run dev
```

## 2. Everyday commands

| Task | Command (from the repository root) |
| --- | --- |
| Lint | `npm run lint` |
| Type-check (all packages) | `npm run typecheck` |
| Unit + integration tests | `npm test` |
| End-to-end tests | `npm run build && E2E_MONGODB_URI=mongodb://127.0.0.1:27017 npm run test:e2e` |
| Format | `npm run format --prefix backend` · `npm run format --prefix frontend` |
| Production build | `npm run build` |

## 3. Adding a feature (checklist)

Backend:
1. Add or extend the **model** (`models/`), including indexes.
2. Define request **validators** (`validators/feature.validator.ts`) and response **DTOs** (`types/api.types.ts`).
3. Implement the **service** (`services/feature.service.ts`): take `userId` first, scope every query, throw `ApiError`.
4. Add a thin **controller** and a **router factory**, then mount it in `routes/index.ts`.
5. Add **integration tests** for success, invalid input, another user's resource and failure modes.
6. Update [03_API_SPECIFICATION.md](03_API_SPECIFICATION.md) and [04_DATA_MODEL.md](04_DATA_MODEL.md).

Frontend:
1. Add types and a service in `features/<feature>/`.
2. Add validation schemas if there's a form.
3. Build components inside the feature, reusing `components/ui|forms|common`.
4. Compose them in a **page**; register the route in `routes/router.tsx` and its path in `routes/paths.ts`.
5. Add component tests (query by role and label) and, for a new journey, an e2e test.
6. If you added a directory or a cross-feature import, update [02_SYSTEM_ARCHITECTURE.md](02_SYSTEM_ARCHITECTURE.md).

New icons: add the name to `ICONS` in `frontend/scripts/build-icon-font.py`, run it, and commit the
regenerated font and `iconCodepoints.ts`.

New environment variables: add them to the Zod schema, `.env.example`, the table in
[07_DEPLOYMENT_AND_OPERATIONS.md](07_DEPLOYMENT_AND_OPERATIONS.md), and `docker-compose.yml` if relevant.

## 4. Conventions

- **TypeScript:** strict mode, `noUncheckedIndexedAccess`, no `any`, type-only imports, no unused code.
- **Style:** Prettier (120 columns) and ESLint, including the React Compiler rules (no ref writes during render, no synchronous `setState` in effects).
- **Errors:** throw `ApiError` with a code from `constants/errorCodes.ts`; never send raw error messages.
- **Logging:** use `logger`/`req.log`; never log request bodies, tokens, prompts or source text. `console` is a lint error in the backend.
- **Comments:** explain *why* (invariants, races, security), not *what*.
- **Dependencies:** prefer the platform and existing libraries. A new dependency needs a reason in the PR,
  a maintained upstream, and a clean `npm audit --omit=dev`.

## 5. Git workflow

- Branch from `main`; keep PRs focused, with one concern per commit.
- Commit messages: Conventional Commits (`feat(backend): …`, `fix(frontend): …`, `docs: …`, `test: …`, `build: …`, `ci: …`).
- Before opening a PR: `npm run lint && npm run typecheck && npm test`; run e2e for UI or flow changes.
- PRs describe the change, the risks, how it was tested, and any documentation updated.
- CI must be green before merging.

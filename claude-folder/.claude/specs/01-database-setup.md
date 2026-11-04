# Spec: Database Setup

## Overview
Connect the API to MongoDB and establish the data layer every later feature depends
on: a validated environment config, a connection helper, the `User`, `Tag` and
`Content` Mongoose models, an idempotent seed script with a demo user and sample
content, and shared test helpers that run against an isolated in-memory database.
No endpoints change — stubs stay stubs.

## Depends on
- Step 00 — Project scaffold

## API endpoints
No API changes. `GET /api/health` keeps working; the server now refuses to start
if configuration is invalid or MongoDB is unreachable.

## Frontend routes
No frontend route changes.

## Database changes

### `config/environment.ts`
A zod schema parses `process.env` once and exports a typed `env` object:
| Variable | Rule | Default |
|---|---|---|
| `NODE_ENV` | `development` \| `test` \| `production` | `development` |
| `PORT` | integer 1–65535 | `8000` |
| `MONGODB_URI` | non-empty string | — (required) |
| `JWT_SECRET` | string, ≥ 32 chars | — (required) |
| `CORS_ORIGIN` | exact origin URL | `http://localhost:5173` |
Export `loadEnvironment(source = process.env)` (pure, testable) and `env = loadEnvironment()`.
On failure, throw one error listing every invalid variable.

### A. `User` (`models/user.model.ts`)
| Field | Type | Constraints |
|---|---|---|
| username | String | required, unique, trim, lowercase, maxlength 30 |
| passwordHash | String | required, `select: false` |
| tokenVersion | Number | required, default 0, `select: false` |
| createdAt / updatedAt | Date | `timestamps: true` |

### B. `Tag` (`models/tag.model.ts`)
| Field | Type | Constraints |
|---|---|---|
| userId | ObjectId → User | required |
| title | String | required, trim, lowercase, maxlength 40 |
Compound unique index `{ userId: 1, title: 1 }` — tags are private per user.

### C. `Content` (`models/content.model.ts`)
| Field | Type | Constraints |
|---|---|---|
| userId | ObjectId → User | required |
| title | String | required, trim, maxlength 200 |
| link | String | required, maxlength 2048 |
| type | String | enum `CONTENT_TYPES` |
| tags | [ObjectId → Tag] | default [] |
| createdAt / updatedAt | Date | `timestamps: true` |
Index `{ userId: 1, createdAt: -1, _id: -1 }`.

### `constants/content.constants.ts`
`CONTENT_TYPES = ["article", "video", "audio", "image"] as const` and
`CONTENT_LIMITS = { titleMax: 200, linkMax: 2048, tagMax: 40, maxTags: 20 }`.

## Components and pages
No frontend changes.

## Files to change
- `backend/src/server.ts` — `await connectDatabase(env.MONGODB_URI)` before `listen`;
  on shutdown `await disconnectDatabase()`; exit with code 1 and a clear message if connection fails
- `backend/src/app.ts` — read `CORS_ORIGIN` from `env` instead of `process.env`
- `backend/src/controllers/health.controller.ts` — also return `database: "connected" | "disconnected"`
- `docs/02_SYSTEM_ARCHITECTURE.md` — confirm `config/`, `db/`, `models/`, `constants/` entries match

## Files to create
- `backend/src/config/environment.ts`
- `backend/src/db/connection.ts` — `connectDatabase(uri)`, `disconnectDatabase()`, `isDatabaseConnected()`
- `backend/src/db/seed.ts` — run with `npm run seed`
- `backend/src/models/user.model.ts`, `tag.model.ts`, `content.model.ts`
- `backend/src/constants/content.constants.ts`
- `backend/tests/setup/env.ts` — sets `NODE_ENV=test`, a dummy `MONGODB_URI`, a 32+ char `JWT_SECRET` (registered in `vitest.config.ts` `setupFiles`)
- `backend/tests/helpers/database.ts` — `startTestDatabase()` / `clearTestDatabase()` / `stopTestDatabase()`
  using `mongodb-memory-server`, or `TEST_MONGODB_URI` when set (random db name per file)
- `backend/tests/01-database-setup.test.ts`

## Seed data (`db/seed.ts`)
- If a user named `demo` exists → print "Seed skipped: demo user already exists" and exit 0
- Create user `demo` with password `demo1234` hashed with `bcrypt` (cost 12)
- Create tags and **8 content items** for the demo user:
  - at least one of each content type
  - realistic titles and https links (e.g. "Designing calm technology" → https://calmtech.com/)
  - 1–3 tags each from: design, productivity, javascript, research, music, inspiration
  - `createdAt` spread across the last 30 days
- Print the number of items created, then disconnect

## New dependencies
No new dependencies.

## Rules for implementation
- Only `config/environment.ts` reads `process.env` (tests may set it in `tests/setup`)
- Models contain schemas and indexes only — no business logic, no hashing hooks
- Seed must be idempotent: running it twice creates nothing the second time
- Seed uses the same `connectDatabase` helper and models as the app — no hardcoded URI
- Password hashing uses `bcrypt.hash(password, 12)`
- Never log `MONGODB_URI` or `JWT_SECRET`

## Tests to write
File: `backend/tests/01-database-setup.test.ts`
| Case | Expected |
|---|---|
| Create a user, then query with `.select("+passwordHash")` | hash present; default query has no `passwordHash` |
| Create two users with `Alice` and `alice` | second insert fails (duplicate key 11000) — usernames are case-insensitive |
| Same tag title for two different users | both succeed |
| Same tag title twice for one user | duplicate key error |
| Content with `type: "podcast"` | validation error |
| Content with a 201-char title | validation error |
| `loadEnvironment` with `JWT_SECRET` of 10 chars | throws mentioning `JWT_SECRET` |
| `GET /api/health` with DB connected | `data.database === "connected"` |

## Definition of done
- [ ] `npm run dev` with a valid `.env` logs that MongoDB connected and the API is listening on 8000
- [ ] Removing `JWT_SECRET` from `.env` makes startup fail with a message naming `JWT_SECRET`
- [ ] `npm run seed` creates the demo user and 8 items; running it again prints "Seed skipped"
- [ ] In MongoDB, the demo user's `passwordHash` is a bcrypt hash (starts with `$2b$`)
- [ ] `users`, `tags` and `contents` collections exist with the unique indexes listed above
- [ ] `GET /api/health` reports `database: "connected"`
- [ ] All stubbed endpoints still return 501
- [ ] `npm test` passes using the in-memory database helper

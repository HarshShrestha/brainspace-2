# Spec: Registration

## Overview
Let new visitors create a BrainSpace account. This step replaces the
`POST /api/auth/register` stub with a validated endpoint that hashes the password
and stores the user, and wires the static register form from Step 00 to it. On
success the user is sent to the login page with a success message (signing in
arrives in Step 03). This is the entry point for every authenticated feature.

## Depends on
- Step 00 — Project scaffold (register page UI, `apiClient`)
- Step 01 — Database setup (`User` model, test database helpers)

## API endpoints
- `POST /api/auth/register` — create an account — public
  - Body: `{ username: string, password: string }`
  - `201 { success: true, data: { id, username, createdAt } }`
  - `400` invalid input · `409` "That username is already taken"

## Frontend routes
- `/register` — `RegisterPage` now submits — public
- `/login` — shows a success notice when arriving from registration — public

## Database changes
No database changes. Uses the `User` model from Step 01.

## Components and pages
- **Create:** `frontend/src/features/authentication/components/RegisterForm.tsx` — the form,
  extracted from `RegisterPage`, with field errors, a server-error `Alert`, and a loading button
- **Create:** `frontend/src/components/common/Alert.tsx` — `tone: "error" | "success" | "info"`,
  `role="alert"` for errors, `role="status"` otherwise
- **Modify:** `RegisterPage.tsx` renders `RegisterForm`
- **Modify:** `LoginPage.tsx` shows `location.state.notice` in a success `Alert` if present

## Files to change
- `backend/src/routes/auth.routes.ts` — `POST /register` → `validate(registerSchema)` → `register` controller
- `backend/src/types/api.types.ts` — add `UserDto { id: string; username: string; createdAt: string }`
- `frontend/src/pages/RegisterPage.tsx`, `frontend/src/pages/LoginPage.tsx`
- `frontend/src/styles/components.css` — `.alert` styles (token colours only)

## Files to create
- `backend/src/validators/auth.validator.ts` — `registerSchema`:
  - `username`: trim, lowercase, `^[a-z0-9_]{3,30}$`, message "Username must be 3–30 letters, numbers or underscores"
  - `password`: min 8 ("Password must be at least 8 characters"), max 72 bytes ("Password is too long")
- `backend/src/middleware/validation.middleware.ts` — `validate({ body?, params?, query? })` parses with zod
  and stores the output on `req.validated`; `getValidated(req, schema)` returns it typed
- `backend/src/services/auth.service.ts` — `registerUser(username, password): Promise<UserDto>`
  (409 if taken — check first *and* catch duplicate-key 11000), `toUserDto(user)`
- `backend/src/controllers/auth.controller.ts` — `register` handler
- `backend/tests/02-registration.test.ts`
- `frontend/src/features/authentication/services/auth.service.ts` — `authService.register(credentials)`
- `frontend/src/features/authentication/types/auth.types.ts` — `User`, `Credentials`
- `frontend/src/features/authentication/validation/auth.validation.ts` — `registerFormSchema`
  (same username/password rules + `confirmPassword` must match: "Passwords don't match")
- `frontend/src/features/authentication/components/RegisterForm.tsx` (+ `RegisterForm.test.tsx`)
- `frontend/src/components/common/Alert.tsx`
- `frontend/src/utils/fieldErrors.ts` — flattens a `ZodError` into `{ field: firstMessage }`

## New dependencies
No new dependencies.

## Rules for implementation
- Mongoose queries live in `services/auth.service.ts` — never in the controller or route
- Validate with zod before touching the database; never use `req.body` directly in a query
- Hash with `bcrypt.hash(password, 12)`; never log or return the password or hash
- Response DTO contains only `id`, `username`, `createdAt`
- Username uniqueness is case-insensitive (the model lowercases)
- Frontend: client-side validation first; on success `navigate(paths.login(), { state: { notice: "Account created. Please sign in." } })`
- Frontend calls go through `authService` → `apiClient` — no `fetch` in components
- Use CSS variables — never hardcode hex values; no inline styles

## Tests to write
Backend — `backend/tests/02-registration.test.ts`
| Request | Expected |
|---|---|
| valid `{ username: "Alice", password: "correct horse" }` | 201, `data.username === "alice"`, no `password`/`passwordHash` in body |
| same username again (`ALICE`) | 409, "That username is already taken" |
| username `"a!"` | 400 |
| password `"short"` | 400 |
| password of 73 bytes | 400 |
| missing body | 400 |
| `{ username: { "$gt": "" }, password: "x".repeat(8) }` | 400 (operator injection rejected) |
| after success, DB user | `passwordHash` starts with `$2b$` and ≠ password |

Frontend — `RegisterForm.test.tsx`
- Shows field errors and does not call `authService.register` for invalid input
- Shows "Passwords don't match" when confirmation differs
- On success calls `authService.register` with lowercase username and navigates to `/login`
- Shows the server error message (e.g. 409) in an alert

## Definition of done
- [ ] Submitting the register form with valid data creates a user and lands on `/login` with "Account created. Please sign in."
- [ ] A taken username shows "That username is already taken" and stays on the form
- [ ] Invalid username/short password/mismatched confirmation show field errors without a request
- [ ] The stored password is a bcrypt hash (check in MongoDB)
- [ ] The API response never contains the password or hash
- [ ] `POST /api/auth/register` no longer returns 501

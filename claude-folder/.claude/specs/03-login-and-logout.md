# Spec: Login and Logout

## Overview
Implement authentication. `POST /api/auth/login` verifies credentials and issues a
signed JWT in an HTTP-only cookie; `GET /api/auth/me` returns the current user;
`POST /api/auth/logout` revokes every session of the user and clears the cookie. A
reusable `requireAuth` middleware protects later endpoints. On the frontend, the
app learns the session on load, the login form signs users in, `/dashboard` becomes
a protected route, and an account menu offers "Sign out". After this step the app
can tell signed-in users from guests — the prerequisite for all library features.

## Depends on
- Step 01 — Database setup (`User` with `tokenVersion`)
- Step 02 — Registration (accounts exist; `auth.service.ts`, `validate()`)

## API endpoints
- `POST /api/auth/login` — `{ username, password }` → `200 { data: UserDto }` + `Set-Cookie: accessToken` — public
  - `401` "Incorrect username or password" (same message for unknown user and wrong password)
- `GET /api/auth/me` — `200 { data: UserDto }` — logged-in (401 "Please sign in" otherwise)
- `POST /api/auth/logout` — `204`; clears the cookie; if the token was valid, increments `tokenVersion` — public (works with an expired session)
- `POST /api/auth/register` — now also rate limited

## Frontend routes
- `/login` — wired `LoginForm`; on success navigate to `location.state.from` or `/dashboard` — public, redirects to `/dashboard` if already signed in
- `/register` — redirects to `/dashboard` if already signed in
- `/dashboard` — still `ComingSoonPage` content, but inside `AppLayout` and behind `RequireAuth` — logged-in

## Database changes
No database changes. Uses `User.tokenVersion` from Step 01.

## Components and pages
- **Create:** `features/authentication/components/LoginForm.tsx` (+ test)
- **Create:** `features/authentication/hooks/useSessionBootstrap.ts` — on app start calls `authService.me()`;
  sets `sessionState` to `authenticated` or `anonymous`; registers the `apiClient` 401 handler
- **Create:** `features/authentication/hooks/useAuthActions.ts` — `login`, `logout` (update `sessionState`)
- **Create:** `store/session.atoms.ts` — `sessionState: { status: "loading" | "authenticated" | "anonymous"; user: User | null }`
- **Create:** `routes/RequireAuth.tsx` — `RequireAuth` (loading spinner → redirect to `/login` with `state.from`) and `RedirectIfAuthenticated`
- **Create:** `layouts/AppLayout.tsx` — top bar with `Logo` and `components/layout/UserMenu.tsx`
  (avatar initial button → menu with username and "Sign out"); `<Outlet />` for the page
- **Create:** `components/common/LoadingState.tsx`
- **Modify:** `routes/router.tsx` — guards and AppLayout wiring; `LoginPage.tsx` renders `LoginForm`

## Files to change
- `backend/src/routes/auth.routes.ts` — login, logout, me; rate limiters
- `backend/src/services/auth.service.ts` — `loginUser`, `issueSessionToken`, `resolveSession`, `revokeAllSessions`, `getUserById`
- `backend/src/controllers/auth.controller.ts` — `login`, `logout`, `me`
- `backend/src/validators/auth.validator.ts` — `loginSchema` (username normalised; password any non-empty string ≤ 1024)
- `frontend/src/services/apiClient.ts` — `setUnauthorizedHandler(fn)`; call it on 401 except for `/auth/login` and `/auth/register`
- `frontend/src/features/authentication/services/auth.service.ts` — `login`, `logout`, `me`
- `frontend/src/App.tsx` — call `useSessionBootstrap()`
- `frontend/src/routes/router.tsx`, `frontend/src/pages/LoginPage.tsx`

## Files to create
- `backend/src/middleware/auth.middleware.ts` — `requireAuth` (reads `req.cookies.accessToken`, verifies, sets `req.userId`) and `authUserId(req)`
- `backend/src/config/session.ts` — cookie name `accessToken`; options `httpOnly: true`, `sameSite: "lax"`, `secure: NODE_ENV === "production"`, `path: "/"`, `maxAge` 7 days
- `backend/src/middleware/rateLimit.middleware.ts` — `createLoginLimiter()` (20 failed attempts / 15 min / IP, `skipSuccessfulRequests`), `createRegisterLimiter()` (10 / 15 min / IP); created inside the router factory so each app instance gets fresh counters
- `backend/tests/03-login-and-logout.test.ts`
- frontend files listed under Components and pages

## New dependencies
No new dependencies (`jsonwebtoken`, `cookie-parser`, `express-rate-limit` were installed in Step 00).

## Rules for implementation
- JWT payload `{ sub: userId, ver: tokenVersion }`, `HS256`, `expiresIn: "7d"`, secret from `env.JWT_SECRET`; verify with `algorithms: ["HS256"]`
- A token is valid only if the user exists **and** `user.tokenVersion === payload.ver`
- For an unknown username, still run `bcrypt.compare` against a dummy hash (equal timing) and return the same 401 message
- Never put the token in a JSON response or in `localStorage`
- Logout must succeed (204) even with no or an invalid cookie, and always clears the cookie
- `requireAuth` responds 401 `{ success: false, message }` — "Please sign in" (no token) or "Your session has expired. Please sign in again."
- Mongoose queries stay in `auth.service.ts`
- Frontend: never read the cookie in JS; session state comes only from `/auth/me` and login responses
- After logout or any 401 from a protected call, `sessionState` becomes `anonymous` and the user is sent to `/login`
- Use CSS variables only; the user menu closes on outside click and Escape

## Tests to write
Backend — `backend/tests/03-login-and-logout.test.ts`
| Case | Expected |
|---|---|
| login with valid credentials | 200, `UserDto`, `Set-Cookie` contains `accessToken`, `HttpOnly`, `SameSite=Lax` |
| wrong password vs unknown user | both 401 with the identical message |
| `GET /me` with the agent's cookie | 200, correct username |
| `GET /me` without a cookie | 401 |
| `GET /me` with a tampered token | 401 |
| logout, then `GET /me` with a **copy of the old token** | 401 (revoked via `tokenVersion`) |
| two sessions; logout from one | the other session also gets 401 |
| logout with no cookie | 204 |
| 21 failed logins from one IP | the 21st returns 429 |

Frontend
- `LoginForm.test.tsx`: calls `authService.login` with normalised username; shows the server error; navigates on success
- `RequireAuth.test.tsx`: anonymous → redirected to `/login` with `state.from`; authenticated → renders child; loading → spinner

## Definition of done
- [ ] Signing in as `demo` / `demo1234` lands on `/dashboard` inside the app layout
- [ ] A wrong password shows "Incorrect username or password" and stays on `/login`
- [ ] Refreshing `/dashboard` keeps you signed in (session restored from `/auth/me`)
- [ ] Visiting `/dashboard` signed out redirects to `/login`, and after login returns to `/dashboard`
- [ ] Visiting `/login` while signed in redirects to `/dashboard`
- [ ] "Sign out" in the account menu returns to `/login`; the back button doesn't reveal the dashboard
- [ ] The `accessToken` cookie is HttpOnly (not visible to `document.cookie`)
- [ ] Logging out in one browser signs out the session in another browser on its next request

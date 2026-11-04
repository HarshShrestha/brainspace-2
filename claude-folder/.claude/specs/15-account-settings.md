# Spec: Account Settings

## Overview
Add a Settings page where users can change their password and permanently delete
their account. Changing the password requires the current one and signs out every
other device while keeping the current one signed in. Deleting the account requires
the password and typing the username, and removes everything the user owns —
content, tags, folders, share link and saved shared spaces.

## Depends on
- Step 03 — Login and Logout (`tokenVersion`, `issueSessionToken`, session cookie)
- Steps 06, 10, 12, 13 — all user-owned collections exist

## API endpoints
- `PATCH /api/account/password` — `{ currentPassword, newPassword }` — logged-in
  - `204` + a fresh `accessToken` cookie; all other sessions revoked
  - `400` invalid new password · `401` "Your current password is incorrect"
- `DELETE /api/account` — `{ password }` — logged-in
  - `204`, cookie cleared, account and all owned data deleted
  - `401` wrong password
- Both rate limited: 10 requests / 15 min / IP

## Frontend routes
- `/settings` — `SettingsPage` (inside `AppLayout`) — logged-in; linked from the user menu

## Database changes
No database changes.

## Components and pages
- **Create:** `features/settings/services/account.service.ts` — `changePassword`, `deleteAccount`
- **Create:** `features/settings/validation/settings.validation.ts` — current required; new password rules from
  registration (reuse `newPasswordSchema`); confirmation must match; new ≠ current
- **Create:** `features/settings/components/ChangePasswordForm.tsx` — 3 password fields; success
  "Password changed. You've been signed out on your other devices."
- **Create:** `features/settings/components/DeleteAccountForm.tsx` — danger panel; "Type “<username>” to confirm" +
  password; button disabled until both match; on success clear client state and go to `/login`
- **Create:** `pages/SettingsPage.tsx` — "Signed in as <username> · member since <date>", both forms
- **Modify:** `UserMenu.tsx` — "Settings" link; `routes/router.tsx`, `routes/paths.ts`
- **Modify:** `useAuthActions.ts` — `signOutLocally()` resets session, folders and other account atoms

## Files to change
- `backend/src/routes/account.routes.ts` — replace the stubs (`requireAuth`, rate limiter, `validate()`)
- `backend/src/services/auth.service.ts` — export `verifyPassword(userId, password)`, `hashPassword()`
- `backend/src/validators/auth.validator.ts` — `changePasswordSchema`, `deleteAccountSchema`
- `frontend/src/services/apiClient.ts` — treat 401 from `/account/*` as "wrong password", not "session ended"
- frontend files listed above; `docs/02_SYSTEM_ARCHITECTURE.md` (add `features/settings`)

## Files to create
- `backend/src/controllers/account.controller.ts`,
  `backend/src/services/account.service.ts` (`changePassword`, `deleteAccount`)
- `backend/tests/15-account-settings.test.ts`
- frontend files listed above (+ `ChangePasswordForm.test.tsx`)

## New dependencies
No new dependencies.

## Rules for implementation
- Change password: verify current with bcrypt → hash new → `tokenVersion += 1` → save → issue a new token for this device
- Delete order: `ShareLink` → `Content` → (`Tag`, `Folder`, `ReceivedShare`) → `User` — the public link dies first,
  the user record goes last so an interrupted delete can be retried
- Both operations require the password even though the user is signed in
- Never return or log passwords; the same rate limiter protects both endpoints
- Mongoose calls only in `account.service.ts`
- Use CSS variables only; the delete panel uses the danger token for its border and button

## Tests to write
Backend — `backend/tests/15-account-settings.test.ts`
| Case | Expected |
|---|---|
| change with wrong current password | 401; old password still works |
| change with valid data | 204; current agent still authorised; a second session gets 401; login with new password works, old fails |
| new password `"short"` | 400 |
| delete with wrong password | 401; nothing deleted |
| delete with correct password | 204; user, content, tags, folders, share link, received shares gone; cookie cleared |
| after delete, the user's old share token | 404 |
| signed out | 401 on both |

Frontend — `ChangePasswordForm.test.tsx`
- Mismatched confirmation shows "Passwords don't match" without a request
- Success shows the confirmation message and clears the fields; 401 shows "Your current password is incorrect"

## Definition of done
- [ ] The user menu has "Settings"; the page shows username and member-since date
- [ ] Changing the password keeps this browser signed in and signs out another browser
- [ ] The old password no longer works; the new one does
- [ ] "Delete my account" stays disabled until the username is typed exactly and a password is entered
- [ ] Deleting the account lands on `/login`; signing in again fails; the old share link shows "no longer shared"
- [ ] A wrong password on either form shows an error and changes nothing

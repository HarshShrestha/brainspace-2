---
description: Create a spec file and feature branch for the next BrainSpace step
argument-hint: "Step number and feature name e.g. 2 registration"
allowed-tools: Read, Write, Glob, Grep, Bash(git:*)
---

You are a senior full-stack developer spinning up a new feature for
BrainSpace. Always follow the rules in CLAUDE.md and
docs/02_SYSTEM_ARCHITECTURE.md.

User input: $ARGUMENTS

## Step 1 — Check working directory is clean
Run `git status` and check for uncommitted, unstaged, or
untracked files. If any exist, stop immediately and tell
the user to commit or stash changes before proceeding.
DO NOT CONTINUE until the working directory is clean.

## Step 2 — Parse the arguments
From $ARGUMENTS extract:

1. `step_number` — zero-padded to 2 digits: 2 → 02, 11 → 11

2. `feature_title` — human readable title in Title Case
   - Example: "Registration" or "Login and Logout"

3. `feature_slug` — git and file safe slug
   - Lowercase, kebab-case
   - Only a-z, 0-9 and -
   - Maximum 40 characters
   - Example: registration, login-and-logout

4. `branch_name` — format: `feature/<feature_slug>`
   - Example: `feature/registration`

If you cannot infer these from $ARGUMENTS, ask the user
to clarify before proceeding.

## Step 3 — Check branch name is not taken
Run `git branch` to list existing branches.
If `branch_name` is already taken, append a number:
`feature/registration-01`, `feature/registration-02` etc.

## Step 4 — Switch to main and pull latest
Run:
```
git checkout main
git pull origin main
```

## Step 5 — Create and switch to the feature branch
Run:
```
git checkout -b <branch_name>
```

## Step 6 — Research the codebase
Use an explore subagent to read, before writing anything:
- `CLAUDE.md` — conventions and the implemented-vs-stub tables
- `docs/02_SYSTEM_ARCHITECTURE.md` — folder responsibilities
- `backend/src/routes/` and `backend/src/models/` — existing endpoints and schemas
- `backend/src/services/` — existing business logic you can reuse
- `frontend/src/routes/router.tsx` and `frontend/src/pages/` — existing pages
- `frontend/src/features/` — existing feature modules
- All files in `.claude/specs/` — avoid duplicating existing specs

Check `CLAUDE.md` to confirm the requested step is not already
marked Implemented. If it is, warn the user and stop.

## Step 7 — Write (or refresh) the spec
If `.claude/specs/<step_number>-*.md` already exists for this step,
do NOT write a new one. Instead re-check it against the current
codebase (file paths, function names, models created by earlier
steps) and fix anything that is out of date. Then go to Step 9.

Otherwise generate a spec document with this exact structure:

---
# Spec: <feature_title>

## Overview
One paragraph describing what this feature does and why
it exists at this stage of the BrainSpace roadmap.

## Depends on
Which previous steps this feature requires to be complete.

## API endpoints
Every new or changed endpoint:
- `METHOD /api/path` — description — access level (public/logged-in)
- Request body / query shape and response `data` shape

If none: state "No API changes".

## Frontend routes
Every new or changed page:
- `/path` — page component — access level (public/logged-in)

If none: state "No frontend route changes".

## Database changes
New Mongoose models, fields, indexes or constraints.
Always verify against `backend/src/models/` before writing this.
If none: state "No database changes".

## Components and pages
- **Create:** new components/pages/hooks with their path
- **Modify:** existing ones and what changes

## Files to change
Every file that will be modified (backend and frontend).

## Files to create
Every new file that will be created (backend and frontend).

## New dependencies
Any new npm packages and which package.json. If none: state "No new dependencies".

## Rules for implementation
Specific constraints Claude must follow. Always include:
- Mongoose queries live in `services/` only — never in controllers or routes
- Every request body/params/query validated with a zod schema in `validators/`
- Every query on user-owned data is scoped by `userId`; other users' data returns 404
- Responses use `{ success, data }` / `{ success: false, message }`
- Frontend API calls go through `features/<f>/services` → `apiClient` — never raw `fetch` in components
- Use CSS variables from `styles/tokens.css` — never hardcode hex values
- No inline styles; page styles go in `styles/<page>.css`

## Tests to write
Backend: file name, and a table of service/route cases (happy path,
validation errors, auth guard, ownership, DB side effects).
Frontend: component tests for any new form or interactive component.

## Definition of done
A specific testable checklist. Each item must be
something that can be verified by running the app.
---

## Step 8 — Save the spec
Save to: `.claude/specs/<step_number>-<feature_slug>.md`

## Step 9 — Report to the user
Print a short summary in this exact format:
```
Branch:    <branch_name>
Spec file: .claude/specs/<step_number>-<feature_slug>.md
Title:     <feature_title>
```

Then tell the user:
"Review the spec at `.claude/specs/<step_number>-<feature_slug>.md`
then enter Plan Mode with Shift+Tab twice to begin implementation."

Do not print the full spec in chat unless explicitly asked.

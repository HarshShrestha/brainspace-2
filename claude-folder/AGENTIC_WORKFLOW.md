# BrainSpace — Agentic Coding Kit (Spendly-style)

This kit lets you build **BrainSpace** (a personal link library with tags, folders, search and
read-only sharing, no AI/RAG) with Claude Code, using the **same agentic workflow as
[campusx-official/spendly](https://github.com/campusx-official/spendly)**, on the BrainSpace stack:

| Layer | Technology |
|---|---|
| Frontend | React 18 · TypeScript · Vite · Recoil · react-router · zod · lucide-react |
| Backend | Node 22 · Express 5 · TypeScript · Mongoose (MongoDB) · zod · bcrypt · JWT cookie |
| Tests | Vitest · Supertest · mongodb-memory-server · Testing Library |

---

## What's in the kit

```
brainspace/                         ← copy everything into an empty git repo
├── AGENTIC_WORKFLOW.md             This guide
├── CLAUDE.md                       Project rulebook Claude reads every session
├── PROMPTS.md                      One-off prompts (bootstrap + landing warm-ups), like Spendly's file.txt
├── docs/02_SYSTEM_ARCHITECTURE.md  Where every kind of code lives (Step 00 builds to match it)
└── .claude/
    ├── settings.json               Hooks: auto-format after edits, block destructive commands
    ├── hooks/                      format-on-write.mjs · block-destructive.mjs
    ├── launch.json                 Dev servers: API :8000, web :5173
    ├── commands/                   Slash commands
    │   ├── create-spec.md          /create-spec 2 registration  → branch + spec
    │   ├── test-feature.md         /test-feature 02-registration → write + run tests (2 subagents)
    │   ├── code-review-feature.md  /code-review-feature 02-registration → parallel security + quality review
    │   ├── ship-feature.md         /ship-feature → quality gate, update CLAUDE.md, commit, PR, merge, clean up
    │   ├── seed-user.md            /seed-user
    │   └── seed-content.md         /seed-content demo 40 6
    ├── agents/                     Subagents used by the commands
    │   ├── brainspace-test-writer.md
    │   ├── brainspace-test-runner.md
    │   ├── brainspace-security-reviewer.md
    │   └── brainspace-quality-reviewer.md
    ├── skills/frontend-design/SKILL.md   brainspace-ui-designer skill
    └── specs/                      The roadmap — one spec per step
        ├── 00-project-scaffold.md
        ├── 01-database-setup.md
        ├── 02-registration.md
        ├── 03-login-and-logout.md
        ├── 04-dashboard-ui.md           (static UI with sample data, like Spendly's profile page step)
        ├── 05-content-list.md           (wire the UI to real data, like Spendly's backend-connection step)
        ├── 06-add-content.md
        ├── 07-delete-content.md
        ├── 08-edit-content.md
        ├── 09-search-and-filter.md
        ├── 10-folders.md
        ├── 11-move-content-to-folder.md
        ├── 12-share-link.md
        ├── 13-shared-with-me.md
        ├── 14-dark-mode-and-polish.md
        └── 15-account-settings.md
```

### Spendly → BrainSpace mapping

| Spendly | BrainSpace | Difference |
|---|---|---|
| `CLAUDE.md` | `CLAUDE.md` | Same sections; two packages; API + page stub tables |
| starter repo with stubs | `specs/00-project-scaffold.md` | You start empty, so Step 00 builds the stubbed starter |
| `file.txt` | `PROMPTS.md` | Same idea, plus the bootstrap prompt |
| `/create-spec` | `/create-spec` | Spec template adds *API endpoints*, *Frontend routes*, *Tests to write*; reuses pre-written specs |
| `/test-feature` | `/test-feature` | Vitest instead of pytest |
| `/code-review-feature` | `/code-review-feature` | Reviewers know the layered Express/React architecture |
| `/ship-feature` | `/ship-feature` | Adds a quality gate (typecheck/lint/tests/build) and updates CLAUDE.md status tables |
| `/seed-user`, `/seed-expense` | `/seed-user`, `/seed-content` | Mongoose instead of SQLite |
| 4 subagents | 4 subagents | Same roles, MongoDB/Express/React checklists |
| `frontend-design` skill | `frontend-design` skill | React + CSS tokens + lucide-react instead of Jinja + vanilla JS |
| `settings.json` hooks (python) | `settings.json` + `hooks/*.mjs` | Prettier instead of black; blocks `.env`/`dropDatabase`/force-push |

---

## One-time setup

1. **Prerequisites:** Node 22+, a MongoDB you can write to (local `mongod`, Docker
   `docker run -p 27017:27017 mongo:7`, or a free Atlas cluster), Claude Code, a GitHub repo.
2. Create an empty GitHub repo, clone it, and copy this kit's contents into the root.
3. Connect the **GitHub MCP server** in Claude Code (`/mcp`); `/ship-feature` uses it to open and merge PRs.
4. Commit the kit on `main`:
   ```bash
   git add . && git commit -m "chore: add agentic workflow kit" && git push -u origin main
   ```
5. Open Claude Code in the repo root (it reads `CLAUDE.md` automatically).

---

## The loop: run it once per step, 00 → 15

```
/create-spec <N> <feature name>      e.g. /create-spec 2 registration
        │   creates feature/<slug>, checks the spec in .claude/specs/ against the codebase
        ▼
Review the spec file (edit it if you want different behaviour; it's the contract)
        ▼
Shift+Tab twice → Plan Mode
"Implement .claude/specs/02-registration.md"
        │   Claude explores with a subagent, proposes a plan, you approve, it implements
        ▼
Try it yourself: cd backend && npm run dev · cd frontend && npm run dev
        ▼
/test-feature 02-registration
        │   brainspace-test-writer writes tests FROM THE SPEC → brainspace-test-runner runs them
        │   fix any failures: "Fix the failures classified as bugs in the report"
        ▼
/code-review-feature 02-registration
        │   security + quality reviewers run in parallel → unified action plan
        │   say "yes" to apply fixes, then re-run /test-feature
        ▼
/ship-feature
            quality gate → update CLAUDE.md tables → commit → push → PR → squash merge → back on main
```

Notes:
- **Step 00** is special: follow section 0 of `PROMPTS.md`. After it ships, do the landing warm-ups
  (section 1) to get used to small, direct prompts.
- **Steps 04 and 14** are UI-heavy; add "Use the brainspace-ui-designer skill" to your prompt.
- Run `npm run seed` in `backend/` after Step 01 (and again after Step 10 on a fresh database).
  Demo login: **demo / demo1234**.
- Never skip ahead: CLAUDE.md says *"Do not implement a stub unless the active task explicitly targets that step."*
- Want to change a feature? Edit the spec **before** implementing; the tests are written from it.

### Step roadmap

| # | Step | You can now… |
|---|---|---|
| 00 | Project scaffold | run both apps; see landing/register/login UI; every API answers 501 |
| 01 | Database setup | connect MongoDB, seed a demo user with 8 items |
| 02 | Registration | create an account |
| 03 | Login and logout | sign in/out; protected dashboard; account menu |
| 04 | Dashboard UI | see the full library layout with sample cards |
| 05 | Content list | see your real items, paginated |
| 06 | Add content | save links with tags from a dialog |
| 07 | Delete content | delete items with confirmation |
| 08 | Edit content | edit items in place |
| 09 | Search and filter | search title/link/tags, filter by type and tag (URL-driven) |
| 10 | Folders | create/delete folders, folder pages with counts |
| 11 | Move content to folder | file items into folders |
| 12 | Share link | share a read-only public link; rotate or revoke it |
| 13 | Shared with me | save links others shared with you |
| 14 | Dark mode and polish | theme toggle, accessibility and mobile pass |
| 15 | Account settings | change password, delete account |

---

## Tips that make this work well

- **Small steps win.** Each spec fits in one Plan Mode session. If Claude's plan touches
  files the spec doesn't list, ask why before approving.
- **Specs are the source of truth** for tests, so the tests catch implementations that drift from the spec.
- **Read the review reports.** They're written to teach, not just to gate.
- **Keep `CLAUDE.md` current.** `/ship-feature` flips each stub to "Implemented"; that's what stops
  Claude from building future steps early.
- **The hooks guard you**: every edited `.ts/.tsx/.css/.json` is formatted, and commands that would
  delete `.env`, drop the database or force-push are blocked.

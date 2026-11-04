---
description: Verify, commit, push, create PR, merge, and clean up after a feature is complete
allowed-tools: Read, Edit, Bash, mcp__github__create_pull_request, mcp__github__merge_pull_request, mcp__github__delete_branch
---

## Step 1 — Identify current branch
```bash
git branch --show-current
```
Store this as CURRENT_BRANCH. If it is `main`, stop and say:
"You are on main. Run /create-spec to start a feature branch first."

## Step 2 — Quality gate
Run all of these. If any fails, stop and report the failure —
do not commit:
```bash
cd backend && npm run typecheck && npm run lint && npm test
cd frontend && npm run typecheck && npm run lint && npm test && npm run build
```
Report: "✓ Quality gate passed"

## Step 3 — Update CLAUDE.md
Read `.claude/specs/` to find the spec for the current feature.
In `CLAUDE.md`, update the "Implemented vs stub routes" tables:
every endpoint and page this spec delivered changes from
"Stub — Step NN" to "Implemented — <one-line description>".
If the spec created or moved a directory, confirm
`docs/02_SYSTEM_ARCHITECTURE.md` was updated; if not, stop and say so.

## Step 4 — Generate commit message
Run:
```bash
git diff --staged
git diff
git log main..HEAD --oneline
```

Generate a Conventional Commit message:
- feat: new feature
- fix: bug fix
- chore: config or tooling
- docs: documentation only
- test: tests only

Rules:
- Lowercase
- No period at the end
- Under 72 characters
- Describes what the user can now do, not what the code does

Good: "feat: let users save links with tags to their library"
Bad: "feat: added POST route to content.routes.ts"

## Step 5 — Commit
```bash
git add .
git commit -m "<generated-message>"
```
Report: "✓ Committed — <message>"

## Step 6 — Push to feature branch
```bash
git push -u origin CURRENT_BRANCH
```
Report: "✓ Pushed — CURRENT_BRANCH"

## Step 7 — Create PR via GitHub MCP
Use the GitHub MCP server to create a pull request
from CURRENT_BRANCH into main.

Title: plain English feature name, no conventional commit prefix
Example: "Add save-link form to the library"

Description:
```markdown
## What this PR does
<one paragraph from the spec overview section>

## Changes
<bullet list of every file changed with one line description each>

## Definition of done
<copy the definition of done checklist from the spec,
mark every item as checked [x]>

## How to test
1. `cd backend && npm run seed && npm run dev`
2. `cd frontend && npm run dev` and open http://localhost:5173
3. Log in as demo / demo1234
4. <specific steps from the spec to verify this feature works>
```

Report: "✓ PR created — <PR URL>"

## Step 8 — Merge PR via GitHub MCP
Use the GitHub MCP server to merge the pull request
just created. Use squash merge.

Report: "✓ PR merged to main"

## Step 9 — Delete remote branch via GitHub MCP
Use the GitHub MCP server to delete CURRENT_BRANCH
from GitHub after the merge.

Report: "✓ Remote branch deleted"

## Step 10 — Switch to main and pull
```bash
git checkout main
git pull origin main
```
Report: "✓ Switched to main — up to date"

## Step 11 — Delete local feature branch
```bash
git branch -D CURRENT_BRANCH
```
Report: "✓ Local branch deleted"

## Final summary
Print:
```
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
/ship-feature complete
✓ Quality gate passed
✓ CLAUDE.md status tables updated
✓ Committed — <message>
✓ Pushed — <branch>
✓ PR created and merged
✓ Remote branch deleted
✓ Switched to main
✓ Local branch deleted
Next: run /create-spec for the next feature
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
```

## Rules
- Never commit directly to main
- Never commit if the quality gate fails
- Never commit `.env` — only `.env.example`
- Always use squash merge
- Always delete both remote and local branch after merge
- If GitHub MCP is not connected stop and say:
  "GitHub MCP is not connected. Run /mcp to check connection."
- If push fails due to no upstream, use git push -u origin CURRENT_BRANCH
- Never proceed to merge if PR creation fails

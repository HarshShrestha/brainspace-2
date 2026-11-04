---
description: Seed realistic dummy content items for a specific user
argument-hint: "<username> <count> <months>"
allowed-tools: Read, Write, Bash(npx tsx:*), Bash(rm:*)
---

Read `backend/src/models/content.model.ts`,
`backend/src/models/tag.model.ts` (and
`backend/src/models/folder.model.ts` if it exists),
`backend/src/constants/content.constants.ts`, and
`backend/src/db/connection.ts` to understand the schema
and the connection pattern.

User input: $ARGUMENTS

## Step 1 — Parse arguments

Extract from $ARGUMENTS:
- username — string
- count — integer, number of content items to create
- months — integer, how many past months to spread them across

If any argument is missing or invalid, stop and say:
"Usage: /seed-content <username> <count> <months>
Example: /seed-content demo 40 6"

## Step 2 — Verify user exists

Before generating anything, confirm the user exists.
If not, stop and say:
"No user found with username <username>."

## Step 3 — Generate and insert content

Write a throwaway script at `backend/scripts/tmp-seed-content.ts`,
run it with `cd backend && npx tsx --env-file=.env scripts/tmp-seed-content.ts`,
then delete the script. It must:

1. Spread `createdAt` randomly across the past <months> months
2. Use only the content types in `CONTENT_TYPES`, roughly:
   - article: 45% — blog posts, docs, tutorials (realistic titles and https URLs)
   - video: 25% — talks and tutorials (youtube.com-style URLs)
   - audio: 15% — podcasts
   - image: 15% — design references
3. Give each item 1–3 lowercase tags from a realistic pool
   (e.g. design, javascript, productivity, ai, career, react,
   databases, writing, health, finance)
4. Create missing tags for the user the same way the content
   service does (per-user, lowercase, unique) — reuse the service
   function if one exists
5. If the user has folders, put ~30% of items into a random folder
6. Use the app's models and connection helper — never hardcode the URI
7. Insert everything in one `insertMany` call; if it fails,
   report the error and insert nothing else

## Step 4 — Confirm

Print:
- How many items were inserted
- The date range they span
- Counts per content type
- A sample of 5 inserted items (title, type, tags)

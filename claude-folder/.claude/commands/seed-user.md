---
description: Create a single dummy user in the BrainSpace database
allowed-tools: Read, Write, Bash(npx tsx:*), Bash(rm:*)
---

Read `backend/src/models/user.model.ts` to understand the
users schema, and `backend/src/db/connection.ts` +
`backend/src/config/environment.ts` to understand how the
app connects to MongoDB.

Then write a throwaway script at
`backend/scripts/tmp-seed-user.ts` and run it with
`cd backend && npx tsx --env-file=.env scripts/tmp-seed-user.ts`.
The script must:

1. Generate a realistic random Indian user using your
   own knowledge of common Indian names across regions:
   - username: lowercase first name + `_` + a random
     2–3 digit number (e.g. `rahul_91`), matching
     `^[a-z0-9_]{3,30}$`
   - password: `password123` hashed with `bcrypt`
     (same cost the app uses — read it from the auth service)

2. Check whether the username already exists. If it does,
   regenerate until unique.

3. Insert the user using the `User` model and the same
   connection helper the app uses — do not hardcode the
   MongoDB URI.

4. Disconnect cleanly, then print confirmation:
   - id
   - username
   - password (plaintext `password123`, for logging in)

5. Delete `backend/scripts/tmp-seed-user.ts` after it runs.

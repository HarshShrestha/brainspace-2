# PROMPTS.md — one-off prompts (paste them into Claude Code in this order)

These are the small, direct prompts used outside the spec loop, the same way Spendly's
`file.txt` was used. Paste one, review the result, then run the commit shown under it.

---

## 0. Bootstrap the starter project (Step 00)

Spendly began from a starter repo full of stub routes. BrainSpace starts empty, so the
first spec builds that starter. Make sure `CLAUDE.md`, `.claude/` and
`docs/02_SYSTEM_ARCHITECTURE.md` are committed on `main` first.

```
/create-spec 0 project scaffold
```
Then press **Shift+Tab twice** (Plan Mode) and say:

```
Implement .claude/specs/00-project-scaffold.md exactly.
Use an explore subagent to read CLAUDE.md and docs/02_SYSTEM_ARCHITECTURE.md first.
Install only the dependencies listed in the spec. Every endpoint except /api/health
must return 501 and every future page must render ComingSoonPage.
When done, run npm test, npm run typecheck and npm run lint in both packages.
```
Then:
```
/test-feature 00-project-scaffold
/code-review-feature 00-project-scaffold
/ship-feature
```

---

## 1. Landing warm-ups (after Step 00, before Step 01)

Do these directly on a branch (`git checkout -b chore/landing-polish`), then ship with `/ship-feature`.

### 1a. Footer links
```
Add two links to the footer in @frontend/src/pages/LandingPage.tsx:

- "Terms and Conditions"
- "Privacy Policy"

Both should be plain text links using the existing footer link style.
Point both to "#" as placeholder hrefs since the pages don't exist yet.

Do not modify anything else on the page.
```
`git commit -m "landing: add terms and privacy links to footer"`

### 1b. Terms page
```
Create a "Terms and Conditions" page for BrainSpace.

1. Create frontend/src/pages/TermsPage.tsx with generic terms and conditions
   content appropriate for a personal link-saving and knowledge app.
   Include sections like: Acceptance of Terms, Use of Service, Your Content,
   Shared Links, Limitations of Liability, and Changes to Terms.
   Render it inside PublicLayout and match the style of LandingPage.
2. Add paths.terms() to @frontend/src/routes/paths.ts and register /terms in
   @frontend/src/routes/router.tsx.
3. In @frontend/src/pages/LandingPage.tsx, point the "Terms and Conditions"
   footer link to paths.terms() using a router <Link>.
```
`git commit -m "landing: add terms and conditions page and route"`

### 1c. Privacy page
```
Do the same as you did for the Terms and Conditions page, but for Privacy Policy.

1. Create frontend/src/pages/PrivacyPage.tsx with generic privacy policy content
   appropriate for BrainSpace. Include sections like: Data We Collect,
   How We Use Your Data, Cookies (we use one HTTP-only session cookie),
   Data Storage, Sharing and Public Links, Deleting Your Data, and Contact Us.
   Match the style of TermsPage.
2. Add paths.privacy() and register /privacy.
3. Point the "Privacy Policy" footer link to paths.privacy().
4. Make sure the appearance matches the site's theme tokens.
```
`git commit -m "landing: add privacy policy page and route"`

### 1d. Hero redesign from a mockup
Attach a screenshot/mockup image first, then:
```
I've attached a screenshot of the updated BrainSpace hero section design.

Modify only the hero section in @frontend/src/pages/LandingPage.tsx and its styles
in @frontend/src/styles/landing.css to match this image exactly.
Use only CSS variables from tokens.css. Do not touch any other part of the page.
```
`git commit -m "landing: redesign hero section to match mockup"`

### 1e. "See how it works" video modal
```
Add a modal to @frontend/src/pages/LandingPage.tsx that opens when the user clicks
"See how it works".

Requirements:
- Clicking "See how it works" opens a modal overlay (build a reusable
  components/ui/Modal.tsx if it doesn't exist: role="dialog", aria-modal,
  focus trap, returns focus on close)
- Modal contains an embedded YouTube video (use any placeholder YouTube URL
  for now, I will replace it later) via an <iframe> from youtube-nocookie.com
- Clicking the close button, pressing Escape, OR clicking outside closes it
- When the modal closes the video must stop playing (unmount the iframe)
- No new npm packages

Do not modify any other part of the page.
```
`git commit -m "landing: add video modal on see how it works click"`

---

## 2. Useful one-liners during the spec loop

- Review the plan before accepting it:
  `Before implementing, list every file you will create or change and confirm each one is in the spec.`
- Keep scope tight:
  `Only implement what .claude/specs/<NN-name>.md describes. If something else looks broken, tell me instead of fixing it.`
- After a failed test run:
  `Fix only the failures classified as bugs in the test report. Do not change the tests unless the report says the test contradicts the spec.`
- Seed data for manual testing:
  `/seed-user` then `/seed-content <username> 40 6`
- UI work (Steps 04, 14 or any redesign): invoke the skill explicitly —
  `Use the brainspace-ui-designer skill to design <page/component>.`

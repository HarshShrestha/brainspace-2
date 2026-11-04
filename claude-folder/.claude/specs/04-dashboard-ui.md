# Spec: Dashboard UI

## Overview
Replace the `/dashboard` "Coming soon" placeholder with the fully designed library
screen using **hardcoded sample data**. This establishes the complete layout —
sidebar, page header, search/filter toolbar, content card grid and empty state —
before any real data is wired up in Step 05. Building the UI first lets us validate
the design in isolation and keeps Step 05 purely about data. Use the
`brainspace-ui-designer` skill for this step.

## Depends on
- Step 00 — Project scaffold (tokens, Button, Logo)
- Step 03 — Login and Logout (`AppLayout`, `RequireAuth`, `UserMenu`)

## API endpoints
No API changes.

## Frontend routes
- `/dashboard` — `DashboardPage` — logged-in

## Database changes
No database changes.

## Components and pages
- **Create:** `components/layout/Sidebar.tsx` — brand, primary "New item" button (no-op for now,
  `disabled` with title "Coming in Step 06"), nav links "Library" (`/dashboard`) and "Shared with me"
  (`/shared-with-me`), a "Folders" heading with the muted text "Folders arrive in Step 10";
  becomes a slide-in drawer under 900px, toggled from a menu button in the top bar
- **Create:** `components/layout/Topbar.tsx` — menu button (mobile only), right-side slot for actions
- **Create:** `components/common/EmptyState.tsx` — icon, title, text, optional action
- **Create:** `components/ui/IconButton.tsx` — icon-only button; `label` prop required (becomes `aria-label`)
- **Create:** `features/content/components/ContentCard.tsx` — type icon + label, title as an external link
  (`target="_blank" rel="noopener noreferrer"`), domain (`www.` stripped), tag pills `#tag`, date
  ("Mar 4, 2026"), and an actions area (empty for now)
- **Create:** `features/content/components/ContentGrid.tsx` — responsive grid of cards; renders the
  `empty` prop when the list is empty
- **Create:** `features/content/components/ContentToolbar.tsx` — search input, "All types" select,
  "All tags" select — **presentational only** (no filtering until Step 09)
- **Create:** `features/content/types/content.types.ts` — `ContentType`, `ContentItem`
  (`id, title, link, type, tags: string[], createdAt, updatedAt`)
- **Create:** `features/content/fixtures/sampleContent.ts` — 6 hardcoded `ContentItem`s covering all four types (deleted in Step 05)
- **Create:** `constants/content.constants.ts` — `CONTENT_TYPES`, `CONTENT_TYPE_META` (label, plural, lucide icon per type)
- **Create:** `utils/formatDate.ts`, `utils/url.ts` (`displayHost(link)`)
- **Create:** `pages/DashboardPage.tsx` — eyebrow "Your second brain", H1 "Library", description,
  toolbar, grid fed from `sampleContent`; a `?empty=1` query param shows the empty state for design review
- **Modify:** `layouts/AppLayout.tsx` — sidebar + top bar shell (skip link, `<main id="main">`)
- **Modify:** `routes/router.tsx` — `/dashboard` → `DashboardPage`

## Files to change
- `frontend/src/layouts/AppLayout.tsx`
- `frontend/src/routes/router.tsx`
- `frontend/src/styles/index.css` (import new stylesheet)
- `frontend/src/styles/tokens.css` — content-type colour tokens if missing (`--type-article` etc.)

## Files to create
- Everything under Components and pages
- `frontend/src/styles/layout.css` (sidebar, top bar, page), `frontend/src/styles/dashboard.css` (toolbar, grid, card)
- `frontend/src/features/content/components/ContentCard.test.tsx`

## New dependencies
No new dependencies.

## Rules for implementation
- **No API calls in this step** — all data comes from `fixtures/sampleContent.ts`
- Components receive data via props; only `DashboardPage` imports the fixtures
- Use CSS variables — never hardcode hex values; no inline styles
- Type colours appear on icons only, never as card backgrounds
- External links always `rel="noopener noreferrer"`
- Grid: `repeat(auto-fill, minmax(280px, 1fr))`; one column on phones; no horizontal scroll at 360px
- Icon-only buttons have an accessible name; decorative icons `aria-hidden`
- Keep each component under ~150 lines

## Tests to write
Frontend — `ContentCard.test.tsx`
- Renders the title as a link with the item's href, `target="_blank"` and `rel="noopener noreferrer"`
- Shows the host without `www.` (e.g. `example.com`)
- Renders every tag as `#tag` and the type label ("Video")

## Definition of done
- [ ] Signing in shows the Library page with 6 sample cards in a responsive grid
- [ ] Each card shows type icon and label, title link (opens in a new tab), domain, tags and date
- [ ] The sidebar shows "New item", "Library", "Shared with me" and the Folders heading
- [ ] At 390px wide, cards stack in one column, the sidebar is a drawer opened by the menu button, and there is no horizontal scroll
- [ ] `/dashboard?empty=1` shows the empty state ("Space to think")
- [ ] The user menu in the top bar still signs out
- [ ] No hex colours outside `tokens.css`; no inline styles

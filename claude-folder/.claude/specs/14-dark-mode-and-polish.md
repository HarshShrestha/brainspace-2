# Spec: Dark Mode and Polish

## Overview
Add a light/dark theme toggle that persists across visits, and polish the app for
release: consistent loading/empty/error states, page titles, keyboard accessibility
checks, a 404 page inside the app style, and a mobile pass. No new features — this
step makes the existing ones feel finished. Use the `brainspace-ui-designer` skill.

## Depends on
- Steps 04–13 (all screens exist)

## API endpoints
No API changes.

## Frontend routes
No new routes. Every page sets `document.title` to "<Page> · BrainSpace".

## Database changes
No database changes.

## Components and pages
- **Create:** `store/theme.atoms.ts` — `themeState: "light" | "dark"`, default from `localStorage["brainspace.theme"]`,
  else `prefers-color-scheme`
- **Create:** `hooks/useTheme.ts` — `useTheme()` → `{ theme, toggle }`; `useApplyTheme()` (mounted once in `App.tsx`)
  sets `document.documentElement.dataset.theme` and persists to localStorage
- **Create:** `components/layout/ThemeToggle.tsx` — `IconButton` with `Moon`/`Sun`, label "Switch to dark/light mode"
- **Create:** `hooks/useDocumentTitle.ts`
- **Create:** `pages/RouteErrorPage.tsx` — router `errorElement`: "Something went wrong" + "Reload the page"
- **Modify:** `Topbar.tsx` (in `AppLayout`), `AuthLayout.tsx`, `PublicLayout.tsx` — include `ThemeToggle`
- **Modify:** `styles/tokens.css` — complete `:root[data-theme="dark"]` token set (bg, surface, border, text, muted, primary,
  danger, success, focus, scrim, shadows, type colours) with WCAG AA contrast for text
- **Modify:** every page — `useDocumentTitle`
- **Modify:** `index.html` — `theme-color` meta for light and dark

## Files to change
- `frontend/src/App.tsx`, `frontend/src/styles/tokens.css`, layouts, pages, `routes/router.tsx`
- `frontend/index.html`

## Files to create
- Files listed under Components and pages
- `frontend/src/hooks/useTheme.test.ts`

## New dependencies
No new dependencies.

## Rules for implementation
- Theme switching changes **only** CSS variables — no component branches on the theme for colours
- Store only the theme preference in localStorage — never user data or tokens
- Every interactive element reachable by Tab, with a visible focus ring (`:focus-visible`)
- Every dialog: focus moves into it and returns to the opener when closed
- Respect `prefers-reduced-motion` (disable transitions/animations)
- At 360–390px: no horizontal scroll on any page; sidebar drawer closes after navigating
- No hex colours outside `tokens.css`; no inline styles

## Tests to write
Frontend — `useTheme.test.ts`
- Defaults to the stored preference; falls back to `prefers-color-scheme`
- `toggle()` flips the theme, updates `data-theme` on `<html>` and persists to localStorage

## Definition of done
- [ ] The moon/sun button switches themes on every layout (auth, app, public)
- [ ] The choice survives a reload and a new tab
- [ ] All pages are readable in dark mode (no white-on-white, no invisible borders or icons)
- [ ] Tab order is logical on the dashboard; every icon button announces its purpose
- [ ] Browser tab titles read e.g. "Library · BrainSpace", "Shared with me · BrainSpace"
- [ ] At 390px wide no page scrolls horizontally, and the drawer closes after picking a link
- [ ] A thrown render error shows the RouteErrorPage instead of a blank screen

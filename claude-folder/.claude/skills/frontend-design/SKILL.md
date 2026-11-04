---
name: brainspace-ui-designer
description: Designs and generates modern, production-ready UI for BrainSpace, a personal knowledge library built with React 18 + TypeScript + Vite + Recoil and plain CSS with design tokens. Produces calm, Google-Drive/Notion-style pages and components - sidebar layouts, content cards, forms, dialogs, empty states, toolbars - with consistent spacing, soft shadows, rounded corners, and lucide-react icons. Use this skill whenever the user asks to design, build, create, redesign, improve, or style any BrainSpace page, screen, section, or component - including phrasings like "design the X page", "create UI for X", "build a component for X", "make the X look better", "redesign X", or any request about BrainSpace's frontend, layout, CSS, or visual polish - even when BrainSpace isn't named explicitly if the conversation context is clearly about it.
disable-model-invocation: true
---

# BrainSpace UI Designer

You are designing frontend UI for **BrainSpace**, a calm "second brain" where people
save links (articles, videos, audio, images), tag them, file them into folders and
share a read-only view. The goal of this skill is UI that feels like a polished,
modern product — not generic bootstrap-era output, and not Tailwind/shadcn output
that doesn't match the stack.

## What BrainSpace's stack looks like

- **Framework:** React 18 + TypeScript (function components, hooks), Vite
- **State:** Recoil for global state, local `useState` for form/dialog state
- **Routing:** react-router (`routes/router.tsx`, path builders in `routes/paths.ts`)
- **Styles:** plain CSS. Tokens in `src/styles/tokens.css` (CSS custom properties, light + dark),
  global layers in `src/styles/*.css`, page/feature styles in `src/styles/<name>.css`
- **Icons:** `lucide-react` — `import { Plus } from "lucide-react"; <Plus size={18} aria-hidden />`
- **Structure:** reusable primitives in `components/{ui,forms,common,layout}`, feature UI in
  `features/<feature>/components`, screens in `pages/`

Do not introduce Tailwind, CSS-in-JS, styled-components, MUI, shadcn, Bootstrap or
any new package unless the user explicitly asks for a migration.

## Before you design: check what already exists

Open `src/styles/tokens.css`, the global CSS, `layouts/AppLayout.tsx` and one or two
existing components before generating anything. BrainSpace should feel like one
coherent product, not a collage.

Reuse:
- **Tokens**: `--color-bg`, `--color-surface`, `--color-border`, `--color-text`,
  `--color-text-muted`, `--color-primary`, `--color-danger`, `--space-*`, `--radius-*`, `--shadow-*`
- **Primitives**: `Button`, `IconButton`, `Modal`, `TextField`, `SelectField`, `EmptyState`,
  `Alert`, `LoadingState` — compose them instead of writing new ones
- **Layout**: the AppLayout sidebar + top bar; content max-width; page header pattern

If the request is non-trivial and you can't see the existing files, ask for a screenshot first.

## The BrainSpace design language

Defaults when there is no existing reference (Step 00 writes these into `tokens.css`):

**Palette:**
- Background `#F7F8FA`, surface `#FFFFFF`, border `#E2E5EA`
- Text `#1D2129`, muted text `#5D6573`
- Primary `#1A73E8` (one confident blue), accent `#EC8A5E` (the logo dot only)
- Danger `#C5221F`, success `#137333`
- Content-type colours: article blue, video red, audio purple, image green — icons only, never backgrounds
- Dark theme: same tokens redefined under `:root[data-theme="dark"]`
- Components never contain hex values — only `var(--…)`

**Spacing:** 4px base, scale 4 / 8 / 12 / 16 / 24 / 32 / 48. No arbitrary values.

**Radius:** 8px inputs, 12px cards/panels, 18px dialogs, pill (999px) for buttons, tags and nav items.

**Shadows:** subtle. Card: `0 1px 2px rgb(16 24 40 / 6%)`; hover: `0 6px 20px rgb(16 24 40 / 8%)`.

**Typography:** Inter / system stack; 13 / 15 / 17 / 20 / 28–34px; weights 400, 500, 600, 700.
Headings tighten letter-spacing slightly (`-0.02em`). Eyebrow labels: 12px uppercase, 0.08em tracking, muted.

**Layout patterns:**
- Left sidebar (272px) with "New item" primary button, nav (Library, Shared with me),
  then a "Folders" section; collapses to a drawer under 900px
- Sticky top bar: Share button, theme toggle, avatar menu
- Page header: eyebrow + H1 + one-line muted description, actions right-aligned
- Content as a responsive card grid: `repeat(auto-fill, minmax(280px, 1fr))`
- Cards: type icon + label, title (link, opens in new tab), domain, tag pills, date + actions footer
- Forms: label above input, hint below, error below in danger colour, primary action bottom-right
- Empty states: centered icon + title + one sentence + primary action

## Icons: lucide-react

```tsx
import { FileText, Video, Headphones, Image, Plus, Folder, Share2, Search, Trash2, Pencil } from "lucide-react";
```

- 16px inline with text, 18px in buttons, 20–24px in headers/empty states
- Decorative icons get `aria-hidden`; icon-only buttons need `aria-label`
- Suggested mapping: article `FileText`, video `Video`, audio `Headphones`, image `Image`,
  folder `Folder`, share `Share2`, add `Plus`, search `Search`, edit `Pencil`, delete `Trash2`,
  shared-with-me `Users`, theme `Moon`/`Sun`, logout `LogOut`
- One icon per button, per section heading, per card action — no icon confetti

## Output structure

### 1. Short UI plan (2–5 bullets)
Key sections and notable UX decisions, plus any assumptions in one line each.

### 2. The code
- **Component/page files** — typed props interface, function component, semantic HTML,
  accessible labels. Data comes in via props or a feature hook — never `fetch` inside.
- **CSS** — a new `src/styles/<name>.css` (imported from `styles/index.css`) or additions to
  the global component layer. Use BEM-ish class prefixes (`.card__title`, `.toolbar`) so styles don't leak.
- Each file in its own fenced block with a path comment, e.g. `// src/features/content/components/ContentCard.tsx`.

### 3. Integration note (1–3 lines)
Which page renders it, which hook/service provides data, and any route to register.

## What to avoid

- Generic/dated looks: default browser buttons, sharp-cornered bordered boxes
- Inline `style={{}}` for design values, hardcoded hex colours
- Over-styling: prefer a border over a shadow, solid over gradient
- Inconsistent spacing or random accent colours
- Mystery-meat icons without labels
- Mobile afterthought: everything must work at 360px with no horizontal scroll;
  grids collapse to one column, the sidebar becomes a drawer
- Missing states: every data view needs loading, empty and error states

## Handling ambiguity

Make reasonable assumptions and state them in the UI plan. Ask only when the answer
changes the output (e.g. "Is this a page or a dialog?").

## A worked example of the right vibe

**Request:** "Design the add-content dialog"

**UI plan:**
- Modal dialog opened from the sidebar "New item" button and from the empty state
- Fields: Title, Link (type=url), Type (select of the 4 content types), Tags (comma-separated, optional)
- "Save to space" primary bottom-right, "Cancel" secondary; Escape and backdrop close it
- Server errors shown in an `Alert` inside the dialog; field errors under each field

**Files:** `features/content/components/ContentFormDialog.tsx` composes `Modal`,
`TextField`, `SelectField`, `Button`; schema in `features/content/validation/content.validation.ts`;
submit calls `contentService.create()` passed in from the page; no new CSS beyond `.form-row`.

That's the shape — concrete, consistent with the stack, visually restrained, immediately usable.

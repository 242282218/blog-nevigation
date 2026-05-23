# Full Site Architecture and UI Refresh Design

## Goal

Upgrade the whole site as a coherent knowledge workspace without a large route
or storage migration. The public pages should feel calm, readable, and
intentional. The editor pages should feel like focused tools with clear
feedback, predictable controls, and reusable structure.

## Recommended Approach

Use a convergent refactor:

- Keep the current Next.js App Router routes and local-first JSON storage.
- Preserve the existing public/editor route split.
- Extract repeated client data synchronization behavior from article and
  navigation hooks.
- Add a small set of shared UI primitives for page heroes, sections, metrics,
  messages, and empty states.
- Improve page composition and interaction states using the existing warm token
  system.

This avoids a directory-wide rewrite while still addressing the main structural
and visual problems.

## Alternatives Considered

### Domain-wide reorganization

Move code into broad domains such as `public`, `editor`, `shared`, and `data`.
This gives the cleanest long-term structure, but it would touch many files and
increase merge risk in the current dirty worktree.

### Visual-only refresh

Update page styling without touching the data or component boundaries. This
would look better quickly, but duplicated synchronization logic and large editor
pages would remain.

## Architecture Decisions

### Shells

The root layout keeps one App Router entry, while the app shell continues to
route public pages and editor pages differently. Public pages keep the global
header and constrained reading width. Editor pages keep their own top bars and
workspace width.

### Data Synchronization

Article and navigation hooks currently duplicate the same workflow:

```text
server fetch -> local fallback -> mark loaded -> local cache -> debounce server save
```

Move this workflow into a shared hook that accepts resource-specific parse,
load, save, and fallback functions. Keep mutation functions in the article and
navigation hooks so domain behavior stays explicit.

### UI Primitives

Introduce small primitives rather than a large component framework:

- `PageHero` for page introductions.
- `SectionHeading` for public content sections.
- `MetricCard` for compact evidence panels.
- `EmptyState` for empty and no-result states.
- `StatusMessage` for editor feedback.

These components should be token-driven and simple enough to reuse without
forcing every page into the same layout.

## Visual Direction

The visual direction follows the local design research:

- Claude-like warm knowledge feel.
- OpenAI/Notion content-first clarity.
- Vercel/shadcn structural discipline.

Rules:

- Warm paper background and warm black text.
- Terracotta remains the primary accent.
- Blue is reserved for links and focus.
- Monospace is used for paths, counts, commands, and compact metadata only.
- Cards use consistent border, radius, padding, and restrained shadow.
- Public pages should read as editorial sections, not nested card stacks.
- Editor pages should prioritize scanability, controls, and operation feedback.

## Page Decisions

### Public home

Keep the first screen as the actual workspace entry, not a marketing landing
page. Show the site purpose, direct actions, live counts, and recent content.

### Blog archive

Keep year grouping and strengthen the index behavior. The page should support
quick scanning by date, title, and description.

### Navigation directory

Keep search and category filtering. Make active filters and result counts
explicit, and use a clearer empty state.

### Article detail

Improve reading rhythm and keep code, quote, table, and inline code styles on
the same token system.

### Editor

Editor pages keep their current routes. They gain shared feedback components,
consistent action buttons, and clearer panels. Large files should be split only
where it reduces real complexity.

## Verification

Minimum verification:

- Lint.
- TypeScript check.
- Vitest.
- Next build.
- Public UI Playwright smoke test.
- Manual/editor browser smoke check for `/editor`, `/editor/blog`, and
  `/editor/navigation` on desktop and mobile.

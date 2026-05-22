# Portable Data and UI Refresh Design

## Goal

Make the app easier to deploy and migrate on a server while aligning the public
experience with the local design research library: warm knowledge product feel,
clear structure, restrained accents, visible interaction states, and portable
runtime data.

## Data Decision

Recommended path: keep JSON local-first storage, but treat `BLOG_DATA_ROOT` as a
single portable directory.

Alternatives considered:

- SQLite: stronger transactional model, but adds a database file, migration
  path, and backup behavior that is unnecessary for a single-writer personal
  site.
- R2 as primary storage: simple server migration, but public reads and editor
  writes would depend on remote availability.

Implementation boundary:

- Docker and production compose mount `./data:/var/lib/blog-navigation`.
- Runtime files stay under `data/articles/articles.json` and
  `data/navigation/tools.json`.
- `npm run data:export` writes the same versioned backup envelope used by the
  editor API.
- `npm run data:import` restores that envelope into any target data root.

## UI Decision

Recommended path: warm knowledge workspace with engineering controls.

Alternatives considered:

- Dark engineering console: fits developer tools, but weakens reading comfort
  for long articles.
- Hand-drawn collage: distinctive, but too decorative for navigation and editor
  workflows.

Implementation boundary:

- Homepage becomes a content dashboard with live counts and direct entry points.
- Blog archive becomes a readable year-indexed list instead of an alternating
  timeline.
- Navigation gains client-side search and category filtering.
- Shared cards, header, colors, radius, focus, and hover states use one visual
  system.

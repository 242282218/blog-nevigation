# Editor Settings Page Design

## Goal

Add a protected `/editor/settings` page for site-level configuration. The first
version should make visible public copy editable without introducing a broad CMS
or a theme editor.

## Recommended Approach

Use a small settings resource stored beside the existing runtime JSON data:

- Keep editor access protected by the existing `/editor` middleware and API
  session checks.
- Store settings in `data/settings/site.json` when `BLOG_DATA_ROOT` is
  configured.
- Provide defaults from code so the public site still renders when no runtime
  settings file exists.
- Add `/api/data/settings` for editor reads and writes.
- Include settings in backup export and restore so migrations preserve the
  public identity copy.

## Alternatives Considered

### Visual-only design settings

This would add theme controls first. It is smaller, but it does not solve the
larger settings gap and would likely need a second route later.

### Editing hardcoded files

This keeps the runtime model unchanged, but it makes deployed copy updates
depend on code changes and rebuilds.

## Data Shape

The first version keeps the shape narrow:

- `siteName`
- `siteDescription`
- `workspaceLabel`
- `heroTitleLineOne`
- `heroTitleLineTwo`
- `heroDescription`

All fields are required non-empty strings after trimming. Invalid writes return
HTTP 400 instead of partially saving.

## UI

The page uses the existing editor shell. It presents one form with explicit
labels, short helper text, save feedback, and a read-only runtime panel showing
where settings are stored.

Entry points:

- `/editor` action card.
- `:admin` command menu.

## Verification

Minimum checks:

- Unit tests for settings parsing and disk fallback.
- Existing command menu test updated for the new settings entry.
- Lint and targeted Vitest run.

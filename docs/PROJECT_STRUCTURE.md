# Project structure and suggested organization

This document describes the recommended layout and a few actionable refactors to keep the repository maintainable.

Recommended top-level folders

- `src/` — application source (components, pages, routes, styles, tests)
  - `src/components/` — small, reusable UI components (buttons, inputs, cards)
  - `src/pages/` — route-level pages and screens
  - `src/services/` — data access, API wrappers, and integrations (Firebase, Sentry)
  - `src/contexts/` — React contexts (Auth, Settings)
  - `src/hooks/` — shared custom hooks
  - `src/utils/` — pure utility helpers and types
  - `src/assets/` — images and static assets
  - `src/__tests__/` — unit and integration tests

Actionable refactor suggestions

- Move top-level `components/` into `src/components/` and update imports.
- Consolidate `services/` into `src/services/` and add `index.ts` to re-export public APIs.
- Keep `functions/` as a standalone Firebase functions package (do not mix with frontend build).

Notes

- The current repo already mostly follows this layout; migrating paths is recommended for clarity.
- When moving files, prefer small pull requests that update import paths to reduce merge conflicts.

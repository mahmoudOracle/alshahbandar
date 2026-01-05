# Changelog

## 0.1.0 - 2025-12-30

Highlights:

- Phase 1: Domain model and types for trading (products, purchases, invoices, stock ledger, inventory snapshots)
- Phase 2: Implemented server-side atomic callables for invoices, purchases, goods receipts, incoming receipts
- Phase 3: Hardened Firestore security rules to enforce append-only ledger and restrict writes to admin/callables
- Phase 3: Updated client `services` to prefer callables and removed unsafe client-side inventory/ledger writes
- Phase 3: Added unit tests (Vitest), emulator-aware integration tests, Playwright E2E tests, and CI workflows
- Phase 4: CI fixes, Playwright stability (retries/reporters), workflow cleanup, auto-merge on green

Notes:

- Local emulator runs require JDK 21. Use Adoptium Temurin 21 for local testing.
- To run locally:
  - `npm ci`
  - `npm run test` (unit)
  - Start emulators: `npx firebase emulators:start --only firestore,functions --project al-shabandar`
  - `npm run test:integration` (integration)
  - `npx playwright install --with-deps` then `npm run test:e2e` (E2E)

Deployment:

- CI runs build, runs tests, and E2E; `auto-merge-on-green` will merge `phase4-*` branches into `main` on successful CI.

For details, see the repository `README.md` and `DEPLOYMENT.md`.

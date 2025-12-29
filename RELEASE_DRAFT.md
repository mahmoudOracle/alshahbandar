# Release v0.1.0 Draft

Summary
-------
- Release: v0.1.0
- Date: 2025-12-30
- Branch: `phase4-features`

Highlights
----------
- Added server-side atomic callables for invoices, purchases, goods receipts and incoming receipts.
- Hardened Firestore security rules to enforce append-only ledger and require callable/admin writes for financial and inventory mutations.
- Replaced client-side ledger/inventory writes with callable-based flows and client wrappers in `services/firestoreService.ts`.
- Unit tests added and passing locally (Vitest).
- Playwright E2E scaffolding added with CI-friendly retries and artifact upload.
- CI workflows updated to install Java 21 on emulator jobs; workflow syntax fixes applied.

Breaking changes / migration notes
-------------------------------
- Local development: Firebase emulators require Java 21+ (Temurin 21 recommended). Update `JAVA_HOME` accordingly.
- Clients that previously wrote directly to `stockLedger` or `inventory` must use the new callables. Ensure any external integrations use the callable endpoints or use admin SDK.

Post-release actions
--------------------
1. Deploy functions and hosting via CI workflow (`.github/workflows/deploy.yml`).
2. Run smoke tests and E2E tests in CI; if failures appear, collect `playwright-artifacts` and investigate.
3. Announce release and update changelog if required.

Notes
-----
This draft is intentionally concise; expand release notes in the GitHub Release UI with any screenshots, migration scripts, or breaking-change details.

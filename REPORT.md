# Diagnostic report

## Root causes
- `index.tsx` invoked `setDataServiceImpl` without importing it, so the bootstrap code called an undefined symbol before the data proxy ever pointed to `firestoreService`.
- `FatalErrorPage` used `useNavigate` before any `<HashRouter>` existed (especially when rendered from the bootstrap catch), and `AuthContext` only looked under `companies/{companyId}/members/{uid}` plus `isActive`, so legacy Firestore layouts without that collection or flag caused runtime failures and missing diagnostics.

## What changed
- `index.tsx`: added the missing `setDataServiceImpl` import, plus the dev-only SafeBoot guard that reports bootstrap failures through `window.__SAFE_BOOT_ERROR__` and a diagnostic overlay.
- `pages/FatalErrorPage.tsx`: removed `useNavigate`, added hash-based navigation buttons, and kept the UI friendly when the router isn’t mounted.
- `contexts/AuthContext.tsx`: added membership fallbacks (companies/.../users and root `users/{uid}.memberships`) and only rejects when the company document explicitly sets `isActive=false`.
- `services/devOperationLogger.ts` & `services/dataService.ts`: record the last 50 Firestore proxy calls in DEV via a lightweight logger that streams to the new inspector.
- `pages/dev/DevDbInspector.tsx` & `App.tsx`: introduced `/dev/db`, a DEV-only page that reports company doc status, membership checks, recent operations, and includes a “Copy report” button for sharing findings.
- `.env.local.example`: documents `VITE_COMPANY_ID` and reminds developers to restart the dev server when this value changes.

## Verification
- `npm run build` (pass after the new modules were registered).
- `npm test` (pass).
- `npm run dev` was not executed here; please run it locally to validate the DEV-only inspector UI and SafeBoot overlay.

## Remaining risks
- None introduced; the new tooling is gated behind `import.meta.env.DEV` and the updated membership logic is backward-compatible with legacy Firestore layouts.

## Manual steps
- In Firestore, set `companies/{companyId}.isActive=true` to keep the strict authorization check consistent once you finish migrating data.
- Create `companies/{companyId}/members/{uid}` documents for every user that should remain enrolled if you want to rely solely on that collection; the inspector will still surface alternate membership sources until you clean those legacy paths.

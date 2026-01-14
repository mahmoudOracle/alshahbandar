# Pre-Production Audit (Multi-Tenant Roles & Operations)

Scope: strict check for multi-tenant roles, max users enforcement, operational linking, and production readiness for a single company rollout.

## A) Roles & Permissions

### Permission matrix (policy target)
| Feature / Collection | Manager | Staff | Viewer |
| --- | --- | --- | --- |
| Invoices | Create, Read, Update, Delete (via server) | Create only | Read only |
| Customers | Create, Read, Update | Create only | Read only |
| Products | Create, Read, Update | Create only | Read only |
| Inventory | Read only (writes via server only) | Read only | Read only |
| Expenses | Create, Read, Update | Create only | Read only |
| Payments | Create, Read, Update | No write | Read only |
| Settings | Create, Read, Update | No write | Read only |
| Users & Invites | Manage via server callables | No write | Read only |
| Reports | Read | Read | Read |

### Enforcement locations
- Firestore Rules: enforce manager/staff/viewer permissions and deny client deletes.
- Cloud Functions: enforce privileged actions and maxUsers checks.
- UI: should align with the above but is not relied on for security.

### Findings (Rules)
Rules were updated to enforce the policy for:
- `invoices`: staff create only; update restricted to manager; delete blocked.
- `customers`, `products`, `expenses`: staff create only; update restricted to manager; delete blocked.
- `payments`, `settings`: manager only.
- `companies/{companyId}/users/{uid}`: direct client creation of other users is blocked; only self or platform admin.

Files: `firestore.rules`

## B) User limit enforcement (maxUsers=10)

Server-side enforcement exists in:
- `createCompanyInvitation`: blocks creating new invites when user count + pending invites >= maxUsers.
- `acceptInvitation`: blocks accepting when user count >= maxUsers.

Potential bypasses:
- Direct writes to `companies/{companyId}/users/{uid}` could bypass maxUsers. This is now blocked by rules (only self or platform admin allowed).

Files: `functions/index.js`, `firestore.rules`

## C) Operational linking (inventory)

1) Invoice creation reduces stock:
- `saveInvoice` uses `createInvoiceAtomic` callable.
- `createInvoiceAtomic` updates product stock and writes ledger entries atomically.

2) Minimal linking plan (already implemented):
- `productId` and `quantity` are required in invoice line items.
- Atomic callable handles stock updates and invoice creation.

3) Expenses in reports:
- Reports page sums invoices and expenses for totals and net.

Files: `services/firestoreService.ts`, `functions/index.js`, `pages/Reports.tsx`

## D) Production safety

1) Dev diagnostics visibility
- `DataIsolationDebug` renders unconditionally in `App.tsx`.
- `/dev/debug` route is available (not access-restricted).
Severity: Medium (leaks internal debugging to production UI).

2) Arabic text encoding
- Several UI strings appear as mojibake (garbled encoding) in routes, sidebar, and pages.
Severity: High (critical UX issue for Arabic UI).

3) Build status
- `npm run build` failed:
  - `contexts/AuthContext.tsx` has a syntax error at line ~201 (unexpected `?`).
Severity: High (build fails).

## Gaps Found (Severity)
- High: Production build fails (syntax error in `contexts/AuthContext.tsx`).
- High: Arabic UI text encoding appears broken in multiple files.
- Medium: Dev debug UI visible (`DataIsolationDebug`, `/dev/debug` route).
- Low: Invoice creation requires `productId`; if UI allows freeform items, invoice create will fail. Verify UI validation.

## Exact Next Steps (max 5)
1) Fix `contexts/AuthContext.tsx` syntax error and re-run `npm run build`.
2) Repair Arabic string encoding for routes/sidebar/pages (verify with actual Arabic copy).
3) Guard `DataIsolationDebug` and `/dev/debug` behind a dev flag or admin-only access.
4) Confirm invoice UI enforces `productId` + `quantity` on line items.
5) Deploy updated Firestore rules and functions, then re-run build.

## Commands Run
- `npm run build` -> Failed with esbuild error in `contexts/AuthContext.tsx` (unexpected `?` at ~line 201).

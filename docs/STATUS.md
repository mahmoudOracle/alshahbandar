# Project Status Report

Last updated: 2026-01-06

## A) Routes and Behaviors (HashRouter)
Single source of truth: `src/routes.ts`, rendered by `App.tsx` via `AppRoutes`.

- `/#/` -> `pages/Dashboard.tsx` ("ملخّص" summary dashboard)
- `/#/reports` -> `pages/Reports.tsx` (date-range financial report + records)
- `/#/settings` -> `pages/Settings.tsx` (settings UI; permission warning if cannot edit)
- `/#/settings/*` -> `pages/Settings.tsx` (catch-all to avoid "No routes matched")
- `/#/invoices` -> `pages/InvoiceList.tsx`
- `/#/invoices/new` -> `pages/InvoiceForm.tsx`
- `/#/invoices/edit/:id` -> `pages/InvoiceForm.tsx`
- `/#/invoices/:id` -> `pages/InvoiceDetail.tsx`
- `/#/customers` -> `pages/CustomerList.tsx`
- `/#/customers/new` -> `pages/CustomerForm.tsx`
- `/#/customers/edit/:id` -> `pages/CustomerForm.tsx`
- `/#/customers/:id` -> `pages/CustomerDetail.tsx`
- `/#/products` -> `pages/ProductList.tsx`
- `/#/products/new` -> `pages/ProductForm.tsx`
- `/#/products/edit/:id` -> `pages/ProductForm.tsx`
- `/#/quotes` -> `pages/QuoteList.tsx`
- `/#/quotes/new` -> `pages/QuoteForm.tsx`
- `/#/quotes/edit/:id` -> `pages/QuoteForm.tsx`
- `/#/quotes/:id` -> `pages/QuoteDetail.tsx`
- `/#/recurring` -> `pages/RecurringInvoiceList.tsx`
- `/#/recurring/new` -> `pages/RecurringInvoiceForm.tsx`
- `/#/recurring/edit/:id` -> `pages/RecurringInvoiceForm.tsx`
- `/#/expenses` -> `pages/ExpenseList.tsx`
- `/#/expenses/new` -> `pages/ExpenseForm.tsx`
- `/#/expenses/edit/:id` -> `pages/ExpenseForm.tsx`
- `/#/reports` -> `pages/Reports.tsx`
- `/#/cash-flow` -> `pages/CashFlow.tsx`
- `/#/purchases` -> `pages/PurchasesPage.tsx`
- `/#/suppliers` -> `pages/SuppliersPage.tsx`
- `/#/receipts` -> `pages/IncomingReceiptsList.tsx`
- `/#/receipts/:id` -> `pages/ReceiptDetailPage.tsx`
- `/#/warehouse` -> `pages/WarehousePage.tsx`
- `/#/inventory-audit` -> `pages/InventoryAudit.tsx`
- `/#/profile` -> `pages/Profile.tsx`
- `/#/invite/accept` -> `pages/AcceptInvitationPage.tsx`
- `/#/invite/accept/:companyId/:inviteId/:token` -> `pages/AcceptInvitationPage.tsx`
- `/#/complete-setup` -> `pages/CompleteCompanySetupPage.tsx`
- `/#/admin/*` -> `pages/NotAuthorizedPage.tsx`
- `/#/dev/debug` -> `pages/DevDebugPage.tsx`

## B) Auth + Company Flow (Step-by-step)
Source: `contexts/AuthContext.tsx` + `services/firestoreService.ts`

1) Firebase auth listener (`authService.subscribeToAuthChanges`).
2) If signed out: clear active company + role, show login screen.
3) If signed in:
   - Check platform admin via `checkIfPlatformAdmin` (callable: `isPlatformAdmin`).
   - Load user profile via `getUserProfile`.
4) Read companyId from user profile.
5) Fetch company doc (`getCompany`) and membership doc (`getCompanyMembershipByUid`).
6) Validate company status (must be `approved`).
7) If membership doc missing:
   - If company owner matches user (company.ownerUid or company.email matches user.email), attempt to create membership (`createOwnerMembershipIfMissing`).
   - Otherwise show onboarding warning and proceed without crashing.
8) Set activeCompanyId, membership, and role; persist in localStorage for UI hints.
9) Data isolation checks are logged in `services/dataTenantUtils.ts`.

## C) Firestore Schema (Observed/Used)
All tenant data is stored under `companies/{companyId}`:

- `companies/{companyId}` (company doc)
  - Fields: `companyName`, `status`, `ownerUid`, `email`, `createdAt`, `updatedAt` (see `services/firestoreService.ts`).
- `companies/{companyId}/users/{uid}` (membership doc)
  - Fields: `uid`, `email`, `firstName`, `lastName`, `fullName`, `role`, `status`, `createdAt`, `updatedAt`.
- `companies/{companyId}/invoices`
  - Fields used: `id`, `invoiceNumber`, `customerName`, `date`, `dueDate`, `total` (also `grandTotal`, `totalAmount`, `amount`, `net` as fallbacks).
- `companies/{companyId}/customers`
  - Fields used: `id`, `name`, `createdAt`.
- `companies/{companyId}/payments`
  - Fields used: `id`, `invoiceId`, `amount`, `date`.
- `companies/{companyId}/expenses`
  - Fields used: `id`, `amount`, `category`, `vendor`, `description`, `date`.
- `companies/{companyId}/products`
  - Fields used: `id`, `name`, `stock`.
- `companies/{companyId}/settings/app`
  - Fields used: `businessName`, `currency`, `logo`, `address`, `taxes`, etc.
- Additional collections in use:
  - `quotes`, `recurringInvoices`, `suppliers`, `incomingReceipts`, `warehouse`, `inventory`, `stockLedger`, `journalEntries`, `reports`.

## D) Cloud Functions Usage (Callable)
Source: `services/firestoreService.ts`
All functions are called via Firebase callable SDK (no direct fetch).

- `getAdminCompanies` (callable)
- `createCompanyAsAdmin` (callable)
- `getCompanyCounts` (callable)
- `createInvoiceAtomic` (callable)
- `createPurchaseAtomic` (callable)
- `createGoodsReceiptAtomic` (callable)
- `createIncomingReceiptAtomic` (callable)
- `safeDeleteDocument` (callable)
- `isPlatformAdmin` (callable)
- `resolveFirstLogin` (callable)
- `getCompanyInvitations` (callable)
- `deleteCompanyInvitation` (callable)
- `assignCompanyRole` (callable)
- `createOwnerCompany` (callable)
- `getSalesSummary` (callable)
- `exportSalesCsv` (callable)
- `createInvitation` (callable)
- `acceptInvitation` (callable)
- `safeUndeleteDocument` (callable)

## E) Known Issues and Recommended Fixes
P0 (Critical)
- Membership auto-create may fail if Firestore rules block `companies/{companyId}/users/{uid}` writes.
  - Fix: add server-side callable to create membership or adjust rules for owner bootstrap.

P1 (High)
- Report totals use `payments` for revenue; if payments are missing, revenue shows zero even when invoices exist.
  - Fix: add fallback to invoice totals when payments are empty.
- Route titles and some UI strings show mojibake due to encoding issues in repo.
  - Fix: normalize encoding or update labels using explicit UTF-8 strings.

P2 (Medium)
- Client-side RBAC is explicitly no-op (`ensureWriteAllowed`) and relies entirely on rules.
  - Fix: maintain server-side enforcement and add clear UI permission messaging.
- Date parsing is tolerant but may misorder records if documents use inconsistent formats.
  - Fix: normalize to ISO or Timestamp across all writes.
- Reports and Dashboard depend on data shape; missing fields will show zero without explicit placeholders.
  - Fix: add schema validation or safe fallbacks per collection.

## F) Production Readiness Checklist (Netlify + Firebase)
Deployment
- Netlify build configured for Vite (`npm run build`), output `dist/`.
- Confirm `netlify.toml` and `_redirects` include SPA fallback for HashRouter.

Firebase
- Ensure Firebase config in `services/firebase.ts` is correct for production.
- Configure `VITE_USE_EMULATORS` and emulator ports only for dev.
- Verify Firestore rules for multi-tenant isolation on all collections.
- Deploy callable Functions listed above; ensure `getCompanyInvitations` and `isPlatformAdmin` are deployed.

Security/Observability
- Add error tracking (Sentry/LogRocket) and log sampling for auth + data access.
- Validate `companyId` isolation checks are always enforced server-side.

UI/UX
- Confirm loading/empty/error states for critical pages (Dashboard, Reports, Settings).
- Verify mobile layout: `MobileBottomNav`, Sidebar collapse, and header remain usable.
- Verify date inputs and RTL alignment for Arabic labels.

Operations
- Backups: Firestore export schedule.
- Monitoring: Functions logs, Firestore quota usage.
- Permissions: ensure owners/managers can recover membership if missing.



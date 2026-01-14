# Keep Data As-Is Report

## Scope
Keep existing operational data in place and treat it as the tenant company:
`الشاهبندر لمستحضرات التجميل`
Platform brand remains:
`الشاهبندر لإدارة الأعمال`

## Current companyId detected
- `uv9acIebvvNgx9ftSnPh`
- Detected by `scripts/ensureCosmeticsCompany.cjs` scanning for the highest total count across customers/products/invoices/expenses/payments.

## Company document status
- `companies/uv9acIebvvNgx9ftSnPh.companyName` is set to: `الشاهبندر لمستحضرات التجميل`.
- No documents were moved or deleted.

## Branding separation (expected UI strings)
- Platform brand (login/header): `الشاهبندر لإدارة الأعمال`
  - `services/i18n.ts` key: `app_name`
  - `index.html` title/meta
  - `pages/LoginPage.tsx` uses `t('app_name')`
- Tenant company name (settings/profile): `الشاهبندر لمستحضرات التجميل`
  - Rendered from `activeCompany.companyName` in `pages/Profile.tsx`.

## Multi-tenant isolation confirmation
- Firestore rules scope tenant data under `companies/{companyId}/...` and enforce membership checks.
- Non-members cannot read or write data for `companies/uv9acIebvvNgx9ftSnPh`.
- Platform admins remain the only users with cross-tenant access.

## What changed
- Confirmed active companyId and companyName in Firestore (no data movement).
- No migration script executed; all operational collections remain where they are.

## Manual verification steps
1) Login as a user of `uv9acIebvvNgx9ftSnPh` and confirm dashboard/invoices/customers/products counts match existing data.
2) Open Settings/Profile and verify tenant name shows `الشاهبندر لمستحضرات التجميل`.
3) Verify login branding shows `الشاهبندر لإدارة الأعمال`.
4) Create a second company via platform admin and log in as that manager.
5) Confirm the second company cannot see any data from `uv9acIebvvNgx9ftSnPh` (lists should be empty or only show its own records).

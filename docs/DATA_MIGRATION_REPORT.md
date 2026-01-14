# Data Migration Report

## Scope
Move legacy root collections into the tenant company collection for:
`الشاهبندر لتجارة مستحضرات التجميل`

## COSMETICS_COMPANY_ID
- `TBD` (fill after company creation/lookup)

## Source paths detected
- Root collections (legacy): `customers`, `products`, `invoices`, `expenses`, `payments`

## Destination paths
- `companies/{COSMETICS_COMPANY_ID}/customers`
- `companies/{COSMETICS_COMPANY_ID}/products`
- `companies/{COSMETICS_COMPANY_ID}/invoices`
- `companies/{COSMETICS_COMPANY_ID}/expenses`
- `companies/{COSMETICS_COMPANY_ID}/payments`

## Migration execution
Script: `scripts/migrateLegacyDataToCompany.js`

Run (dry-run first):
```bash
node scripts/migrateLegacyDataToCompany.js --companyId=YOUR_COMPANY_ID --dryRun
```

Run (write):
```bash
node scripts/migrateLegacyDataToCompany.js --companyId=YOUR_COMPANY_ID --write
```

Optional: limit collections
```bash
node scripts/migrateLegacyDataToCompany.js --companyId=YOUR_COMPANY_ID --write --collections=customers,products,invoices
```

## Results
Fill in after running migration:
- customers moved: `TBD`
- products moved: `TBD`
- invoices moved: `TBD`
- expenses moved: `TBD`
- payments moved: `TBD`
- skipped (existing): `TBD`
- reference issues (invoice customer/product mismatches): `TBD`

## Manual verification steps (UI)
1) Login as cosmetics company user.
2) Check Dashboard counts match pre-migration numbers.
3) Open Invoices, Customers, Products, Expenses and confirm lists show expected records.
4) Open Reports and confirm totals align with previous values.
5) Create a new invoice and verify stock updates.

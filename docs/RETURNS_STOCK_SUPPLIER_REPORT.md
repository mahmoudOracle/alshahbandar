# Returns + Low Stock + Supplier Statement Report

## What changed
- Added returns, low stock alert UI, and supplier statement with export.
- Low stock uses `reorderLevel` to flag products and filter.
- Reports include returns and net sales.

## Collections/fields added or used
Tenant-scoped only:
- `companies/{companyId}/returns`
  - `invoiceId`, `customerId`
  - `items: [{ productId, nameSnapshot, quantity, unitPriceSnapshot, lineTotal }]`
  - `totalReturnAmount`
  - `date` (Timestamp or string)
  - `reason` (optional)
  - `mode` (`refund_cash` | `credit_note`)
  - `createdAt`, `updatedAt`
- `companies/{companyId}/supplierPayments`
  - `supplierId`, `supplierName`
  - `purchaseId` (optional)
  - `amount`
  - `method` (Arabic enum)
  - `date` (Timestamp or string)
  - `notes`, `reference` (optional)
  - `createdAt`, `updatedAt`
- `companies/{companyId}/products`
  - `reorderLevel` (number, optional)

## How to use (5 steps each)
Low stock alerts:
1) Open المنتجات والمخزون.
2) Set "حد إعادة الطلب" for a product.
3) Reduce stock below the reorder level.
4) Check Dashboard KPI "تنبيه مخزون منخفض".
5) Use filter "منخفض" to list low-stock items.

Returns:
1) Open an invoice.
2) Click "مرتجع".
3) Select items and quantities to return.
4) Choose date and add reason (optional).
5) Save and verify the return appears in the invoice history and stock increases.

Supplier statement:
1) Open الموردون.
2) Select a supplier and open "كشف حساب المورد".
3) Add a supplier payment (optional).
4) Review running balance and summary cards.
5) Export as PDF/PNG.

## Limitations (v1)
- Return quantity validation is best-effort (checks against invoice items).
- No multi-page PDF pagination yet (single-page export).
- Low stock alerts require `reorderLevel` to be set.

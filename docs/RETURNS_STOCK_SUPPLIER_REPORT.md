# Returns + Low Stock + Supplier Statement Report

## Files changed
- `pages/ProductList.tsx`
- `pages/Dashboard.tsx`
- `pages/ReturnForm.tsx`
- `pages/InvoiceDetail.tsx`
- `pages/Reports.tsx`
- `pages/SuppliersPage.tsx`
- `services/firestoreService.ts`
- `services/dataService.ts`
- `services/mockService.ts`
- `functions/index.js`
- `firestore.rules`
- `docs/QA_CHECKLIST.md`

## Data model
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
1) افتح صفحة المنتجات والمخزون.
2) حدّد "حد إعادة الطلب" للمنتج.
3) خفّض المخزون ليصبح أقل أو يساوي الحد.
4) راجع بطاقة "تنبيه مخزون منخفض" في الملخص.
5) استخدم فلتر "منخفض" لعرض الأصناف المنخفضة.

Returns:
1) افتح تفاصيل الفاتورة.
2) اضغط "إنشاء مرتجع".
3) حدّد الأصناف والكميات المرتجعة.
4) اختر التاريخ وأدخل سببًا (اختياري).
5) احفظ وتأكد من زيادة المخزون وظهور المرتجع في القائمة.

Supplier statement:
1) افتح صفحة الموردين.
2) اختر موردًا وافتح "كشف حساب المورد".
3) حدّد الفترة وتبديل الرصيد الافتتاحي.
4) راجع الرصيد الجاري والملخص.
5) صدّر التقرير PDF/PNG.

## Limitations (v1)
- التحقق من كمية المرتجع يعتمد على كميات الفاتورة فقط.
- تصدير PDF صفحة واحدة دون ترقيم صفحات.
- تنبيه المخزون المنخفض يتطلب تحديد `reorderLevel`.

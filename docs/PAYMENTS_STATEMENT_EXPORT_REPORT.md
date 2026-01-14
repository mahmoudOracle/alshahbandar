# Payments, Statement, Export Report

## Files changed
- `types.ts`
- `services/firestoreService.ts`
- `services/dataService.ts`
- `services/mockService.ts`
- `services/exportUtils.ts`
- `components/PrintableReport.tsx`
- `pages/PaymentForm.tsx`
- `pages/CustomerDetail.tsx`
- `pages/InvoiceDetail.tsx`
- `pages/Reports.tsx`
- `docs/QA_CHECKLIST.md`

## Payment fields used
Payments are stored under `companies/{companyId}/payments` with:
- `customerId` (required)
- `customerName` (snapshot)
- `invoiceId` (optional)
- `invoiceNumber` (optional snapshot)
- `amount`
- `method` (Arabic enum: كاش / محفظة / إنستاباي / تحويل بنكي / أخرى)
- `date` (Firestore Timestamp preferred; ISO string accepted for legacy)
- `notes` (optional)
- `reference` (optional)
- `createdAt`, `updatedAt`

## How to record a payment
1) من تفاصيل الفاتورة: اضغط "تسجيل دفعة".
2) يتم تعبئة العميل والفاتورة والمبلغ المتبقي تلقائيًا.
3) اختر طريقة الدفع وحدد التاريخ.
4) اضغط "تسجيل دفعة".

بديل:
1) من صفحة العميل: اضغط "تسجيل دفعة".
2) اختر فاتورة (اختياري) أو اتركها "دفعة على الحساب".
3) أدخل المبلغ والتاريخ والطريقة.
4) احفظ.

## Statement balance computation
- الفواتير = مدين (Debit).
- الدفعات = دائن (Credit).
- الرصيد الجاري يبدأ من 0 داخل نطاق التاريخ.
- المعادلة: الرصيد += (مدين - دائن).
- خيار "مع رصيد افتتاحي" يحسب الرصيد قبل الفترة:
  - مجموع الفواتير قبل تاريخ البداية - مجموع الدفعات قبل تاريخ البداية.
  - الرصيد الجاري يبدأ من الرصيد الافتتاحي.

## Timestamp
- عند إنشاء دفعة جديدة يتم حفظ التاريخ كـ Firestore Timestamp.
- عند القراءة يتم قبول Timestamp أو ISO string، ويتم تحويلهما إلى Date للعرض والفرز.

## Export PDF/PNG
1) افتح كشف حساب العميل أو صفحة التقارير.
2) اضغط "تصدير PDF" أو "تصدير PNG".
3) الملف يُحمّل تلقائيًا بنفس عنوان التقرير والفترة.

## Export quality improvements
- تصدير بعرض ثابت قريب من A4 لتحسين الاتساق.
- رفع مقياس الصورة لتحسين وضوح النص في PDF/PNG.
- ضبط RTL وخلفية بيضاء لضمان قراءة عربية واضحة.

## Known limitations
- لا توجد صفحات متعددة في PDF (تصدير صفحة واحدة).
- يلزم تحديد تاريخ صالح قبل التصدير.

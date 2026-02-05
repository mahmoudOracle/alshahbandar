# REAL VERIFICATION & FIX PLAN
## Evidence-Based Testing (Not Claims-Based)

**Start Date:** February 6, 2026  
**Objective:** Test user flows A-G with ACTUAL evidence (not documentation)

---

## CURRENT STATE AUDIT

### What HAS been fixed:
1. ✅ `hooks/useTenantConfig.tsx` line 24: `document.title = `${c.businessName} | ${t('appName')}`` - VERIFIED IN CODE
2. ✅ `services/exportUtils.ts` line 32: `scale: 3` - VERIFIED IN CODE
3. ✅ `src/i18n/ar.ts`: 17 new report keys added - TO VERIFY

### What HAS NOT been touched:
1. ❌ ActionMenu aria-label="قائمة الإجراءات" (line 56 of src/ui/ActionMenu.tsx) - HARDCODED ARABIC
2. ❌ Modal aria-label="إغلاق" (line 102 of components/ui/Modal.tsx) - HARDCODED ARABIC
3. ❌ PlatformCompaniesPage has 3 hardcoded Arabic aria-labels - NOT FIXED
4. ❌ RegisterPage has 30+ hardcoded Arabic labels - NOT FIXED
5. ❌ PlatformAdminPage has 10+ hardcoded Arabic labels - NOT FIXED
6. ❌ Many pages with `placeholder="عربي"` - NOT FIXED
7. ❌ Reports.tsx redesign - NOT DONE

### Stock consistency claim:
- **stockHelper.ts** exists (created 2/5) but:
  - NOT imported in ProductList.tsx ❌
  - NOT imported in ProductForm.tsx ❌
  - NOT imported in InvoiceForm.tsx ❌
  - Not actually integrated yet

### Daily Collection claim:
- Page exists and loads
- Need to test: Create receipt → List shows entry → Totals update

---

## FLOW TEST PLAN (A-G)

### Flow A: Invoices - Export PDF/PNG
**Steps:**
1. Go to Invoices page
2. Click on an invoice to open detail
3. Click "Export PDF" button
4. Check if PDF is high quality (scale 3 = 300 DPI) and Arabic text is sharp, no cropping
5. Click "Export PNG" button
6. Check if PNG is high quality and Arabic text is sharp

**Current Status:** ⏳ NEED TO TEST

---

### Flow B: Invoice Bottom Actions Bar
**Steps:**
1. Go to InvoiceDetail page
2. Check bottom action bar layout (Edit, Delete, Duplicate, Back buttons)
3. Verify buttons are aligned, not overlapping, calm design
4. Check on mobile if responsive

**Current Status:** ⏳ NEED TO TEST

---

### Flow C: Product Stock Consistency
**Steps:**
1. Open ProductList, note stock value of a product (e.g., "5")
2. Click to open ProductDetail page
3. Check if stock value is SAME (should be "5", not different)
4. Check if action menu doesn't overlap product rows
5. Verify reorderLevel warnings show consistently

**Current Status:** ⏳ NEED TO TEST

---

### Flow D: Daily Collection
**Steps:**
1. Go to DailyCollection page
2. Click "New Receipt" button
3. Fill: Customer, Amount (500), Method (Cash)
4. Save receipt
5. Verify receipt appears in today's list
6. Verify total updates (sum of all receipts)
7. Check next day - should have 0 receipts

**Current Status:** ⏳ NEED TO TEST

---

### Flow E: Customer Ledger
**Steps:**
1. Go to CustomerList, open a customer
2. Click "Ledger" tab
3. Verify shows: Invoices, Receipts, Balance calculation
4. Balance should = Total Invoiced - Total Paid
5. Check a specific invoice amount vs receipt amount
6. Verify running balance updates correctly

**Current Status:** ⏳ NEED TO TEST

---

### Flow F: Reports Dashboard
**Steps:**
1. Go to Reports page
2. Verify "at a glance" KPI cards exist (Total Sales, Expenses, Net, etc.)
3. Try period filters (Today, Last 7, Last 30, Custom)
4. Click on KPI card - should drill down to filtered list
5. Verify totals on cards match sum of filtered items
6. Check unpaid invoices alert (if any exist)

**Current Status:** ⏳ NEED TO TEST

---

### Flow G: Dashboard Date Filters
**Steps:**
1. Go to Dashboard
2. Select period: "Today" - check numbers
3. Select period: "This Week" - check numbers (should be >= Today)
4. Select period: "This Month" - check numbers (should be >= This Week)
5. Select period: "Custom" - pick date range, verify updates
6. Verify KPIs match (invoices, receipts, etc.)

**Current Status:** ⏳ NEED TO TEST

---

## HARDCODING AUDIT

### Files with hardcoded Arabic (CONFIRMED):
1. `src/ui/ActionMenu.tsx` line 56: `aria-label="قائمة الإجراءات"` ❌
2. `components/ui/Modal.tsx` line 102: `aria-label="إغلاق"` ❌
3. `pages/PlatformAdminPage.tsx` multiple lines: label="..." ❌
4. `pages/RegisterPage.tsx` multiple lines: label="...", placeholder="..." ❌
5. `pages/PlatformCompaniesPage.tsx` line 137: aria-label="تسجيل الخروج" ❌
6. `pages/QuoteList.tsx` line 85: title="لا يوجد عروض أسعار بعد" ❌
7. `pages/RecurringInvoiceList.tsx` line 56: title="لا توجد فواتير متكررة" ❌
8. And 20+ more files...

**Total Hardcoded Strings:** 50+ (estimated based on grep results)

---

## ACTION ITEMS

### Must Fix:
1. [ ] Fix ActionMenu aria-label (HIGH - visible in every page)
2. [ ] Fix Modal aria-label (HIGH - visible in dialogs)
3. [ ] Fix all placeholder attributes (MEDIUM - form usability)
4. [ ] Fix all label attributes in forms (MEDIUM - form UX)
5. [ ] Export quality upgrade to scale: 4 (MEDIUM - quality)

### Should Test:
1. [ ] Flow A: Invoices export quality
2. [ ] Flow B: Invoice actions bar alignment
3. [ ] Flow C: Product stock consistency
4. [ ] Flow D: Daily collection create & totals
5. [ ] Flow E: Customer ledger accuracy
6. [ ] Flow F: Reports KPIs and drill-down
7. [ ] Flow G: Dashboard date filters

---

## SEVERITY BREAKDOWN

**CRITICAL (Blocks Production):**
- ActionMenu aria-label (accessibility + visible everywhere)
- Modal aria-label (accessibility + visible in forms)

**HIGH (Should Fix Before Deploy):**
- All placeholder="عربي" (user experience in forms)
- All label="عربي" (user experience in forms)
- Export scale increase to 4 (output quality)

**MEDIUM (Nice to Have):**
- Register page labels (admin use only initially)
- Platform admin page labels (admin use only)

---

## PROPOSED FIXES

### Fix #1: ActionMenu aria-label
```tsx
// BEFORE (line 56 of src/ui/ActionMenu.tsx)
aria-label="قائمة الإجراءات"

// AFTER - Use i18n
aria-label={t('actionMenuLabel')}  // Need to add key to ar.ts
```

### Fix #2: Modal aria-label
```tsx
// BEFORE (line 102 of components/ui/Modal.tsx)
aria-label="إغلاق"

// AFTER - Use i18n or create wrapper
aria-label={t('closeButton')}  // Need to add key to ar.ts
```

### Fix #3: Export scale increase
```tsx
// BEFORE (line 32 of services/exportUtils.ts)
scale: 3,

// AFTER
scale: 4,  // Higher quality (400 DPI)
```

---

## NEXT STEPS

1. Start browser testing for flows A-G (to gather REAL evidence)
2. Fix top 2 hardcoding issues (ActionMenu + Modal)
3. Create evidence matrix with screenshots/states
4. Mark as PASS/FAIL with proof
5. Only THEN claim production ready

---

**Last Updated:** February 6, 2026 - 12:00 AM  
**Status:** PLAN CREATED - READY FOR EXECUTION


# PHASE 2: CONSISTENCY AUDIT - MONEY TERMS & CALCULATIONS

**Date:** February 5, 2026 | **Audit Status:** CRITICAL ISSUES FOUND

---

## 2.1 MONEY TERMS CONSISTENCY CHECK

### Issue #1: BALANCE CALCULATION INCONSISTENCY ⚠️ CRITICAL

**Problem:** CustomerDetail balance calculation is incomplete.

**Current State (CustomerDetail.tsx lines 101-110):**
```tsx
const { totalInvoiced, totalPaid, balance } = useMemo(() => {
  const totalInv = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalPay = receipts.reduce((sum, rec) => sum + (rec.amount || 0), 0);  // ⚠️ ONLY RECEIPTS!
  return {
    totalInvoiced: totalInv,
    totalPaid: totalPay,
    balance: totalInv - totalPay,
  };
}, [invoices, receipts]);
```

**Problem:** 
- Counts only `receipts` (daily collections) as paid
- Does NOT count `payments` (invoice-specific payments)
- Result: **Balance is WRONG** if customer has made invoice payments

**Example:**
- Invoice total: 1000
- Payments (invoices): 600
- Receipts (daily collection): 300
- Current calc: 1000 - 300 = 700 ❌ WRONG
- Correct calc: 1000 - (600 + 300) = 100 ✅

**Fix:** Include both payments AND receipts in totalPaid

**File:** [pages/CustomerDetail.tsx](pages/CustomerDetail.tsx#L101-L110)
**Action Required:** Modify balance calculation to include payments

---

### Issue #2: STATEMENT VIEW IGNORES RECEIPTS ⚠️ CRITICAL

**Problem:** The statement table in CustomerDetail only shows invoices and payments, not receipts.

**Current State (CustomerDetail.tsx lines 113-165):**
```tsx
const rows = [
  ...filteredInvoices.map((inv) => ({...})),  // ✅ Invoices shown
  ...filteredPayments.map((pay) => ({...})),  // ✅ Payments shown
  // ❌ NO RECEIPTS!
].sort((a, b) => a.date.getTime() - b.date.getTime());
```

**Impact:**
- Customer statement is incomplete
- Receipts from daily collection not visible in statement
- Closing balance appears wrong because missing receipt entries

**Fix:** Add receipts to statement rows

**File:** [pages/CustomerDetail.tsx](pages/CustomerDetail.tsx#L148-L165)
**Action Required:** Include receipts in statement calculation

---

### Issue #3: INVOICE TOTAL FIELD NAME AMBIGUITY ⚠️ MODERATE

**Problem:** Multiple helper functions check different field names for invoice total.

**Current State:**
- Dashboard.tsx `getInvoiceTotal()` checks: `.total` → `.grandTotal` → `.amount` → `.net` → `.totalAmount`
- Reports.tsx `getInvoiceTotal()` (same logic) - duplicated code
- InvoiceDetail.tsx uses `invoice.total` directly
- PaymentForm.tsx uses `invoice.total` directly

**File Locations:**
- [pages/Dashboard.tsx](pages/Dashboard.tsx#L18-L32) (lines 18-32)
- [pages/Reports.tsx](pages/Reports.tsx#L43-L56) (lines 43-56)

**Impact:**
- Defensive programming (good), but indicates possible schema inconsistency
- Suggests some invoices may have been migrated with different field names
- Should normalize to single field name

**Fix Options:**
1. Ensure all invoices have `.total` field (recommended)
2. Create single shared utility function
3. Add Firestore security rule to enforce `.total` field

**Recommendation:** Create utility function in [src/utils/invoiceUtils.ts](src/utils/invoiceUtils.ts) - NEW FILE

---

### Issue #4: PAYMENT METHOD TYPE INCONSISTENCY ⚠️ MODERATE

**Problem:** Payment/Receipt methods are defined inconsistently.

**Current State:**

**PaymentMethod (types.ts):**
```typescript
export type PaymentMethod =
  | 'كاش'              // Arabic for 'cash'
  | 'محفظة'            // Arabic for 'wallet'
  | 'إنستاباي'         // Instapay
  | 'تحويل بنكي'       // Bank transfer
  | 'أخرى';            // Other
```

**Receipt.method (types.ts):**
```typescript
method: 'cash' | 'transfer' | 'check' | 'wallet' | 'other';  // English!
```

**PaymentForm.tsx constants:**
```typescript
const PAYMENT_METHODS: PaymentMethod[] = [
  t('paymentMethodCash'),        // Gets i18n value
  t('paymentMethodWallet'),
  t('paymentMethodInstapay'),
  t('paymentMethodBank'),
  t('paymentMethodOther'),
];
```

**Impact:**
- Receipts use English method names
- Payments use Arabic method names
- Reports/filters may fail if comparing methods across both types

**Files Involved:**
- [types.ts](types.ts#L67-L72) - Payment type
- [types.ts](types.ts#L89-L103) - Receipt type
- [pages/PaymentForm.tsx](pages/PaymentForm.tsx#L25-L31) - Payment constants

**Fix:** Standardize on English method names across both types, use i18n for display only

---

### Issue #5: CASH TOTAL CALCULATION IN DAILY COLLECTION ⚠️ MINOR

**Problem:** DailyCollection assumes method === 'cash' for cash totals.

**Current State (DailyCollection.tsx):**
```tsx
const cash = receipts
  .filter((r) => r.method === 'cash')   // ✅ Correct
  .reduce((sum, r) => sum + r.amount, 0);
```

**Potential Issue:** If user enters method as 'Cash' (capital C) or 'CASH', it won't be counted.

**File:** [pages/DailyCollection.tsx](pages/DailyCollection.tsx#L75-L76)
**Risk:** Low (form enforces lowercase), but recommend validation

---

## 2.2 STOCK CONSISTENCY CHECK

### Issue #6: STOCK DOES NOT AUTO-UPDATE ON INVOICE ⚠️ BY DESIGN

**Current State:**
- Products have `.stock` field
- InvoiceForm allows selecting products
- **Stock is NOT decremented when invoice is created**

**Evidence:**
- Product.stock field exists: [types.ts](types.ts#L57)
- SaveInvoice() does not touch product stock: [firestoreService.ts](firestoreService.ts#L456-L475)
- No stock ledger collection created on invoice

**Is this intentional?** 
- Likely YES - user might sell product not in stock (backorder)
- Or might be lazy-implemented

**Recommendation:** Document explicitly in product
If automatic stock management is desired, implement:
1. Stock ledger collection: `companies/{cId}/stockLedger`
2. Stock reserve on invoice save
3. Stock deduct on delivery confirmation

**File:** [pages/InvoiceForm.tsx](pages/InvoiceForm.tsx#L1) - Document behavior

---

### Issue #7: STOCK DISPLAY CONSISTENCY

**Product List shows:**
- Stock value from product.stock

**Invoice Form shows:**
- Product dropdown with name + price
- Doesn't show stock level (user can't see if in stock)

**Recommendation:** Add optional "(x in stock)" indicator in invoice form product dropdown if implementing stock management

---

## 2.3 DATE/TIME CONSISTENCY CHECK

### Issue #8: DATE HANDLING IS INCONSISTENT ⚠️ MODERATE

**Problem:** App mixes string dates (ISO 8601) with Firestore Timestamps.

**Current State:**

**Invoice dates:**
```typescript
date: string;      // ISO 8601 format "2025-02-05"
dueDate: string;   // ISO 8601 format
```

**Payment dates:**
```typescript
date: string | unknown;  // Can be string OR Firestore Timestamp
```

**Receipt dates:**
```typescript
date: string;           // ISO 8601 local time
createdAt?: Date | unknown;  // Firestore Timestamp
```

**Date conversion utilities:**
- Dashboard.tsx: `toDateObject()` handles both
- Reports.tsx: `toDateValue()` handles both
- DailyCollection.tsx: `toLocalDate()` assumes string
- CustomerDetail.tsx: `toDateValue()` handles both

**Problem:** 
- Multiple similar conversion functions (DRY violation)
- Inconsistent storage format (some string, some Timestamp)
- Risk of timezone issues with local dates

**Files:** 
- [pages/Dashboard.tsx](pages/Dashboard.tsx#L31-L44)
- [pages/Reports.tsx](pages/Reports.tsx#L26-L37)
- [pages/DailyCollection.tsx](pages/DailyCollection.tsx#L14-L16)
- [pages/CustomerDetail.tsx](pages/CustomerDetail.tsx#L239-L250)

**Fix:** Create single `src/utils/dateUtils.ts` with canonical functions

---

### Issue #9: TIMEZONE HANDLING NOT EXPLICIT ⚠️ MODERATE

**Current State:**
- DailyCollection uses `toLocalDate()` which assumes browser timezone
- Dashboard/Reports use `toDateObject()` which converts Timestamps to Date
- No explicit timezone handling in settings

**Risk:** 
- App may show wrong date if user's machine timezone differs from company location
- Reports may include/exclude transactions based on browser timezone

**Recommendation:** 
- Add timezone to Settings
- Convert all date operations to use company timezone (not browser timezone)

---

## 2.4 UI CONSISTENCY CHECK

### Issue #10: LIST ROWS HAVE INCONSISTENT STYLES ⚠️ MINOR

**Problem:** Different pages use slightly different component for list rows.

**Current State:**
- Some pages use `<ListRow>` component
- Some pages use custom `<div className="list-row">` 
- Some pages use table `<table><tr><td>`

**Files:**
- InvoiceList.tsx: Uses div with className "list-row-*"
- CustomerList.tsx: Uses `<ListRow>` component
- ExpenseList.tsx: Uses table
- ProductList.tsx: Uses table

**Impact:** Inconsistent visual appearance across app

**Fix:** Standardize on single ListRow component or table component app-wide

---

### Issue #11: DUPLICATE FUNCTIONS FOR DATA NORMALIZATION ⚠️ MINOR

**Problem:** Invoice total getter functions are duplicated across Dashboard and Reports.

**Current Code:**
```tsx
// Dashboard.tsx lines 18-32
const getInvoiceTotal = (inv: Invoice) => { ... }

// Reports.tsx lines 43-56
const getInvoiceTotal = (inv: Invoice) => { ... }  // DUPLICATE!
```

**Fix:** Move to `src/utils/invoiceUtils.ts` and import

---

## 2.5 CURRENCY CONSISTENCY

### Issue #12: CURRENCY NOT CENTRALIZED ⚠️ MINOR

**Current State:**
- Currency stored in Settings.currency
- Used in display: `{settings.currency}`
- No validation on what values are allowed

**Risk:** User could enter "XYZ" and break formatting

**Recommendation:** Create enum of supported currencies or use ISO 4217 validation

---

---

## SUMMARY: CONSISTENCY ISSUES & FIXES

| Issue # | Severity | Category | Title | Fix Status |
|---------|----------|----------|-------|---|
| #1 | CRITICAL | Money | Balance calc excludes payments | NEEDS FIX |
| #2 | CRITICAL | Money | Statement ignores receipts | NEEDS FIX |
| #3 | MODERATE | Money | Invoice total field name ambiguity | Code only |
| #4 | MODERATE | Money | Payment method type inconsistency | NEEDS FIX |
| #5 | MINOR | Money | Cash total case-sensitivity | Validate |
| #6 | BY DESIGN | Stock | Stock not auto-updated | Document |
| #7 | MINOR | Stock | Stock not visible in invoice form | Enhance |
| #8 | MODERATE | Date | Date handling inconsistent | Refactor |
| #9 | MODERATE | Date | Timezone not explicit | Enhance |
| #10 | MINOR | UI | List row styles inconsistent | Refactor |
| #11 | MINOR | Code | Duplicate functions | Refactor |
| #12 | MINOR | Config | Currency not validated | Validate |

---

## 2.6 RECOMMENDED IMMEDIATE FIXES

### PRIORITY 1 - CRITICAL (Must fix before claiming stable):

**Fix #1: Add payments to balance calculation**
- File: [pages/CustomerDetail.tsx](pages/CustomerDetail.tsx#L101-L110)
- Lines: 101-110
- Change: Include `payments` array in balance calculation
- Estimated impact: HIGH (affects all customer statements)

**Fix #2: Add receipts to statement view**
- File: [pages/CustomerDetail.tsx](pages/CustomerDetail.tsx#L148-L165)
- Lines: 148-165
- Change: Include receipts in statement rows array
- Estimated impact: HIGH (affects statement accuracy)

**Fix #3: Normalize payment methods**
- Files: [types.ts](types.ts#L67-L72), [types.ts](types.ts#L93-L95), [pages/PaymentForm.tsx](pages/PaymentForm.tsx#L25-L31)
- Change: Use English method names everywhere, i18n for display only
- Estimated impact: MEDIUM (potential data consistency issue)

### PRIORITY 2 - MODERATE (Should fix):

**Fix #4: Create shared invoice total getter**
- New file: `src/utils/invoiceUtils.ts`
- Export: `getInvoiceTotal(invoice: Invoice): number`
- Update: Dashboard.tsx, Reports.tsx, other pages

**Fix #5: Create shared date conversion utility**
- New file: `src/utils/dateUtils.ts`
- Export: `toDateValue()`, `toIsoDate()`, etc.
- Remove duplicate functions from pages

**Fix #6: Standardize list row components**
- Audit all pages
- Use single `<ListRow>` or `<Table>` component consistently

---

## CONSISTENCY AUDIT SCORE

| Category | Status | Notes |
|----------|--------|-------|
| Money calculations | 🔴 FAILING | Balance calc broken, missing payments |
| Stock management | 🟡 INCOMPLETE | Working as-is but not documented |
| Date handling | 🟡 WORKING | Defensive but inconsistent |
| UI components | 🟡 WORKING | Multiple styles, not unified |
| Multi-tenancy | ✅ PASSING | All properly scoped by companyId |
| Type safety | ✅ PASSING | TypeScript strict mode |
| i18n coverage | ✅ PASSING | 796 keys, complete |

**Overall Score:** 🟡 PARTIALLY CONSISTENT - 2 critical issues must be fixed


# APPLE-LIKE CALM REDESIGN + SYSTEM AUDIT
## Audit Findings & Fix Plan

**Date:** February 5, 2026  
**Scope:** Full UI/UX redesign + functional audit WITHOUT breaking existing logic  
**Approach:** Free-first Firebase (Auth + Firestore only, no Cloud Functions)

---

## PART A: FREE-FIRST FIREBASE HARDENING

### A.1 firebase.json Configuration

**Current State:**
```json
{
  "functions": { "source": "functions", "runtime": "nodejs18" },  // ❌ REMOVE
  "hosting": { "public": "dist", ... },                            // ✅ KEEP
  "firestore": { "rules": "firestore.rules" },                     // ✅ KEEP
  "emulators": { 
    "functions": { "port": 5001 },  // ❌ REMOVE
    ...
  }
}
```

**Issues Found:**
1. ❌ `functions` config block present (but no Cloud Functions should be deployed)
2. ❌ `functions` emulator configured (no local development of Cloud Functions)
3. ✅ `hosting` correctly configured (dist folder)
4. ✅ `firestore` rules configured

**Fix Required:**
- Remove entire `"functions"` block
- Remove `"functions"` from emulators
- Document deploy command: `firebase deploy --only hosting,firestore:rules`

**Impact:** Low (this config was dormant; no actual functions deployed)

---

## PART B: UI KIT & HARDCODING ISSUES

### B.1 Hardcoded Arabic String Found

**Location:** [src/ui/ActionMenu.tsx](src/ui/ActionMenu.tsx#L56)

```tsx
// ❌ HARDCODED ARABIC
aria-label="خيارات"
```

**Fix Required:**
- Replace with: `aria-label={t('commonActionsMenu')}`  
- Key exists in ar.ts: `commonActionsMenu: 'قائمة الإجراءات'` ✅

**Impact:** Low (accessibility only)

---

### B.2 UI Components Status

**Current UI Layer:**
- ✅ `src/ui/ActionMenu.tsx` - exists, functional
- ✅ `src/ui/` folder exists with components
- ✅ AppShell.tsx handles RTL dir="rtl" 
- ⚠️ Consistent spacing/grid NOT enforced
- ⚠️ Mobile-first layout PARTIAL (desktop-first in some pages)
- ⚠️ Action bar on invoice pages needs modernization

**UI Kit Gaps:**
1. No centralized Button component (using HTML <button> + classes)
2. No centralized Card component 
3. No centralized Input/Select standardization
4. No ListRow component (using div + classes)
5. No SectionHeader component
6. Action bars (print/pdf/png/share) NOT in calm segmented toolbar style

**Fix Required:**
- Create/export standardized UI components from `src/ui/`
- Enforce consistent button, card, input styling
- Convert invoice action bar to segmented toolbar + overflow menu
- Enforce max-width + grid centering at AppShell level

**Impact:** Medium (requires component refactor)

---

## PART C: FUNCTIONAL FLOW AUDIT

### C.1 Invoices List & Detail

**Current State:**
- ✅ InvoiceList.tsx functional (pagination, filtering, search)
- ✅ InvoiceDetail.tsx functional (view, edit, delete, duplicate)
- ⚠️ Action buttons misaligned in mobile view
- ⚠️ Arabic layout broken in detail page (text direction issues)

**Issues Found:**
1. **Buttons misaligned:** Invoice list action buttons (⋯ menu) don't align properly in RTL mobile
2. **PDF/PNG export quality:** html2canvas scale not optimized for printing
   - Current: scale=1 (default)
   - Should be: scale=2 or 3 for 300+ DPI
3. **RTL text in PDF:** Text wrapping not correct for Arabic

**Fix Required:**
1. Use proper RTL flexbox (`flex-row-reverse` instead of manual positioning)
2. Increase html2canvas scale: `scale: 2` (2x resolution)
3. Add page margins to PDF output
4. Test Arabic PDF rendering

**Impact:** Medium (UI alignment + export quality)

---

### C.2 Products & Stock

**Current State:**
- ✅ ProductList.tsx functional (list, create, edit, delete)
- ✅ Stock field displayed in list and picker
- ⚠️ Stock list and detail show DIFFERENT values (cache mismatch?)
- ⚠️ Product action menu overlay collision (z-index issues)
- ⚠️ Stock NOT auto-deducted on invoice (intentional design)

**Issues Found:**
1. **Stock mismatch:** ProductList shows stock=10, but ProductForm (edit) shows stock=5
   - Root cause: Data fetching order or cache invalidation
2. **Action menu overlay:** Menu appears behind list items (z-index: 10 < parent's z-index)
3. **Stock calculation:** No automatic deduction on invoice creation

**Status Clarification:**
- Stock auto-deduction documented as INTENTIONAL (no Cloud Functions, manual stock management)
- If stock ledger system exists, it's NOT fully integrated
- This is BY DESIGN for free-tier architecture

**Fix Required:**
1. Audit data fetching in ProductForm vs ProductList (same source)
2. Fix z-index on action menu portal
3. Document stock management as "manual" in Product UI

**Impact:** Medium (cache + z-index)

---

### C.3 Customers & Ledger

**Current State:**
- ✅ CustomerList.tsx functional (list, create, edit, delete)
- ❌ Selecting a customer does NOT open details page
  - Currently: Click customer → goes to edit form
  - Should be: Click customer → open read-only detail page with tabs
- ❌ No customer ledger view
  - Missing: Invoices, payments, receipts, outstanding balance, timeline

**Issues Found:**
1. **No customer detail/ledger page:** CustomerDetail.tsx exists but routing missing or incomplete
2. **No customer edit from detail:** Can't edit customer from detail page
3. **Missing ledger view:** No unified view of all transactions for customer

**Fix Required:**
1. Verify CustomerDetail.tsx routing (`/app/customers/:id`)
2. Add "Ledger" tab in CustomerDetail showing:
   - Invoices (all, with status)
   - Payments (received)
   - Receipts (daily collections)
   - Outstanding balance
   - Timeline of actions
3. Add "Edit" button in CustomerDetail that opens CustomerForm modal/page

**Impact:** Medium (routing + UI additions)

---

### C.4 Daily Collection

**Current State:**
- ✅ DailyCollection.tsx exists and functional
- ✅ Features: Select customer, amount, payment method, notes, date
- ✅ Shows daily totals and list of entries
- ✅ Uses ReceiptForm (or similar) for data entry

**Status:** ✅ WORKING (no issues found)

---

### C.5 Expenses & Categories

**Current State:**
- ✅ ExpenseList.tsx functional
- ✅ ExpenseForm.tsx functional
- ⚠️ Categories are NOT fully CRUD per company
  - Category dropdown might be hardcoded or stored globally
  - Not clear if categories are per-company or platform-wide

**Issues Found:**
1. **Categories management unclear:** Are expense categories:
   - Hardcoded in code? (Bad)
   - Stored in Firestore but platform-wide? (Bad)
   - Stored per company? (Good)

**Fix Required:**
1. Audit expense category storage (`expenseCategories` collection)
2. Ensure categories are scoped to `companies/{cId}/expenseCategories`
3. Add category management UI (create/edit/delete) in Settings or Expense page
4. If hardcoded, migrate to Firestore

**Impact:** Low-Medium (depends on current implementation)

---

### C.6 Reports & Dashboard

**Current State:**
- ✅ Dashboard.tsx functional (basic charts)
- ✅ Reports.tsx functional (period filtering)
- ⚠️ Dashboard missing period filters
  - Currently: Shows "Daily" data only
  - Should support: Daily / Weekly / Monthly / Custom range
- ⚠️ Totals not validated
  - Risk: Invoices total might not match payment + receipt + outstanding

**Issues Found:**
1. **Dashboard period selection:** No daily/weekly/monthly/custom filters
2. **Report validation:** No double-counting check (invoice counted twice?)
3. **Query consistency:** Dashboard and Reports might use different calculations

**Fix Required:**
1. Add period filter to Dashboard (same as DailyCollection)
2. Verify total calculation: Invoiced = Paid + Outstanding
3. Cross-validate Reports tab with Dashboard (same data source)
4. Add validation query: `SUM(invoices.total) == SUM(payments) + SUM(outstanding_balance)`

**Impact:** Medium (validation + dashboard UI)

---

## SUMMARY OF CHANGES REQUIRED

| Task | Category | Effort | Priority | Status |
|------|----------|--------|----------|--------|
| A.1: Remove functions from firebase.json | Config | 5 min | CRITICAL | 🔴 TODO |
| A.2: Fix hardcoded aria-label in ActionMenu | i18n | 5 min | CRITICAL | 🔴 TODO |
| B.1: Standardize UI components (Button, Card, etc.) | UI Kit | 2-3h | HIGH | 🟡 PARTIAL |
| B.2: Create segmented toolbar for invoice actions | UI Kit | 1h | HIGH | 🔴 TODO |
| C.1: Fix invoice button RTL alignment | UI | 30 min | HIGH | 🔴 TODO |
| C.2: Optimize PDF export (scale, margins, RTL) | UI | 1h | MEDIUM | 🔴 TODO |
| C.3: Fix product stock cache/display mismatch | Data | 30 min | MEDIUM | 🔴 TODO |
| C.3b: Fix action menu z-index | UI | 15 min | MEDIUM | 🔴 TODO |
| C.4: Verify/add CustomerDetail routing | Routing | 30 min | HIGH | 🔴 TODO |
| C.4b: Add customer ledger view | UI | 1.5h | MEDIUM | 🔴 TODO |
| C.5: Audit/fix expense categories CRUD | Data | 1h | MEDIUM | 🔴 TODO |
| C.6: Add Dashboard period filters | UI | 1h | MEDIUM | 🔴 TODO |
| C.6b: Validate invoice/payment totals | Logic | 30 min | MEDIUM | 🔴 TODO |

**Total Effort:** ~12 hours (with testing)

---

## DEPLOYMENT CHECKLIST

### Before Deploying:
- [ ] firebase.json cleaned (no functions config)
- [ ] Build passes: `npm run build`
- [ ] No hardcoded Arabic strings (search for `aria-label="[ء-ي]"`)
- [ ] All i18n keys use `t()` function
- [ ] Real Firestore used (mock disabled in auth/firebase.ts)
- [ ] Multi-tenancy verified (all queries scoped by companyId)

### Deploy Command:
```bash
firebase deploy --only hosting,firestore:rules
```

### Post-Deploy Verification:
- [ ] App loads without errors
- [ ] Login works (real Firebase Auth)
- [ ] Invoice list loads
- [ ] PDF export works and renders correctly
- [ ] Arabic RTL displays correctly
- [ ] No "??????" characters in UI

---

## NOTES

- **Stock auto-deduction:** Marked as INTENTIONAL (by-design for free-tier, no Cloud Functions)
- **Real Firebase:** Confirmed in use (no mock mode detected)
- **Multi-tenancy:** Verified (companyId scoping throughout)
- **i18n:** 796+ keys defined, but 1 hardcoded string found in ActionMenu


# QUICK START — Customer Payments Implementation

**Status:** Ready to execute  
**Phases:** 7 sequential steps  
**Total Time:** 2-3 days focused work  
**Risk:** Low

---

## 🎯 What You're Building

```
┌─────────────────────────────────────────────┐
│  PHASE 1: Fix "??????" text bug             │  15 min
├─────────────────────────────────────────────┤
│  PHASE 2: Define receipts collection        │  30 min (planning)
├─────────────────────────────────────────────┤
│  PHASE 3: Customer detail page tabs         │  45 min
├─────────────────────────────────────────────┤
│  PHASE 4: Payment service + forms           │  1 hour
├─────────────────────────────────────────────┤
│  PHASE 5: Customer statement (كشف الحساب)  │  1 hour
├─────────────────────────────────────────────┤
│  PHASE 6: Daily collection page             │  1.5 hours
├─────────────────────────────────────────────┤
│  PHASE 7: QA testing                        │  1.5 hours
└─────────────────────────────────────────────┘
        Total: ~11 hours
```

---

## 🔴 PHASE 1: Fix "??????" (DO THIS FIRST!)

**File:** `components/LanguageToggle.tsx`

**Problem:** Lines 27, 29 have corrupted Arabic text

**Current:**
```tsx
aria-label="???????"
>
  ???????
```

**Solution:**
Replace entire file with i18n keys. See detailed code in main document.

**Keys to add to `src/i18n/ar.ts`:**
```typescript
languageArabic: 'العربية',
languageArabicShort: 'AR',
languageEnglish: 'الإنجليزية',
languageEnglishShort: 'EN',
```

**Verify:** Button shows "AR" and "EN" ✓

---

## 📊 PHASE 2: Firestore Schema (Read-Only)

**New Collection:** `/companies/{companyId}/receipts/{receiptId}`

**Fields:**
```typescript
{
  id: string;                 // doc ID
  companyId: string;          // company scope
  customerId: string;         // link to customer
  customerName: string;       // snapshot
  amount: number;             // positive value
  date: string;               // ISO 8601 local
  method: 'cash' | 'transfer' | 'check' | 'wallet' | 'other';
  note?: string;              // optional
  invoiceId?: string;         // optional link
  invoiceNumber?: string;     // snapshot
  createdAt: Timestamp;       // server time
  createdBy: string;          // user email
}
```

**No changes to existing collections.** This is additive only.

---

## 👥 PHASE 3: CustomerDetail Page Enhancements

**File:** `pages/CustomerDetail.tsx` (already exists, ~406 lines)

**Add:**
1. Import receipts service
2. Fetch receipts on load
3. Add 3 tabs: Invoices | Payments | Statement
4. Calculate balance (total_invoiced - total_paid)
5. Show balance in header

**Keys to add:**
```typescript
customerTabInvoices: 'الفواتير',
customerTabPayments: 'المدفوعات',
customerTabStatement: 'كشف الحساب',
customerBalance: 'الرصيد',
customerTotalInvoiced: 'إجمالي الفواتير',
customerTotalPaid: 'إجمالي المدفوع',
```

---

## 💳 PHASE 4: Receipts Service

**New File:** `services/receiptsService.ts`

Exports 2 main functions:
- `createReceipt()` — save new payment
- `getReceiptsByCustomerId()` — fetch payments for customer
- `getReceiptsByDateRange()` — fetch payments for date range

**Update:** `types.ts` — add Receipt interface

**Update:** `PaymentForm.tsx` — use createReceipt instead of inline save

See full code in main document.

---

## 📈 PHASE 5: Statement Tab (كشف الحساب)

**Add to:** `pages/CustomerDetail.tsx`

New tab shows transaction timeline:
- Date | Description | Amount | Running Balance

Example:
```
| 2025-02-01 | Invoice #INV-001      | +1000 | 1000  |
| 2025-02-05 | Payment (cash)        | -300  | 700   |
| 2025-02-10 | Payment (transfer)    | -200  | 500   |
```

Filters: All Time / Year-to-Date / Last 90 Days

**Keys to add:**
```typescript
statementTab: 'كشف الحساب',
statementAll: 'كل الفترة',
statementYTD: 'من بداية السنة',
statement90Days: 'آخر 90 يوم',
```

---

## 📱 PHASE 6: Daily Collection Page

**New File:** `pages/DailyCollection.tsx`

**New Route:** `/daily-collection`

**Add to nav:** Sidebar or mobile menu

Shows:
- 3 summary cards: Cash total | Non-cash total | Grand total
- List of all payments for selected date
- Date switcher (prev/next/today)
- "New Payment" button

**Keys to add:**
```typescript
dailyCollectionTitle: 'التحصيل اليومي',
dailyCollectionCash: 'كاش',
dailyCollectionNonCash: 'غير كاش',
dailyCollectionTotal: 'الإجمالي',
dailyCollectionNewPayment: 'دفعة جديدة',
```

---

## ✅ PHASE 7: QA Testing

**Manual Tests to Perform:**

### Test 1: Create Receipt & Check Balance
1. Go to Customers page
2. Click customer name
3. Note current balance
4. Click "New Payment"
5. Enter amount, date, method
6. Submit
7. Verify balance updated correctly

### Test 2: View Statement
1. CustomerDetail page
2. Click "Statement" tab
3. Verify transactions appear with dates
4. Verify running balance is correct

### Test 3: Daily Collection
1. Navigate to `/daily-collection`
2. Check today's total
3. Switch to yesterday
4. Verify list updates
5. Add new payment
6. Verify it appears in today's list

### Test 4: Data Integrity
- [ ] All amounts are positive
- [ ] Dates use local time (not UTC)
- [ ] companyId is correct in Firestore
- [ ] No console errors

---

## 🚀 GO-TIME CHECKLIST

Before you start:

- [ ] Read main document (`PHASE_CUSTOMER_PAYMENTS_IMPLEMENTATION.md`)
- [ ] Have VS Code open with workspace
- [ ] Firebase Console tab open
- [ ] Understand Firestore structure

### Phase-by-Phase

#### Phase 1 (15 min)
```bash
# Edit components/LanguageToggle.tsx
# Add keys to src/i18n/ar.ts
npm run build  # should pass
```

#### Phase 2 (planning only)
```
Review Firestore schema in main document
No code changes yet
```

#### Phase 3 (45 min)
```bash
# Edit pages/CustomerDetail.tsx
# - Import receiptsService (stub for now)
# - Add state for receipts
# - Add tab UI
# - Calculate balance
npm run build
npm run dev  # test in browser
```

#### Phase 4 (1 hour)
```bash
# Create services/receiptsService.ts (copy from main doc)
# Update types.ts (add Receipt interface)
# Update PaymentForm.tsx to use createReceipt
npm run build
# Test: create payment in browser → should save to Firestore
```

#### Phase 5 (1 hour)
```bash
# Add StatementTab component to CustomerDetail
# Add date range logic
# Add running balance calculation
npm run build
npm run dev  # verify statement tab works
```

#### Phase 6 (1.5 hours)
```bash
# Create pages/DailyCollection.tsx
# Add route to routes.ts
# Add nav item to sidebar
npm run build
npm run dev  # verify page loads
```

#### Phase 7 (1.5 hours)
```bash
# Manual testing following test cases
# Check Firestore Console for data
# Verify all calculations correct
```

---

## 📌 KEY POINTS

### Data Flow
```
User submits payment → PaymentForm
                    ↓
                createReceipt() in receiptsService
                    ↓
              Saves to receipts collection
                    ↓
           CustomerDetail fetches + calculates
                    ↓
             Balance updates automatically
```

### Important Files

| File | Purpose | Status |
|------|---------|--------|
| `components/LanguageToggle.tsx` | Fix text bug | Create/Update |
| `services/receiptsService.ts` | Payment queries | Create |
| `pages/CustomerDetail.tsx` | Detail + tabs | Update |
| `pages/DailyCollection.tsx` | Daily tracking | Create |
| `types.ts` | Receipt interface | Update |
| `src/i18n/ar.ts` | Translations | Update |
| `src/routes.ts` | New route | Update |

### No Breaking Changes
✓ Existing data untouched  
✓ No Invoice changes  
✓ No Customer changes  
✓ No migrations needed  
✓ No new npm packages  

---

## 🆘 Troubleshooting

### "Receipts not saving"
→ Check Firestore Console `/companies/{id}/receipts` collection  
→ Verify security rules allow writes  

### "Balance calculation wrong"
→ Manual math: total_invoiced - total_paid = balance  
→ Verify receipts are fetching correctly

### "Date shows wrong timezone"
→ All dates must be ISO 8601 local time (YYYY-MM-DD)  
→ Never use Date.toUTCString()

### "Types error: Receipt not found"
→ Make sure types.ts has Receipt interface  
→ Run `npm run build` to check errors

---

## 📚 Full Documentation

See: `PHASE_CUSTOMER_PAYMENTS_IMPLEMENTATION.md`

Contains:
- All 7 phases with complete code
- Firestore schema details
- Security rules
- Test scenarios
- Complete i18n key list

---

**Ready? Start with Phase 1! Fix the "??????" bug first, then proceed sequentially. 🚀**

# I18N KEYS REFERENCE & CHECKLIST

**Document:** Complete list of all new i18n keys needed for Customer Payments implementation  
**File to update:** `src/i18n/ar.ts`  
**Total new keys:** 35  

---

## 📝 COMPLETE KEY LIST

### Language Toggle (Phase 1)
```typescript
languageArabic: 'العربية',
languageArabicShort: 'AR',
languageEnglish: 'الإنجليزية',
languageEnglishShort: 'EN',
```

### Customer Detail (Phase 3)
```typescript
customerTabInvoices: 'الفواتير',
customerTabPayments: 'المدفوعات',
customerTabStatement: 'كشف الحساب',
customerBalance: 'الرصيد',
customerTotalInvoiced: 'إجمالي الفواتير',
customerTotalPaid: 'إجمالي المدفوع',
customerNoInvoices: 'لا توجد فواتير لهذا العميل.',
customerNoPayments: 'لم يتم تسجيل أي مدفوعات بعد.',
```

### Payment Methods (Phase 4)
```typescript
paymentMethodCash: 'كاش',
paymentMethodTransfer: 'تحويل بنكي',
paymentMethodCheck: 'شيك',
paymentMethodWallet: 'محفظة',
paymentMethodOther: 'أخرى',
paymentReceipt: 'إيصال دفع',
paymentDate: 'تاريخ الدفع',
paymentAmountLabel: 'المبلغ',
paymentNote: 'ملاحظة (اختياري)',
paymentSelectInvoice: 'ربط بفاتورة (اختياري)',
```

### Statement Tab (Phase 5)
```typescript
statementTab: 'كشف الحساب',
statementAll: 'كل الفترة',
statementYTD: 'من بداية السنة',
statement90Days: 'آخر 90 يوم',
statementDate: 'التاريخ',
statementDescription: 'البيان',
statementAmount: 'المبلغ',
statementBalance: 'الرصيد',
statementInvoice: 'فاتورة',
statementPayment: 'دفعة',
statementNoTransactions: 'لا توجد معاملات خلال هذه الفترة.',
```

### Daily Collection (Phase 6)
```typescript
dailyCollectionTitle: 'التحصيل اليومي',
dailyCollectionSubtitle: 'متابعة الوارد اليومي من المدفوعات',
dailyCollectionToday: 'اليوم',
dailyCollectionCash: 'كاش',
dailyCollectionNonCash: 'غير كاش',
dailyCollectionTotal: 'الإجمالي',
dailyCollectionNewPayment: 'دفعة جديدة',
dailyCollectionEmpty: 'لا توجد مدفوعات لهذا اليوم.',
```

---

## ✅ IMPLEMENTATION CHECKLIST

### Before Starting
- [ ] Opened `src/i18n/ar.ts` file
- [ ] Backed up the file (git commit before changes)
- [ ] Read all sections of keys above

### Phase 1 — Language Toggle
- [ ] Added 4 language keys to ar.ts
- [ ] Saved ar.ts
- [ ] Ran `npm run build` (no errors)
- [ ] Checked button shows "AR" in browser

### Phase 2 — Planning Only
- [ ] Reviewed Firestore schema in main doc
- [ ] Understood receipts collection structure
- [ ] No code changes needed yet

### Phase 3 — Customer Detail
- [ ] Added 8 customer detail keys to ar.ts
- [ ] Updated CustomerDetail.tsx with tabs
- [ ] Added balance calculation
- [ ] Tested tab switching in browser

### Phase 4 — Receipts Service
- [ ] Added 6 payment method keys to ar.ts
- [ ] Created receiptsService.ts
- [ ] Updated types.ts with Receipt interface
- [ ] Updated PaymentForm.tsx
- [ ] Tested creating a payment
- [ ] Verified receipt in Firestore Console

### Phase 5 — Statement Tab
- [ ] Added 11 statement keys to ar.ts
- [ ] Created StatementTab component
- [ ] Tested statement calculation
- [ ] Verified date range filters work

### Phase 6 — Daily Collection
- [ ] Added 8 daily collection keys to ar.ts
- [ ] Created pages/DailyCollection.tsx
- [ ] Added route to routes.ts
- [ ] Added nav item
- [ ] Tested page loads
- [ ] Tested date switching

### Phase 7 — QA Testing
- [ ] All 35 keys present in ar.ts
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Balance calculations correct
- [ ] All text displays in Arabic (no "??? keys")
- [ ] Dark mode works
- [ ] RTL layout correct

---

## 🔍 VERIFICATION STEPS

### Step 1: Count Keys
```bash
# In ar.ts, search for these 35 keys:
# languageArabic, languageArabicShort, languageEnglish, languageEnglishShort
# customerTabInvoices, customerTabPayments, customerTabStatement, ...
# etc.
```

**Expected count:** 35 new keys (+ existing ~250 keys)

### Step 2: Build Test
```bash
npm run build
```

**Expected result:** 0 errors, 0 warnings

### Step 3: Browser Test
```bash
npm run dev
# Navigate to Customers page
# Click customer
# Check tabs show "الفواتير" "المدفوعات" "كشف الحساب"
# Switch to Daily Collection
# Check header shows "التحصيل اليومي"
```

### Step 4: Check Firestore
```
Firebase Console → Firestore Database
→ companies/{yourCompanyId}/receipts
→ Should see receipts collection with data
```

### Step 5: Check Translations
Search for "???????" in entire codebase:
```bash
grep -r "??????" .
# Should return: 0 matches
```

---

## 📋 EXACT INSERT LOCATION IN ar.ts

Add all 35 new keys to `src/i18n/ar.ts` in the appropriate logical sections.

### Current ar.ts Structure (Line Reference)

```
Lines 1-50:        App basics (appName, commonSave, etc.)
Lines 51-100:      Settings & loading
Lines 101-150:     Login
Lines 151-200:     Navigation & roles
Lines 201-250:     Search & commands
Lines 251-300:     Dashboard
Lines 301-350:     Reports
Lines 351-400:     Invoices
Lines 401-450:     Products
Lines 451-500:     Expenses
Lines 501-550:     Customers (← ADD CUSTOMER KEYS HERE)
Lines 551-571:     END OF FILE
```

### Best Practice: Add at End

To avoid conflicts, add all 35 new keys at the very end of the file:

```typescript
// END OF EXISTING KEYS (around line 571)

// === CUSTOMER PAYMENTS & DAILY COLLECTION ===
// Phase 1: Language Toggle
languageArabic: 'العربية',
languageArabicShort: 'AR',
languageEnglish: 'الإنجليزية',
languageEnglishShort: 'EN',

// Phase 3: Customer Detail
customerTabInvoices: 'الفواتير',
customerTabPayments: 'المدفوعات',
// ... rest of keys

// MAKE SURE TO ADD COMMA AFTER LAST KEY!
}; // <- closing brace
```

---

## 🎯 KEY-BY-KEY USAGE REFERENCE

| Key | Used In | Context |
|-----|---------|---------|
| `languageArabic` | LanguageToggle | aria-label for AR button |
| `languageArabicShort` | LanguageToggle | Button text "AR" |
| `languageEnglish` | LanguageToggle | aria-label for EN button |
| `languageEnglishShort` | LanguageToggle | Button text "EN" |
| `customerTabInvoices` | CustomerDetail | Tab label |
| `customerTabPayments` | CustomerDetail | Tab label |
| `customerTabStatement` | CustomerDetail | Tab label |
| `customerBalance` | CustomerDetail | Header balance display |
| `customerTotalInvoiced` | CustomerDetail | Stat card title |
| `customerTotalPaid` | CustomerDetail | Stat card title |
| `customerNoInvoices` | CustomerDetail | Empty state (Invoices tab) |
| `customerNoPayments` | CustomerDetail | Empty state (Payments tab) |
| `paymentMethodCash` | PaymentForm | Method option |
| `paymentMethodTransfer` | PaymentForm | Method option |
| `paymentMethodCheck` | PaymentForm | Method option |
| `paymentMethodWallet` | PaymentForm | Method option |
| `paymentMethodOther` | PaymentForm | Method option |
| `paymentReceipt` | PaymentForm | Form title |
| `paymentDate` | PaymentForm | Input label |
| `paymentAmountLabel` | PaymentForm | Input label |
| `paymentNote` | PaymentForm | Input label |
| `paymentSelectInvoice` | PaymentForm | Select label |
| `statementTab` | CustomerDetail | Tab label |
| `statementAll` | StatementTab | Filter button |
| `statementYTD` | StatementTab | Filter button |
| `statement90Days` | StatementTab | Filter button |
| `statementDate` | StatementTab | Column header |
| `statementDescription` | StatementTab | Column header |
| `statementAmount` | StatementTab | Column header |
| `statementBalance` | StatementTab | Column header |
| `statementInvoice` | StatementTab | Transaction type |
| `statementPayment` | StatementTab | Transaction type |
| `statementNoTransactions` | StatementTab | Empty state |
| `dailyCollectionTitle` | DailyCollection | Page title |
| `dailyCollectionSubtitle` | DailyCollection | Page subtitle |
| `dailyCollectionToday` | DailyCollection | Button label |
| `dailyCollectionCash` | DailyCollection | Card title |
| `dailyCollectionNonCash` | DailyCollection | Card title |
| `dailyCollectionTotal` | DailyCollection | Card title |
| `dailyCollectionNewPayment` | DailyCollection | Button label |
| `dailyCollectionEmpty` | DailyCollection | Empty state |

---

## 🚨 COMMON MISTAKES TO AVOID

### ❌ Mistake 1: Missing Commas
```typescript
// WRONG
statementPayment: 'دفعة',
statementNoTransactions: 'لا توجد معاملات'  // ← NO COMMA!
```

Fix: Add comma after each key
```typescript
statementPayment: 'دفعة',
statementNoTransactions: 'لا توجد معاملات',
```

### ❌ Mistake 2: Incorrect Closing
```typescript
// WRONG - Missing brace
languageArabic: 'العربية',
```

Fix: Close object properly
```typescript
// ... last key ...
dailyCollectionEmpty: 'لا توجد مدفوعات لهذا اليوم.',
}; // ← MUST HAVE CLOSING BRACE
```

### ❌ Mistake 3: Duplicate Keys
If a key exists, don't add it twice. Search first:
```bash
grep -n "customerBalance" src/i18n/ar.ts
# If found, don't add again
```

### ❌ Mistake 4: Wrong Character Encoding
Ensure file is **UTF-8**. Set in VS Code:
- Bottom right: Click "UTF-8"
- Should show encoding as "UTF-8"

### ✅ Correct Approach
1. Open `src/i18n/ar.ts`
2. Go to **END of file** (before closing `};`)
3. Add blank line
4. Paste all 35 keys
5. Make sure each has comma
6. Make sure file ends with `};`
7. Save (Ctrl+S)
8. Run `npm run build`
9. Verify 0 errors

---

## 📦 EASY COPY-PASTE VERSION

Here are all 35 keys ready to copy-paste at end of ar.ts:

```typescript
  // === CUSTOMER PAYMENTS & DAILY COLLECTION ===
  
  // Phase 1: Language Toggle
  languageArabic: 'العربية',
  languageArabicShort: 'AR',
  languageEnglish: 'الإنجليزية',
  languageEnglishShort: 'EN',
  
  // Phase 3: Customer Detail
  customerTabInvoices: 'الفواتير',
  customerTabPayments: 'المدفوعات',
  customerTabStatement: 'كشف الحساب',
  customerBalance: 'الرصيد',
  customerTotalInvoiced: 'إجمالي الفواتير',
  customerTotalPaid: 'إجمالي المدفوع',
  customerNoInvoices: 'لا توجد فواتير لهذا العميل.',
  customerNoPayments: 'لم يتم تسجيل أي مدفوعات بعد.',
  
  // Phase 4: Payment Methods
  paymentMethodCash: 'كاش',
  paymentMethodTransfer: 'تحويل بنكي',
  paymentMethodCheck: 'شيك',
  paymentMethodWallet: 'محفظة',
  paymentMethodOther: 'أخرى',
  paymentReceipt: 'إيصال دفع',
  paymentDate: 'تاريخ الدفع',
  paymentAmountLabel: 'المبلغ',
  paymentNote: 'ملاحظة (اختياري)',
  paymentSelectInvoice: 'ربط بفاتورة (اختياري)',
  
  // Phase 5: Statement Tab
  statementTab: 'كشف الحساب',
  statementAll: 'كل الفترة',
  statementYTD: 'من بداية السنة',
  statement90Days: 'آخر 90 يوم',
  statementDate: 'التاريخ',
  statementDescription: 'البيان',
  statementAmount: 'المبلغ',
  statementBalance: 'الرصيد',
  statementInvoice: 'فاتورة',
  statementPayment: 'دفعة',
  statementNoTransactions: 'لا توجد معاملات خلال هذه الفترة.',
  
  // Phase 6: Daily Collection
  dailyCollectionTitle: 'التحصيل اليومي',
  dailyCollectionSubtitle: 'متابعة الوارد اليومي من المدفوعات',
  dailyCollectionToday: 'اليوم',
  dailyCollectionCash: 'كاش',
  dailyCollectionNonCash: 'غير كاش',
  dailyCollectionTotal: 'الإجمالي',
  dailyCollectionNewPayment: 'دفعة جديدة',
  dailyCollectionEmpty: 'لا توجد مدفوعات لهذا اليوم.',
```

---

## ✨ FINAL CHECKLIST

- [ ] Counted: 35 new keys to add
- [ ] Opened: src/i18n/ar.ts
- [ ] Located: End of file before closing brace
- [ ] Copied: All 35 keys above
- [ ] Pasted: At end of ar.ts
- [ ] Verified: File ends with `};`
- [ ] Verified: Each key has comma
- [ ] Verified: No duplicate keys
- [ ] Saved: File (Ctrl+S)
- [ ] Built: `npm run build` → 0 errors
- [ ] Checked: No TypeScript errors
- [ ] Tested: Keys render in UI (no "undefined")

---

**All set! Paste the keys and move to Phase 1 implementation. 🚀**

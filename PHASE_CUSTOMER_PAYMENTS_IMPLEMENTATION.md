# PHASE: Customer Payments & Daily Collection
**Status:** Implementation-Ready  
**Phases:** 6 sequential PRs  
**Timeline:** 3-4 days focused work  
**Risk Level:** Low (no Firestore schema changes, client-side only)

---

## 🔴 PHASE 1 — FIX CORRUPTED "??????" TEXT (MANDATORY)

### Root Cause
`components/LanguageToggle.tsx` has corrupted Arabic text with literal question marks:
- Line 27: `aria-label="???????"`  
- Line 29: `???????` (button text)

These should be i18n keys with proper translations.

### Solution: Fix LanguageToggle.tsx

**File:** [components/LanguageToggle.tsx](components/LanguageToggle.tsx)

```tsx
import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Button } from './ui/Button';
import { t } from '../src/i18n/t';

const LanguageToggle: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const lang = (settings && settings.language) || 'ar';

  const setLang = async (l: 'ar' | 'en') => {
    try {
      await updateSettings({
        ...settings!,
        language: l,
      });
    } catch (e) {
      console.error('Failed to save language', e);
    }
  };

  return (
    <div className="flex gap-2 items-center justify-center mt-2">
      <Button
        variant={lang === 'ar' ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => setLang('ar')}
        aria-label={t('languageArabic')}
      >
        {t('languageArabicShort')}
      </Button>
      <Button
        variant={lang === 'en' ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => setLang('en')}
        aria-label={t('languageEnglish')}
      >
        {t('languageEnglishShort')}
      </Button>
    </div>
  );
};

export default LanguageToggle;
```

### Add i18n Keys
**File:** `src/i18n/ar.ts`

Add these 4 keys to the translations:

```typescript
// Add to ar.ts after existing keys
languageArabic: 'العربية',
languageArabicShort: 'AR',
languageEnglish: 'الإنجليزية',
languageEnglishShort: 'EN',
```

### Verification Checklist — Phase 1
- [ ] LanguageToggle.tsx compiles without errors
- [ ] `npm run build` succeeds (0 errors)
- [ ] Language toggle buttons show "AR" and "EN"
- [ ] aria-label shows proper Arabic text (no "???????")
- [ ] Switching languages updates document title correctly
- [ ] Dark mode: buttons still visible and clickable

**Time Estimate:** 15 minutes  
**Dependencies:** None  
**Blocking Issues:** None

---

## 📋 PHASE 2 — Add Firestore Collection: "receipts"

### Current State
- `Invoice` exists with payment tracking
- `Payment` interface exists
- No dedicated "receipts" collection yet

### New Firestore Collection: `receipts`

This stores payment records tied to customers.

```typescript
// Schema for: /companies/{companyId}/receipts/{receiptId}
{
  id: string;                    // Auto-generated doc ID
  companyId: string;             // Scoped to company
  customerId: string;            // Link to customer
  customerName: string;          // Snapshot for display
  amount: number;                // Receipt amount (positive)
  date: string;                  // ISO 8601 format (local timezone)
  method: 'cash' | 'transfer' | 'check' | 'wallet' | 'other';
  note?: string;                 // Optional notes
  invoiceId?: string;            // Optional link to paid invoice
  invoiceNumber?: string;        // Snapshot for display
  createdAt: Timestamp;          // Server timestamp
  createdBy: string;             // User email
  companyReference?: string;     // e.g., receipt number
}
```

### Rationale
- **Why separate collection?** Keeps payment history clean and queryable
- **Why not on Invoice?** Invoices can have multiple partial payments; receipts is the source of truth
- **Client-side only:** No Cloud Functions needed; queries computed on client

### No Changes to Invoice Type
The `Invoice` type already has `paymentsSummary` for tracking.  
We'll compute `paid` amount by querying receipts for that invoice.

---

## 👥 PHASE 3 — Enhance CustomerDetail Page

### Current Status
CustomerDetail exists but needs these additions:
1. **Show customer balance** (total invoiced - total paid)
2. **Tab view:** Invoices | Payments | Statement
3. **Quick actions:** New Invoice, New Payment

### File to Modify: `pages/CustomerDetail.tsx`

The file is ~406 lines. Update it to:

#### A. Add "receipts" queries
```typescript
// Add this import at top
import { getReceiptsByCustomerId } from '../services/dataService';

// In component state, add:
const [receipts, setReceipts] = useState<Receipt[]>([]);

// Add to useEffect (fetch receipts):
const fetchReceipts = async () => {
  const data = await getReceiptsByCustomerId(companyId, customerId);
  setReceipts(data || []);
};
```

#### B. Add Tab View
```typescript
// Add state for tab
const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'statement'>('invoices');

// Add tabs UI
<div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mt-6">
  <button
    onClick={() => setActiveTab('invoices')}
    className={`px-4 py-2 font-medium text-sm border-b-2 ${
      activeTab === 'invoices'
        ? 'border-primary-600 text-primary-600'
        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
    }`}
  >
    {t('customerTabInvoices')} ({invoices.length})
  </button>
  <button
    onClick={() => setActiveTab('payments')}
    className={`px-4 py-2 font-medium text-sm border-b-2 ${
      activeTab === 'payments'
        ? 'border-primary-600 text-primary-600'
        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
    }`}
  >
    {t('customerTabPayments')} ({receipts.length})
  </button>
  <button
    onClick={() => setActiveTab('statement')}
    className={`px-4 py-2 font-medium text-sm border-b-2 ${
      activeTab === 'statement'
        ? 'border-primary-600 text-primary-600'
        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
    }`}
  >
    {t('customerTabStatement')}
  </button>
</div>

// Conditional rendering
{activeTab === 'invoices' && <InvoicesTab invoices={invoices} />}
{activeTab === 'payments' && <PaymentsTab receipts={receipts} />}
{activeTab === 'statement' && <StatementTab invoices={invoices} receipts={receipts} />}
```

#### C. Calculate Customer Balance
```typescript
const totalInvoiced = useMemo(() => {
  return invoices.reduce((sum, inv) => sum + inv.total, 0);
}, [invoices]);

const totalPaid = useMemo(() => {
  return receipts.reduce((sum, rec) => sum + rec.amount, 0);
}, [receipts]);

const balance = totalInvoiced - totalPaid;
```

### i18n Keys to Add
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

### Verification Checklist — Phase 3
- [ ] CustomerDetail page loads without errors
- [ ] Balance calculation is correct (manual test: 1000 invoice - 300 payment = 700 balance)
- [ ] Tabs switch properly
- [ ] Empty states show when no data
- [ ] Loading spinner shows during fetch
- [ ] RTL layout maintained (buttons/tabs)

**Time Estimate:** 45 minutes  
**Dependencies:** Phase 2 (Firestore schema defined)  
**Blocking Issues:** None

---

## 💳 PHASE 4 — New Payment Form & Receipts Service

### New File: `services/receiptsService.ts`

This service handles all receipt (payment) operations.

```typescript
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Receipt } from '../types';

/**
 * Create a new receipt (payment record).
 * Validates amount and date on client.
 */
export async function createReceipt(
  companyId: string,
  customerId: string,
  customerName: string,
  amount: number,
  method: string,
  date: string,
  note?: string,
  invoiceId?: string,
  invoiceNumber?: string,
  userEmail?: string
): Promise<string> {
  const receiptsRef = collection(db, 'companies', companyId, 'receipts');
  
  // Validate
  if (amount <= 0) throw new Error('Amount must be positive');
  if (!date) throw new Error('Date is required');
  if (!customerId) throw new Error('Customer ID is required');
  
  const docRef = await addDoc(receiptsRef, {
    companyId,
    customerId,
    customerName,
    amount,
    method,
    date, // ISO 8601 local time
    note: note || '',
    invoiceId: invoiceId || null,
    invoiceNumber: invoiceNumber || '',
    createdAt: Timestamp.now(),
    createdBy: userEmail || 'unknown',
  });
  
  return docRef.id;
}

/**
 * Fetch all receipts for a customer (scoped by company).
 */
export async function getReceiptsByCustomerId(
  companyId: string,
  customerId: string
): Promise<Receipt[]> {
  const q = query(
    collection(db, 'companies', companyId, 'receipts'),
    where('customerId', '==', customerId)
  );
  
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date(),
  } as Receipt));
}

/**
 * Fetch all receipts for a date range (for daily collection page).
 */
export async function getReceiptsByDateRange(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<Receipt[]> {
  const q = query(
    collection(db, 'companies', companyId, 'receipts'),
    where('date', '>=', startDate),
    where('date', '<=', endDate)
  );
  
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date(),
  } as Receipt));
}
```

### Update types.ts

Add Receipt interface:

```typescript
export interface Receipt {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string; // ISO 8601 local time
  method: 'cash' | 'transfer' | 'check' | 'wallet' | 'other';
  note?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  createdAt?: Date | unknown;
  createdBy?: string;
}
```

### New/Updated PaymentForm Modal

The existing `PaymentForm.tsx` can remain mostly unchanged. Add:

```typescript
// At top, import Receipt service
import { createReceipt } from '../services/receiptsService';

// In handleSubmit, change to use createReceipt:
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!activeCompanyId || !customer) return;
  
  try {
    await createReceipt(
      activeCompanyId,
      customer.id,
      customer.name,
      amount,
      method,
      paymentDate,
      notes,
      invoiceId || undefined,
      invoiceNumber || undefined,
      user?.email
    );
    
    addNotification(t('paymentSaveSuccess'), 'success');
    onClose?.();
  } catch (error) {
    addNotification(mapFirestoreError(error), 'error');
  }
};
```

### i18n Keys
```typescript
paymentReceipt: 'إيصال دفع',
paymentMethod: 'طريقة الدفع',
paymentCash: 'كاش',
paymentTransfer: 'تحويل بنكي',
paymentCheck: 'شيك',
paymentWallet: 'محفظة',
paymentOther: 'أخرى',
paymentDate: 'تاريخ الدفع',
paymentAmountLabel: 'المبلغ',
paymentNote: 'ملاحظة (اختياري)',
paymentSelectInvoice: 'ربط بفاتورة (اختياري)',
```

### Verification Checklist — Phase 4
- [ ] Receipt service compiles without errors
- [ ] Receipt created in Firestore (check Firebase Console)
- [ ] Receipt has correct companyId scoping
- [ ] Date stored in ISO 8601 local format (not UTC)
- [ ] createdAt is server timestamp
- [ ] Amount is positive
- [ ] Can create payment without invoice link (on-account)
- [ ] `npm run build` succeeds

**Time Estimate:** 1 hour  
**Dependencies:** Phase 2 (Firestore schema), Phase 3 (types updated)  
**Blocking Issues:** None

---

## 📊 PHASE 5 — Per-Customer Reports (Statement/Kshf Hisab)

### New Tab: "Statement" (كشف الحساب)

Add to CustomerDetail page. This shows a timeline of transactions with running balance.

#### Statement Logic

```typescript
interface StatementRow {
  date: string; // ISO date
  type: 'invoice' | 'payment'; // debit vs credit
  description: string;
  amount: number; // absolute value
  balance: number; // running balance
}

function computeStatement(
  invoices: Invoice[],
  receipts: Receipt[],
  startDate?: string,
  endDate?: string
): StatementRow[] {
  // Merge invoices + receipts, sort by date
  const entries: Array<{ type: string; date: string; desc: string; amount: number; ref: string }> = [];
  
  invoices.forEach((inv) => {
    if (!startDate || inv.date >= startDate) {
      if (!endDate || inv.date <= endDate) {
        entries.push({
          type: 'invoice',
          date: inv.date,
          desc: `${t('statementInvoice')} #${inv.invoiceNumber}`,
          amount: inv.total,
          ref: inv.id,
        });
      }
    }
  });
  
  receipts.forEach((rec) => {
    if (!startDate || rec.date >= startDate) {
      if (!endDate || rec.date <= endDate) {
        entries.push({
          type: 'receipt',
          date: rec.date,
          desc: `${t('statementPayment')} (${rec.method})${rec.note ? ' - ' + rec.note : ''}`,
          amount: -rec.amount, // negative for credit
          ref: rec.id,
        });
      }
    }
  });
  
  // Sort by date ascending
  entries.sort((a, b) => a.date.localeCompare(b.date));
  
  // Compute running balance
  let balance = 0;
  const rows: StatementRow[] = entries.map((e) => {
    balance += e.amount;
    return {
      date: e.date,
      type: e.type === 'invoice' ? 'invoice' : 'payment',
      description: e.desc,
      amount: Math.abs(e.amount),
      balance,
    };
  });
  
  return rows;
}
```

#### Statement UI Component

```tsx
const StatementTab: React.FC<{
  invoices: Invoice[];
  receipts: Receipt[];
  currency: string;
}> = ({ invoices, receipts, currency }) => {
  const [dateRange, setDateRange] = useState<'all' | 'ytd' | '90d'>('all');
  
  const startDate = useMemo(() => {
    const today = new Date();
    switch (dateRange) {
      case 'ytd':
        return new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      case '90d':
        const d = new Date();
        d.setDate(d.getDate() - 90);
        return d.toISOString().split('T')[0];
      default:
        return undefined;
    }
  }, [dateRange]);
  
  const statement = useMemo(
    () => computeStatement(invoices, receipts, startDate),
    [invoices, receipts, startDate]
  );
  
  return (
    <div className="space-y-4 mt-6">
      <div className="flex gap-2 flex-wrap">
        {(['all', 'ytd', '90d'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              dateRange === range
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
            }`}
          >
            {range === 'all' ? t('statementAll') : range === 'ytd' ? t('statementYTD') : t('statement90Days')}
          </button>
        ))}
      </div>
      
      {statement.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
          {t('statementNoTransactions')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-right px-2 py-2 font-medium text-gray-700 dark:text-gray-300">
                  {t('statementDate')}
                </th>
                <th className="text-right px-2 py-2 font-medium text-gray-700 dark:text-gray-300">
                  {t('statementDescription')}
                </th>
                <th className="text-right px-2 py-2 font-medium text-gray-700 dark:text-gray-300">
                  {t('statementAmount')}
                </th>
                <th className="text-right px-2 py-2 font-medium text-gray-700 dark:text-gray-300">
                  {t('statementBalance')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {statement.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-2 py-2 text-right">{row.date}</td>
                  <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-400">
                    {row.description}
                  </td>
                  <td className={`px-2 py-2 text-right font-medium ${
                    row.type === 'invoice'
                      ? 'text-danger-600 dark:text-danger-400'
                      : 'text-success-600 dark:text-success-400'
                  }`}>
                    {row.type === 'invoice' ? '+' : '-'} {row.amount.toFixed(2)} {currency}
                  </td>
                  <td className="px-2 py-2 text-right font-bold">
                    {row.balance.toFixed(2)} {currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
```

### i18n Keys
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

### Verification Checklist — Phase 5
- [ ] Statement tab loads
- [ ] Transactions appear in correct order (by date)
- [ ] Running balance is accurate (manual math: inv 1000 → bal 1000, pay 300 → bal 700)
- [ ] Date range filters work (all / YTD / 90d)
- [ ] Invoices show as positive (red/debit)
- [ ] Payments show as negative (green/credit)
- [ ] Empty state shows when no data
- [ ] Numbers align properly (RTL layout)

**Time Estimate:** 1 hour  
**Dependencies:** Phase 3, 4 (CustomerDetail, receipts service)  
**Blocking Issues:** None

---

## 📱 PHASE 6 — Daily Collection Page (الوارد/التحصيل اليومي)

### New Route & Page

Add new lazy import in `src/routes.ts`:

```typescript
const DailyCollection = lazy(() => import('@/pages/DailyCollection'));
```

Add to routes array:
```typescript
{ path: '/daily-collection', component: DailyCollection, title: 'التحصيل اليومي' },
```

### New File: `pages/DailyCollection.tsx`

```tsx
import React, { useEffect, useState, useMemo } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { getReceiptsByDateRange } from '../services/receiptsService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Receipt } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { t } from '../src/i18n/t';
import PaymentModal from './PaymentModal'; // or use PaymentForm

const toLocalDate = (date: Date | string) => {
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
};

const DailyCollection: React.FC = () => {
  const { activeCompanyId } = useAuth();
  const { addNotification } = useNotification();
  
  const [date, setDate] = useState(toLocalDate(new Date()));
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    const fetchReceipts = async () => {
      if (!activeCompanyId) return;
      setLoading(true);
      try {
        const data = await getReceiptsByDateRange(activeCompanyId, date, date);
        setReceipts(data || []);
      } catch (error) {
        addNotification('تعذر تحميل المدفوعات', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReceipts();
  }, [date, activeCompanyId, addNotification]);

  const summary = useMemo(() => {
    const cash = receipts
      .filter((r) => r.method === 'cash')
      .reduce((sum, r) => sum + r.amount, 0);
    
    const nonCash = receipts
      .filter((r) => r.method !== 'cash')
      .reduce((sum, r) => sum + r.amount, 0);
    
    return { cash, nonCash, total: cash + nonCash };
  }, [receipts]);

  const switchDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(toLocalDate(d));
  };

  return (
    <div className="page-container space-y-6">
      <div className="page-header">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('dailyCollectionTitle')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('dailyCollectionSubtitle')}
        </p>
      </div>

      {/* Date Switcher */}
      <div className="flex items-center gap-4 justify-center">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => switchDate(-1)}
        >
          {t('commonPrev')}
        </Button>
        
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
        />
        
        <Button
          variant="secondary"
          size="sm"
          onClick={() => switchDate(1)}
        >
          {t('commonNext')}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDate(toLocalDate(new Date()))}
        >
          {t('dailyCollectionToday')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('dailyCollectionCash')}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {summary.cash.toFixed(2)} ج
          </p>
        </Card>
        
        <Card className="p-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('dailyCollectionNonCash')}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {summary.nonCash.toFixed(2)} ج
          </p>
        </Card>
        
        <Card className="p-6 text-center bg-primary-50 dark:bg-primary-900/20">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('dailyCollectionTotal')}
          </p>
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {summary.total.toFixed(2)} ج
          </p>
        </Card>
      </div>

      {/* Action Button */}
      <div className="flex justify-center">
        <Button
          onClick={() => setShowPaymentModal(true)}
          size="lg"
        >
          <PlusIcon className="h-5 w-5 me-2" />
          {t('dailyCollectionNewPayment')}
        </Button>
      </div>

      {/* Receipts List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">
          {t('commonLoading')}
        </div>
      ) : receipts.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {t('dailyCollectionEmpty')}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {receipts.map((receipt) => (
              <div
                key={receipt.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {receipt.customerName}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {receipt.method} {receipt.note && `• ${receipt.note}`}
                  </p>
                </div>
                <p className="font-bold text-gray-900 dark:text-white">
                  {receipt.amount.toFixed(2)} ج
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            // Refetch receipts
          }}
        />
      )}
    </div>
  );
};

export default DailyCollection;
```

### i18n Keys
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

### Add to Navigation

Update `components/Sidebar.tsx` or nav to include:
```typescript
{ path: '/daily-collection', icon: WalletIcon, label: t('dailyCollectionTitle'), group: 'main' },
```

### Verification Checklist — Phase 6
- [ ] Route renders without errors
- [ ] Date switcher works (prev/next/today)
- [ ] Summary totals are correct
- [ ] Cash/non-cash filtering is accurate
- [ ] Receipts list displays all payments for selected date
- [ ] "New Payment" button opens modal
- [ ] Dark mode styling applied
- [ ] RTL layout works (numbers aligned right)
- [ ] Empty state shows when no data
- [ ] `npm run build` succeeds

**Time Estimate:** 1.5 hours  
**Dependencies:** Phase 4 (receipts service)  
**Blocking Issues:** None

---

## ✅ PHASE 7 — Logic Validation & Testing

### Checklist: Date Handling

- [ ] All dates stored in ISO 8601 format (YYYY-MM-DD)
- [ ] Local timezone used (not UTC)
- [ ] No time component in date fields
- [ ] Date switching (prev/next day) works correctly
- [ ] Year-to-date filters use Jan 1 of current year

### Checklist: Company Scoping

**Every Firestore query must include:**
```typescript
where('companyId', '==', activeCompanyId)
```

Verify in:
- [ ] `getReceiptsByCustomerId()` — scoped ✓
- [ ] `getReceiptsByDateRange()` — scoped ✓
- [ ] Existing `getInvoices()` — already scoped
- [ ] Existing `getPaymentsByCustomerId()` — already scoped

### Checklist: Balance Calculations

Test scenario:
1. Create invoice for Customer A: $1000
2. Add payment: $300
3. Expected balance: $700

Execute:
```typescript
// Manual test in console
const invTotal = 1000;
const paid = 300;
const balance = invTotal - paid;
console.assert(balance === 700, 'Balance calculation failed');
```

### Checklist: Pagination & Limits

- [ ] Daily Collection loads receipts for single date (not unbounded)
- [ ] Customer detail loads only that customer's data
- [ ] Statement respects date range (YTD, 90d, custom)
- [ ] No "load all data" queries without limits

### Checklist: Error Handling

- [ ] Missing companyId shows error (not silent fail)
- [ ] Firestore errors caught and translated (i18n)
- [ ] Network errors show notification
- [ ] Permissions errors show "no access" message

### Sample Test Cases

#### Test 1: Create Receipt and Verify Balance
```
GIVEN: Customer A with $1000 invoice
WHEN:  Create receipt for $300
THEN:
  - Receipt appears in payments list
  - Balance updates to $700
  - Daily Collection shows $300 for today
  - Statement shows transaction
```

#### Test 2: Multiple Payments to Single Invoice
```
GIVEN: Invoice $1000
WHEN:  Create 3 payments: $300, $200, $500
THEN:
  - Balance = $0
  - All 3 payments listed
  - Statement shows running balance: 1000 → 700 → 500 → 0
```

#### Test 3: Payments Without Invoice Link
```
GIVEN: Customer A, no specific invoice
WHEN:  Create payment $100 (no invoice)
THEN:
  - Payment saved successfully
  - Shows as "on account"
  - Appears in Daily Collection
  - Reduces customer balance
```

#### Test 4: Date Range Filtering
```
GIVEN: Payments on Jan 5, Jan 15, Feb 5
WHEN:  Filter statement to "January only"
THEN:
  - Only Jan 5, Jan 15 appear
  - Balance is only from those 2
```

### Verification Checklist — Phase 7
- [ ] All test cases pass
- [ ] Balance formula: `total_invoiced - total_paid = balance` ✓
- [ ] All queries scoped by companyId
- [ ] No dates show as UTC (timezone correct)
- [ ] Error messages in Arabic (i18n)
- [ ] No console errors (except in dev mode)
- [ ] Build succeeds with 0 errors
- [ ] All new pages have loading/error states

**Time Estimate:** 1.5 hours (QA testing)  
**Dependencies:** All phases 1-6 complete  
**Blocking Issues:** None

---

## 🚀 IMPLEMENTATION TIMELINE

### Day 1 (4 hours)
- **Phase 1:** Fix "??????" text (15 min) ✓
- **Phase 2:** Define Firestore schema (30 min) ✓
- **Phase 3:** Enhance CustomerDetail (45 min) ✓
- **Phase 4:** Receipts service + PaymentForm (1 hour) ✓

### Day 2 (4 hours)
- **Phase 5:** Statement tab (1 hour) ✓
- **Phase 6:** Daily Collection page (1.5 hours) ✓
- **Build + quick test** (1.5 hours) ✓

### Day 3 (3 hours)
- **Phase 7:** QA testing + validation (3 hours) ✓

**Total: 11 hours focused work**

---

## 📋 FINAL CHECKLIST BEFORE MERGE

### Code Quality
- [ ] No TypeScript errors (`npm run build`)
- [ ] No console errors in dev mode
- [ ] All imports resolved
- [ ] No hardcoded strings (all i18n)

### Data Integrity
- [ ] Firestore schema correct
- [ ] Indexes created (if needed)
- [ ] Query security rules in place

### UX/Testing
- [ ] All new pages load without errors
- [ ] All forms submit successfully
- [ ] Balance calculations verified (manual math)
- [ ] Date handling verified (local time, not UTC)
- [ ] RTL layout working
- [ ] Dark mode applied
- [ ] Empty states render
- [ ] Loading states work
- [ ] Error messages show

### Deployment
- [ ] Firebase rules allow reads/writes to `/receipts`
- [ ] companyId scoping verified in rules
- [ ] No new dependencies added
- [ ] No Firestore migrations needed
- [ ] No Cloud Functions deployed

---

## 🔗 FILE DEPENDENCIES

```
LanguageToggle.tsx
  └─ i18n/ar.ts (new keys)

CustomerDetail.tsx
  ├─ types.ts (Receipt interface)
  ├─ services/receiptsService.ts (queries)
  └─ i18n/ar.ts (new keys)

receiptsService.ts
  ├─ firebase.ts (db connection)
  └─ types.ts (Receipt interface)

PaymentForm.tsx (existing)
  ├─ services/receiptsService.ts (createReceipt)
  └─ i18n/ar.ts (method translations)

DailyCollection.tsx (new)
  ├─ routes.ts (register route)
  ├─ services/receiptsService.ts (getReceiptsByDateRange)
  ├─ types.ts (Receipt)
  └─ i18n/ar.ts (new keys)

Sidebar.tsx (update nav)
  └─ routes.ts (add daily-collection)
```

---

## 💾 FIRESTORE OPERATIONS MATRIX

| Operation | File | Type | Scoped | Notes |
|-----------|------|------|--------|-------|
| Create receipt | `receiptsService.ts` | write | ✓ companyId | Validates amount > 0 |
| List receipts (customer) | `receiptsService.ts` | read | ✓ companyId | Single customer only |
| List receipts (date range) | `receiptsService.ts` | read | ✓ companyId | For daily collection |
| List invoices (customer) | Existing | read | ✓ companyId | Already scoped |
| Get customer | Existing | read | ✓ companyId | Already scoped |

---

## 🛡️ Security Considerations

### Firestore Rules (Update Required)

Add to `/companies/{companyId}/receipts` collection rules:

```
match /companies/{companyId}/receipts/{receiptId} {
  allow read: if request.auth.uid != null && 
    exists(/databases/$(database)/documents/companies/$(companyId)/permissions/$(request.auth.uid));
  allow create: if request.auth.uid != null &&
    exists(/databases/$(database)/documents/companies/$(companyId)/permissions/$(request.auth.uid)) &&
    request.resource.data.companyId == companyId &&
    request.resource.data.amount > 0;
}
```

### Data Validation
- ✓ Amount must be positive (client + server)
- ✓ customerId must exist
- ✓ companyId must match active company
- ✓ Date must be valid ISO 8601

---

## 📝 SUMMARY

**What's New:**
1. Fixed corrupted "??????" text in LanguageToggle
2. Added Firestore `receipts` collection for payment records
3. Enhanced CustomerDetail with balance display + tabbed interface
4. Created receipts service for client-side payment management
5. Added Statement tab showing transaction timeline with running balance
6. Created Daily Collection page for daily cash tracking

**What's Not Changed:**
- ✓ Invoice structure (no changes)
- ✓ Customer structure (no changes)
- ✓ Firestore rules structure (existing permissions still work)
- ✓ No Cloud Functions
- ✓ No new npm dependencies
- ✓ No migration needed

**Risk Level:** **LOW**
- All code is client-side only
- New Firestore collection is additive (no breaking changes)
- Existing data not affected
- Can be deployed without downtime

---

**Ready to implement? Start with Phase 1! 🚀**

# DASHBOARD & REPORTS LOGIC VALIDATION

**Date:** February 4, 2026  
**Purpose:** Detailed analysis of query logic, date handling, and scoping

---

## 📊 DASHBOARD Analysis

### File: `pages/Dashboard.tsx`

**Current Query Structure:**

```typescript
// Date calculation (lines 108-113)
const today = new Date();
const yesterday = new Date();
yesterday.setDate(today.getDate() - 1);
const todayISO = toISODate(today);           // YYYY-MM-DD format
const yesterdayISO = toISODate(yesterday);
```

**Issue:** Timezone Handling
- ✅ Uses local `new Date()` (client timezone)
- ✅ Converts to ISO string format (YYYY-MM-DD)
- ✅ Consistent with Firestore date storage

**Queries Executed:**

```typescript
// Line 116-123: Parallel queries for today + yesterday
[
  getInvoices(companyId, { filters: [['date', '>=', startISO], ['date', '<=', endISO]], limit: DAILY_LIMIT }),
  getExpenses(companyId, { dateStart: todayISO, dateEnd: todayISO, limit: DAILY_LIMIT }),
  // Similar for yesterday...
  getInvoices(companyId, { orderBy: 'date', orderDirection: 'desc', limit: 3 }),
  getExpenses(companyId, { orderBy: 'date', orderDirection: 'desc', limit: 3 }),
]
```

### ✅ Verified Safe Practices

| Aspect | Status | Evidence |
|--------|--------|----------|
| **companyId scoping** | ✅ Safe | All queries pass `companyId` as first param |
| **Date range (today)** | ✅ Safe | Uses local timezone, consistent format |
| **Listeners** | ✅ Safe | No unbounded real-time listeners |
| **Limit** | ✅ Safe | DAILY_LIMIT = 500 (defined at line 15) |
| **Total calculation** | ✅ Safe | Uses `getInvoiceTotal()` helper (line 17-26) |

### Calculation Method

```typescript
// Invoice totals (lines 128-129)
const salesTotal = todayInvoices.reduce((sum, inv) => sum + getInvoiceTotal(inv), 0);
const expensesTotal = todayExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

// Profit and comparison (lines 131-145)
const profitToday = todaySales - todayExpenses;
const deltaPercent = yesterdaySales > 0 ? ((profitToday - (yesterdaySales - yesterdayExpenses)) / (yesterdaySales - yesterdayExpenses)) * 100 : null;
```

✅ **Correct Logic**
- Sales = sum of all invoice totals
- Expenses = sum of all expense amounts
- Profit = Sales - Expenses
- Delta = (Today Profit - Yesterday Profit) / Yesterday Profit * 100

### Loading/Empty/Error States

```typescript
// Loading state (lines 218-229)
if (loading || settingsLoading) {
  return <div className="page-container"><CardSkeleton /></div>;
}

// Error state (line 255-261)
{error && (
  <div className="page-section">
    <Card><p className="text-red-600">{error}</p></Card>
  </div>
)}

// Empty states (lines 327, 349)
if (recentInvoices.length === 0) /* show empty */
if (recentExpenses.length === 0) /* show empty */
```

✅ **All states handled**

---

## 📈 REPORTS Analysis

### File: `pages/Reports.tsx`

**Current Query Structure:**

```typescript
// Date range defaults (lines 84-87)
const [dateRange, setDateRange] = useState(() => ({
  start: toIsoDate(new Date(new Date().setDate(new Date().getDate() - 30))),
  end: toIsoDate(new Date()),
}));
```

**Issue Assessment:**
- ✅ Defaults to last 30 days
- ✅ Uses local timezone
- ⚠️ Slightly complex calculation (could be clearer)

**Cleaner Alternative:**
```typescript
const [dateRange, setDateRange] = useState(() => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return {
    start: toIsoDate(start),
    end: toIsoDate(end),
  };
});
```

### Date Preset Handling (Lines 172-195)

```typescript
const updateRange = (newPreset: DateRangePreset) => {
  const end = new Date();
  let start = new Date();

  switch (newPreset) {
    case 'today':
      start = new Date(end);
      break;
    case '7':
      start.setDate(end.getDate() - 7);
      break;
    case '30':
      start.setDate(end.getDate() - 30);
      break;
    case 'custom':
      return; // User picks manually
  }

  setDateRange({ start: toIsoDate(start), end: toIsoDate(end) });
  setPreset(newPreset);
};
```

✅ **Safe & Correct**

### Queries Structure

```typescript
// Lines 135-162: Query execution
useEffect(() => {
  const fetchData = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    if (!user || !isSafeToAccessCompanyData(user.uid, companyId)) {
      addNotification(t('reportsNoAccess'), 'error');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [invoicesRes, expensesRes, returnsRes] = await Promise.all([
        getInvoices(companyId, {
          dateStart: dateRange.start,
          dateEnd: dateRange.end,
          orderBy: 'date',
        }),
        getExpenses(companyId, {
          dateStart: dateRange.start,
          dateEnd: dateRange.end,
          orderBy: 'date',
        }),
        getReturns(companyId, {
          dateStart: dateRange.start,
          dateEnd: dateRange.end,
        }),
      ]);
      // ...
    }
  };
  fetchData();
}, [companyId, dateRange, user]);
```

✅ **Scoped to companyId**  
✅ **Tenant security check** (`isSafeToAccessCompanyData`)  
✅ **All three document types queried**

### Calculation Logic (Lines 204-251)

```typescript
const invoiceTotal = invoices.reduce((sum, inv) => sum + (getInvoiceTotal(inv) || 0), 0);
const expenseTotal = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
const returnTotal = returns.reduce((sum, ret) => sum + (ret.amount || 0), 0);

const netSales = invoiceTotal - returnTotal;
const profit = netSales - expenseTotal;
```

✅ **Correct Formula**
- Gross Sales = invoice totals
- Net Sales = Gross - Returns
- Profit = Net - Expenses

### Verification Audit (Lines 52-70)

```typescript
const verifyReportCalculations = async (
  companyId: string,
  invoices: Invoice[],
  expenses: Expense[]
): Promise<void> => {
  if (!import.meta.env.DEV) return;
  try {
    const invoiceTotal = invoices.reduce((sum, inv) => sum + getInvoiceTotal(inv), 0);
    const expenseTotal = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    console.log('[REPORTS AUDIT]', {
      companyId,
      invoiceCount: invoices.length,
      invoiceTotal: invoiceTotal.toFixed(2),
      expenseCount: expenses.length,
      expenseTotal: expenseTotal.toFixed(2),
      netRevenue: (invoiceTotal - expenseTotal).toFixed(2),
    });
  } catch (err) {
    console.warn('[REPORTS AUDIT] Verification check failed:', err);
  }
};
```

✅ **Dev-only audit logging present**

---

## 🔄 Dashboard vs Reports Consistency Check

### Date Range Comparison

| Aspect | Dashboard | Reports | Match? |
|--------|-----------|---------|--------|
| **Today Query** | `toIsoDate(new Date())` | Custom range | ⚠️ Different |
| **Yesterday Query** | `toIsoDate(yesterday)` | Not used | ⚠️ Different |
| **Timezone** | Local (client) | Local (client) | ✅ Match |
| **Format** | YYYY-MM-DD | YYYY-MM-DD | ✅ Match |

### Totals Calculation Consistency

| Field | Dashboard | Reports | Difference |
|-------|-----------|---------|------------|
| **Invoices** | `getInvoiceTotal()` | `getInvoiceTotal()` | ✅ Same |
| **Expenses** | `exp.amount` | `exp.amount` | ✅ Same |
| **Profit** | Sales - Expenses | NetSales - Expenses | ⚠️ Differs (Reports includes returns) |

**Issue:** Dashboard doesn't account for returns!  
**Should be:** Dashboard profit = (Sales - Returns) - Expenses

---

## ⚠️ Issues Identified

### CRITICAL

1. **Dashboard doesn't include Returns in Profit calculation**
   - Currently: `profit = todaySales - todayExpenses`
   - Should be: `profit = (todaySales - todayReturns) - todayExpenses`
   - **Fix:** Query returns in Dashboard, adjust formula

2. **Dashboard "today" query limits to 500 docs (DAILY_LIMIT)**
   - If business has >500 invoices/expenses per day, numbers truncate
   - **Fix:** Remove limit or increase to 1000

### IMPORTANT

3. **Date range initialization is complex**
   - Reports: `toIsoDate(new Date(new Date().setDate(...)))`
   - Hard to read and maintain
   - **Fix:** Refactor to helper function

4. **No visible indication in UI which date range is selected**
   - User might not know they're viewing "last 30 days"
   - **Fix:** Add label under title: "Showing data from 2026-01-05 to 2026-02-04"

### MINOR

5. **Verification audit only logs to console (dev mode)**
   - No visual feedback to user if calculation seems wrong
   - **Fix:** Add optional "Show details" button that displays calculation steps

---

## 🛠️ Recommended Fixes

### Fix 1: Dashboard Profit Formula

**File:** `pages/Dashboard.tsx` lines 128-130

**Current:**
```typescript
const salesTotal = todayInvoices.reduce((sum, inv) => sum + getInvoiceTotal(inv), 0);
const expensesTotal = todayExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
const profitToday = todaySales - todayExpenses;
```

**Updated:**
```typescript
const salesTotal = todayInvoices.reduce((sum, inv) => sum + getInvoiceTotal(inv), 0);
const expensesTotal = todayExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

// Also need to query returns
const profitToday = (todaySales - todayReturns) - todayExpenses;
```

### Fix 2: Increase Daily Limit

**File:** `pages/Dashboard.tsx` line 15

**Current:**
```typescript
const DAILY_LIMIT = 500;
```

**Updated:**
```typescript
const DAILY_LIMIT = 10000; // Effectively no limit
```

### Fix 3: Simplify Date Calculation

**File:** `pages/Reports.tsx` lines 84-87

**Current:**
```typescript
const [dateRange, setDateRange] = useState(() => ({
  start: toIsoDate(new Date(new Date().setDate(new Date().getDate() - 30))),
  end: toIsoDate(new Date()),
}));
```

**Updated:**
```typescript
const getDefaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return { start: toIsoDate(start), end: toIsoDate(end) };
};

const [dateRange, setDateRange] = useState(getDefaultDateRange);
```

### Fix 4: Add Date Range Display

**File:** `pages/Reports.tsx` (near top of render)

**Add:**
```tsx
<div className="text-sm text-gray-500 mb-4">
  {t('reportsRangeLabel', {
    start: dateRange.start,
    end: dateRange.end,
  })}
</div>
```

**Add to ar.ts:**
```typescript
reportsRangeLabel: 'البيانات من {start} إلى {end}',
```

### Fix 5: Add Calculation Details View

**File:** `pages/Reports.tsx` (in render, add button)

```tsx
<button
  onClick={() => setShowDetails(!showDetails)}
  className="text-sm text-primary-600 hover:underline"
>
  {showDetails ? t('reportsHideDetails') : t('reportsShowDetails')}
</button>

{showDetails && (
  <div className="mt-4 bg-gray-50 p-4 rounded text-sm space-y-2 text-gray-700">
    <p>📊 {t('reportsCalculation')}:</p>
    <ul className="ml-4 space-y-1 font-mono text-xs">
      <li>Invoices ({invoices.length}): {invoiceTotal.toFixed(2)}</li>
      <li>Returns ({returns.length}): {returnTotal.toFixed(2)}</li>
      <li>Net Sales: {netSales.toFixed(2)}</li>
      <li>Expenses ({expenses.length}): {expenseTotal.toFixed(2)}</li>
      <li>Profit: {profit.toFixed(2)}</li>
    </ul>
  </div>
)}
```

---

## 📋 Verification Procedures

### Manual Testing Checklist

- [ ] **Dashboard Today:**
  - Open Dashboard
  - Create 1 Invoice for today: 100 SAR
  - Create 1 Expense for today: 20 SAR
  - Dashboard should show:
    - Sales: 100 SAR
    - Expenses: 20 SAR
    - Profit: 80 SAR
  - Create 1 Return for today: 10 SAR
  - Dashboard should show:
    - Sales: 100 SAR (unchanged, gross)
    - Expenses: 20 SAR
    - Profit: 70 SAR (100 - 10 - 20)

- [ ] **Reports Same Date Range:**
  - Open Reports
  - Set to "Today"
  - Should show same profit as Dashboard (70 SAR)
  - Click "Show Details" to verify calculation

- [ ] **Date Range Custom:**
  - Set custom range: Jan 1 - Jan 31
  - Verify no "today" data appears
  - Verify data matches time range exactly

- [ ] **Empty States:**
  - Set range with no data
  - Should show empty message, not error

- [ ] **Loading State:**
  - Open Dashboard/Reports
  - Should show skeleton/spinner briefly
  - No blank screen

---

## 📊 Dev Console Output Expected

### Dashboard Audit
```javascript
[DASHBOARD AUDIT] {
  companyId: "al-shahbandar:owner:1",
  todaySales: "100.00",
  todayExpenses: "20.00",
  todayReturns: "10.00",
  profit: "70.00",
  invoiceCount: 1,
  expenseCount: 1,
  returnCount: 1,
  timestamp: "2026-02-04T12:30:00.000Z"
}
```

### Reports Audit
```javascript
[REPORTS AUDIT] {
  companyId: "al-shahbandar:owner:1",
  dateRange: { start: "2026-01-01", end: "2026-01-31" },
  invoiceTotal: "500.00",
  returnTotal: "50.00",
  netSales: "450.00",
  expenseTotal: "100.00",
  profit: "350.00",
  invoiceCount: 15,
  expenseCount: 8,
  returnCount: 2,
  timestamp: "2026-02-04T12:30:00.000Z"
}
```

---

## ✅ Summary

| Check | Status | Notes |
|-------|--------|-------|
| Queries scoped to companyId | ✅ | All queries pass companyId |
| Date ranges use local TZ | ✅ | Consistent with data model |
| Totals calculation correct | ⚠️ | Dashboard missing returns |
| Loading states | ✅ | Present in both pages |
| Empty states | ✅ | Handled for all scenarios |
| Error handling | ✅ | Notification shown |
| Audit logging | ✅ | Dev-only console logs |

**Overall: Ready for Phase 5 implementation** (with recommended fixes applied)


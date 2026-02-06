# Firestore Schema → Reporting Requirements Analysis

**Date**: February 6, 2026  
**Requirement**: Verify schema supports 5 critical reports with simple, free-tier-safe queries  
**Status**: ✅ Analysis Complete

---

## REPORT 1: Daily Receipts Totals by Payment Method (Date Range)

### Purpose
Cashier/Manager view: "How much cash, transfers, checks, etc. came in today/this week?"

### Query Pattern
```typescript
// Pseudo-code
const q = query(
  collection(db, 'companies', companyId, 'receipts'),
  where('date', '>=', startDate),    // ISO 8601 string
  where('date', '<=', endDate),
  orderBy('date', 'desc'),
  orderBy('method', 'asc')
);
const snap = await getDocs(q);

// Client-side grouping:
const totals: Record<string, number> = {};
snap.docs.forEach(doc => {
  const method = doc.data().method;
  totals[method] = (totals[method] || 0) + doc.data().amount;
});
```

### Required Fields
✅ **Present in Receipt schema**:
- `date` (string, ISO 8601): YYYY-MM-DD
- `method` (enum): 'cash' | 'transfer' | 'check' | 'wallet' | 'instapay' | 'other'
- `amount` (number): Validated >0

### Required Indexes
| Collection | Fields | Type | Notes |
|-----------|--------|------|-------|
| receipts | (date, method) | Compound | For grouped date range queries |
| receipts | (date) | Single | For daily receipts list |

**Firestore Action**: Auto-create on first complex query (will show warning in console)

### Example Output
```
Daily Receipts Summary: 2025-02-06
├─ Cash:      450 EGP
├─ Transfer:  1,200 EGP
├─ Check:     500 EGP
├─ Wallet:    100 EGP
├─ InstaPay:  250 EGP
└─ Other:     0 EGP
─────────────
TOTAL:        2,500 EGP
```

### Query Cost
- Read: 1 document lookup per receipt (in range)
- Free-tier: ~2M reads/month
- Typical: 50 receipts/day = 50 reads (negligible)

### Status
✅ **Schema supports this report** — No changes needed

---

## REPORT 2: Customer Ledger (Transactions + Balance)

### Purpose
Accountant view: "Show me all payments/receipts for Customer X, and their current balance (how much they owe)."

### Query Pattern
```typescript
// Get all receipts for customer
const receiptsQ = query(
  collection(db, 'companies', companyId, 'receipts'),
  where('customerId', '==', customerId),
  orderBy('date', 'asc')
);
const receiptsSnap = await getDocs(receiptsQ);

// Get all invoices for customer
const invoicesQ = query(
  collection(db, 'companies', companyId, 'invoices'),
  where('customerId', '==', customerId),
  orderBy('date', 'asc')
);
const invoicesSnap = await getDocs(invoicesQ);

// Get all payments for customer
const paymentsQ = query(
  collection(db, 'companies', companyId, 'payments'),
  where('customerId', '==', customerId),
  orderBy('date', 'asc')
);
const paymentsSnap = await getDocs(paymentsQ);

// Client: Merge + sort + calculate running balance
```

### Required Fields

**Receipts**:
- ✅ `customerId` (string)
- ✅ `date` (string, ISO 8601)
- ✅ `amount` (number)
- ✅ `customerName` (string)

**Invoices**:
- ✅ `customerId` (string)
- ✅ `date` (string, ISO 8601)
- ✅ `total` (number)
- ✅ `status` (enum): 'Paid' | 'Due' | 'Cancelled'

**Payments**:
- ✅ `customerId` (string)
- ✅ `date` (string or Timestamp) — **CONCERN: inconsistent type**
- ✅ `amount` (number)
- ✅ `invoiceId` (optional)

### Required Indexes
| Collection | Fields | Type | Notes |
|-----------|--------|------|-------|
| receipts | (customerId, date) | Compound | Customer receipt history |
| invoices | (customerId, date) | Compound | Customer invoice history |
| payments | (customerId, date) | Compound | Customer payment history |

### Recommended Schema Adjustment
⚠️ **Issue**: Payment.date is `string \| unknown` (inconsistent with receipts/invoices)

**Fix**: Standardize to ISO 8601 string for consistency
```typescript
// Before
date: string | unknown;

// After
date: string;  // ISO 8601 (YYYY-MM-DD)
```

**Impact**: Low (Payment dates already stored as strings; just clarify type)

### Example Output
```
Customer Ledger: Ahmed El-Sayed (2025-02-01 to 2025-02-06)

Date       | Type      | Reference      | Debit   | Credit  | Balance
-----------|-----------|----------------|---------|---------|----------
2025-01-15 | Invoice   | INV-001        | 1000    |         | 1000 due
2025-01-20 | Payment   | PAY-001        |         | 500     | 500 due
2025-02-01 | Receipt   | REC-001        |         | 200     | 300 due
2025-02-05 | Invoice   | INV-002        | 750     |         | 1050 due
           | BALANCE   |                |         |         | 1050 EGP

Status: Customer owes 1,050 EGP
```

### Query Cost
- 3 queries (receipts, invoices, payments)
- ~50 reads total per customer per month
- Free-tier: Easily supported

### Status
⚠️ **Schema mostly supports this** — Minor type fix needed (Payment.date: standardize to string ISO 8601)

---

## REPORT 3: Sales Report (Date Range, by Day, by Customer)

### Purpose
Sales manager view: "What was our revenue yesterday? This week? Which customers spent the most?"

### Query Pattern
```typescript
// Get all invoices in date range
const q = query(
  collection(db, 'companies', companyId, 'invoices'),
  where('date', '>=', startDate),      // ISO 8601
  where('date', '<=', endDate),
  orderBy('date', 'asc'),
  orderBy('customerId', 'asc')
);
const snap = await getDocs(q);

// Client-side aggregation:
const byDay: Record<string, number> = {};      // date → total
const byCustomer: Record<string, number> = {}; // customerId → total

snap.docs.forEach(doc => {
  const data = doc.data();
  byDay[data.date] = (byDay[data.date] || 0) + data.total;
  byCustomer[data.customerId] = (byCustomer[data.customerId] || 0) + data.total;
});
```

### Required Fields
✅ **Present in Invoice schema**:
- `date` (string, ISO 8601): YYYY-MM-DD
- `customerId` (string)
- `customerName` (string)
- `total` (number): Validated >0

### Required Indexes
| Collection | Fields | Type | Notes |
|-----------|--------|------|-------|
| invoices | (date, customerId) | Compound | Sales by date and customer |
| invoices | (date) | Single | Daily sales totals |

### Example Output
```
Sales Report: 2025-02-01 to 2025-02-06

BY DAY:
─────────────────────────────
2025-02-01: 3 invoices, 5,200 EGP
2025-02-02: 2 invoices, 1,500 EGP
2025-02-03: 0 invoices, 0 EGP
2025-02-04: 5 invoices, 8,750 EGP
2025-02-05: 4 invoices, 6,000 EGP
2025-02-06: 6 invoices, 9,800 EGP
─────────────────────────────
TOTAL:       20 invoices, 35,250 EGP

TOP CUSTOMERS:
1. Ahmed El-Sayed     | 8,500 EGP (3 invoices)
2. Fatima Al-Mansouri | 7,200 EGP (4 invoices)
3. Mohammed Hassan   | 6,100 EGP (2 invoices)
```

### Query Cost
- 1 query (invoices in date range)
- ~100 reads for a week of data
- Free-tier: Easily supported

### Status
✅ **Schema fully supports this report** — No changes needed

---

## REPORT 4: Product Report (Top Products by Qty & Revenue, Date Range)

### Purpose
Inventory manager view: "Which products are best sellers? What's our revenue per product?"

### Challenge
⚠️ **Issue**: Products are stored as **line items inside invoices**, not as separate transactional records

**Current Structure**:
```typescript
// Invoice document
{
  id: "inv-001",
  date: "2025-02-06",
  items: [
    { productId: "prod-1", productName: "Widget A", quantity: 5, price: 100 },
    { productId: "prod-2", productName: "Widget B", quantity: 3, price: 200 }
  ],
  total: 1100
}
```

### Query Pattern (Current Limitation)
```typescript
// Get all invoices in range
const q = query(
  collection(db, 'companies', companyId, 'invoices'),
  where('date', '>=', startDate),
  where('date', '<=', endDate)
);
const snap = await getDocs(q);

// Client-side: Must iterate items and aggregate
const byProduct: Record<string, { qty: number; revenue: number }> = {};
snap.docs.forEach(doc => {
  doc.data().items.forEach(item => {
    if (!byProduct[item.productId]) {
      byProduct[item.productId] = { qty: 0, revenue: 0, name: item.productName };
    }
    byProduct[item.productId].qty += item.quantity;
    byProduct[item.productId].revenue += item.quantity * item.price;
  });
});
```

### Required Fields
✅ **Present in InvoiceItem**:
- `productId` (string)
- `productName` (string): Snapshot
- `quantity` (number)
- `price` (number)

### Schema Recommendation
**Option A (Current)**: Keep as embedded items, client-side aggregation
- ✅ Pros: Simple, already implemented, fast queries
- ⚠️ Cons: Heavy client-side processing for large datasets

**Option B (Enhanced)**: Add lightweight stockLedger tracking
- Track each product sale in `stockLedger` collection
- Structure: `{ productId, date, quantity, unitPrice, sourceId: invoiceId }`
- ✅ Pros: Easy product reports, fast aggregation
- ✅ Pros: Already implemented (for inventory tracking)
- ✅ Free-tier safe (no Cloud Functions needed)

### Recommended Approach
✅ **Use existing `stockLedger` collection** for product reporting:

```typescript
// Query product sales for a date range
const q = query(
  collection(db, 'companies', companyId, 'stockLedger'),
  where('sourceType', '==', 'SALE'),  // Only sales (not purchases/adjustments)
  where('timestamp', '>=', startDate),
  where('timestamp', '<=', endDate),
  orderBy('timestamp', 'asc'),
  orderBy('productId', 'asc')
);
const snap = await getDocs(q);

// Client-side aggregation (lightweight):
const byProduct: Record<string, any> = {};
snap.docs.forEach(doc => {
  const data = doc.data();
  if (!byProduct[data.productId]) {
    byProduct[data.productId] = { qty: 0, revenue: 0 };
  }
  byProduct[data.productId].qty += Math.abs(data.change); // change is negative for sales
  byProduct[data.productId].revenue += Math.abs(data.change) * (data.unitCost || 0);
});
```

### Required Indexes
| Collection | Fields | Type | Notes |
|-----------|--------|------|-------|
| stockLedger | (sourceType, timestamp, productId) | Compound | Product sales by date |
| stockLedger | (productId, timestamp) | Compound | Product history |

### Schema Adjustment Needed
⚠️ **Minor Issue**: StockLedgerEntry uses `timestamp: unknown` but needs clear date field

**Fix**:
```typescript
// Before
timestamp: unknown;

// After
timestamp: Timestamp;  // Firestore Timestamp for range queries
date?: string;         // Optional ISO 8601 for UI display
```

**Rationale**: Timestamps are queryable; ISO strings are for UI display

### Example Output
```
Product Report: 2025-02-01 to 2025-02-06

Top Products by Revenue:
1. Widget A    | 15 units | 1,500 EGP revenue | 100 EGP/unit
2. Widget B    | 8 units  | 1,600 EGP revenue | 200 EGP/unit
3. Service X   | 5 units  | 500 EGP revenue   | 100 EGP/unit

Top Products by Quantity:
1. Widget A    | 15 units
2. Widget B    | 8 units
3. Service X   | 5 units
```

### Query Cost
- 1 query on stockLedger (already implemented)
- ~50 ledger entries per week
- Free-tier: Easily supported

### Status
⚠️ **Schema mostly supports** — Recommend clarifying StockLedgerEntry.timestamp type + using existing stockLedger for product reports

---

## REPORT 5: Expenses Report (Date Range, by Category)

### Purpose
Finance view: "How much did we spend this month? Breakdown by category?"

### Query Pattern
```typescript
// Get all expenses in date range
const q = query(
  collection(db, 'companies', companyId, 'expenses'),
  where('date', '>=', startDate),      // ISO 8601
  where('date', '<=', endDate),
  orderBy('date', 'asc'),
  orderBy('category', 'asc')
);
const snap = await getDocs(q);

// Client-side grouping:
const byCategory: Record<string, number> = {};
snap.docs.forEach(doc => {
  const cat = doc.data().category;
  byCategory[cat] = (byCategory[cat] || 0) + doc.data().amount;
});

// Sort by amount desc
const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
```

### Required Fields
✅ **Present in Expense schema**:
- `date` (string, ISO 8601): YYYY-MM-DD
- `category` (string): Expense category
- `amount` (number): Validated >0
- `vendor` (string): Supplier/vendor name
- `description` (string): Optional details

### Required Indexes
| Collection | Fields | Type | Notes |
|-----------|--------|------|-------|
| expenses | (date, category) | Compound | Expenses by date and category |
| expenses | (category, date) | Compound | Category history by date |

### Example Output
```
Expenses Report: 2025-02-01 to 2025-02-06

BY CATEGORY:
─────────────────────────────────
Utilities      | 450 EGP   (12 expenses)
Travel         | 800 EGP   (5 expenses)
Supplies       | 200 EGP   (3 expenses)
Maintenance    | 300 EGP   (2 expenses)
Other          | 100 EGP   (1 expense)
─────────────────────────────────
TOTAL:         1,850 EGP  (23 expenses)

Top Vendors:
1. ElectricCo  | 450 EGP (utilities)
2. Uber        | 500 EGP (travel)
3. Staples     | 200 EGP (supplies)
```

### Query Cost
- 1 query (expenses in date range)
- ~50 expenses per week
- Free-tier: Easily supported

### Status
✅ **Schema fully supports this report** — No changes needed

---

## SUMMARY: Schema Report-Readiness

| Report | Supported | Indexes Needed | Schema Changes | Risk Level |
|--------|-----------|-----------------|-----------------|------------|
| 1. Daily Receipts by Method | ✅ | (date, method) | None | ✅ Low |
| 2. Customer Ledger | ⚠️ | (customerId, date) x3 | Standardize Payment.date type | ✅ Low |
| 3. Sales by Day/Customer | ✅ | (date, customerId) | None | ✅ Low |
| 4. Product by Qty/Revenue | ⚠️ | (sourceType, timestamp, productId) | Clarify StockLedgerEntry.timestamp | ✅ Low |
| 5. Expenses by Category | ✅ | (date, category) | None | ✅ Low |

---

## RECOMMENDED SCHEMA ADJUSTMENTS (Minimal, Non-Breaking)

### 1. Payment.date — Standardize Type
**File**: `types.ts` line ~74

**Current**:
```typescript
date: string | unknown;
```

**Recommended**:
```typescript
date: string;  // ISO 8601 (YYYY-MM-DD) or ISO 8601 with time
```

**Rationale**: Consistency with receipts/invoices; enables sorting

**Impact**: 
- Backward compatible (existing string values remain valid)
- Just clarifies the type contract

### 2. StockLedgerEntry.timestamp — Use Firestore Timestamp
**File**: `types.ts` line ~165

**Current**:
```typescript
timestamp: unknown;
```

**Recommended**:
```typescript
timestamp: Timestamp;  // Firestore Timestamp (queryable)
```

**Rationale**: 
- Firestore Timestamps are sortable/queryable
- Existing code likely already stores as Timestamp
- Just clarifies type

**Impact**: 
- Backward compatible
- Improves query performance

### 3. Add Compound Indexes (Firestore)
**List of indexes to create**:
1. receipts: (date, method)
2. receipts: (customerId, date)
3. invoices: (customerId, date)
4. invoices: (date, customerId)
5. payments: (customerId, date)
6. stockLedger: (sourceType, timestamp, productId)
7. stockLedger: (productId, timestamp)
8. expenses: (date, category)
9. expenses: (category, date)

**How**: Firestore auto-creates on first complex query (shows warning in console)  
**Cost**: None (Firestore free tier includes basic indexing)

---

## QUERY PATTERNS (No Cloud Functions Needed)

All reports use **simple Firestore queries**:
- Single collection queries with 1-2 `where` clauses
- `orderBy` on indexed fields
- Client-side grouping/aggregation (minimal processing)
- No triggers, aggregation pipelines, or Cloud Functions

**Free-Tier Safety**:
- ~100 reads per report run
- 2M free reads/month = 20,000 report runs/month
- ✅ Easily supported

---

## IMPLEMENTATION CHECKLIST

- [ ] Standardize Payment.date type to `string` (types.ts)
- [ ] Clarify StockLedgerEntry.timestamp as `Timestamp` (types.ts)
- [ ] Create index definitions documentation (firestore.rules or separate file)
- [ ] Implement report query functions in services/
- [ ] Add report pages to router (Reports.tsx uses these queries)
- [ ] Test each report with sample data

---

## CONCLUSION

✅ **Schema is well-designed for reporting**

**Green lights**:
- All 5 reports are queryable with simple Firestore queries
- No heavy aggregation or Cloud Functions needed
- Existing indexes sufficient or auto-created by Firestore
- Free-tier safe and cost-efficient

**Minor adjustments** (low risk):
- Standardize type hints (Payment.date, StockLedgerEntry.timestamp)
- Add compound indexes (auto-created by Firestore)

**Status**: ✅ **READY TO BUILD REPORTS**

Next: Implement centralized date formatting utility + report query functions


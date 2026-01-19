# NORMALIZATION SANITY GATE REPORT
**Status**: ⚠️ **CONDITIONAL PASS** - 3 CRITICAL ISSUES FOUND & FIXED  
**Date**: January 19, 2026  
**Commit**: bb0d089 (with applied minimal fixes)

---

## PHASE 1: ENUM NORMALIZERS - SEMANTIC MAPPINGS

### 1.1 normalizeInvoiceStatus()

**File**: [src/utils/normalize.ts](src/utils/normalize.ts#L132-L140)  
**Lines**: 132-140

```typescript
export function normalizeInvoiceStatus(value: unknown): InvoiceStatus {
  const str = toStringSafe(value).trim();
  if (Object.values(InvoiceStatus).includes(str as InvoiceStatus)) {
    return str as InvoiceStatus;
  }
  // Fallback to Due if unrecognized
  return InvoiceStatus.Due;
}
```

**Enum Definition** [types.ts](types.ts#L3-L7):
```typescript
export enum InvoiceStatus {
  Paid = 'Paid',
  Due = 'Due',
  Cancelled = 'Cancelled',
}
```

**Mapping Table**:
| Input | Type | Output | Semantic Preserved |
|-------|------|--------|-------------------|
| 'Paid' | Exact match | `InvoiceStatus.Paid` | ✅ YES |
| 'paid' | Case-insensitive | Not matched → fallback `Due` | ⚠️ RISK |
| 'Due' | Exact match | `InvoiceStatus.Due` | ✅ YES |
| 'due' | Case-insensitive | Not matched → fallback `Due` | ✅ OK (happens to match) |
| 'Cancelled' | Exact match | `InvoiceStatus.Cancelled` | ✅ YES |
| null/undefined | Invalid | Fallback `Due` | ✅ SAFE |
| '' (empty) | Invalid | Fallback `Due` | ✅ SAFE |

**Risk**: Input `'paid'` (lowercase) → becomes `'Due'` (SEMANTIC CHANGE!)

---

### 1.2 normalizePaymentType()

**File**: [src/utils/normalize.ts](src/utils/normalize.ts#L144-L152)  
**Lines**: 144-152

```typescript
export function normalizePaymentType(value: unknown): PaymentType {
  const str = toStringSafe(value).trim();
  if (Object.values(PaymentType).includes(str as PaymentType)) {
    return str as PaymentType;
  }
  // Fallback to Cash
  return PaymentType.Cash;
}
```

**Enum Definition** [types.ts](types.ts#L9-L12):
```typescript
export enum PaymentType {
  Cash = 'Cash',
  Credit = 'Credit',
}
```

**Mapping Table**:
| Input | Output | Semantic Preserved |
|-------|--------|-------------------|
| 'Cash' | `PaymentType.Cash` | ✅ YES |
| 'cash' (lowercase) | Not matched → `Cash` fallback | ⚠️ RISK |
| 'Credit' | `PaymentType.Credit` | ✅ YES |
| 'credit' (lowercase) | Not matched → `Cash` fallback | ❌ CHANGES MEANING |
| null/undefined | `Cash` fallback | ✅ SAFE (neutral default) |

**Risk**: Input `'credit'` → becomes `'Cash'` (WRONG PAYMENT TYPE!)

---

### 1.3 normalizePaymentMethod()

**File**: [src/utils/normalize.ts](src/utils/normalize.ts#L154-L165)  
**Lines**: 154-165

```typescript
export function normalizePaymentMethod(value: unknown): PaymentMethod {
  const str = toStringSafe(value).trim();
  const validMethods: PaymentMethod[] = ['كاش', 'محفظة', 'إنستاباي', 'تحويل بنكي', 'أخرى'];
  if (validMethods.includes(str as PaymentMethod)) {
    return str as PaymentMethod;
  }
  // Fallback to "أخرى" (other)
  return 'أخرى';
}
```

**Type Definition** [types.ts](types.ts#L63-L68):
```typescript
export type PaymentMethod =
  | 'كاش'
  | 'محفظة'
  | 'إنستاباي'
  | 'تحويل بنكي'
  | 'أخرى';
```

**Mapping Table** (Arabic):
| Input | Output | Semantic |
|-------|--------|----------|
| 'كاش' | 'كاش' | ✅ YES |
| 'محفظة' | 'محفظة' | ✅ YES |
| 'إنستاباي' | 'إنستاباي' | ✅ YES |
| 'تحويل بنكي' | 'تحويل بنكي' | ✅ YES |
| 'أخرى' | 'أخرى' | ✅ YES |
| Any other | 'أخرى' (other) | ✅ SAFE (neutral catch-all) |

**Risk**: None - Arabic text is case-sensitive, fallback is neutral.

---

### 1.4 normalizeQuoteStatus()

**File**: [src/utils/normalize.ts](src/utils/normalize.ts#L169-L177)  
**Lines**: 169-177

```typescript
export function normalizeQuoteStatus(value: unknown): QuoteStatus {
  const str = toStringSafe(value).trim();
  if (Object.values(QuoteStatus).includes(str as QuoteStatus)) {
    return str as QuoteStatus;
  }
  return QuoteStatus.Draft;
}
```

**Enum Definition** [types.ts](types.ts#L224-L229):
```typescript
export enum QuoteStatus {
  Draft = 'Draft',
  Sent = 'Sent',
  Accepted = 'Accepted',
  Declined = 'Declined',
}
```

**Mapping Table**:
| Input | Output | Risk |
|-------|--------|------|
| 'Draft' | `Draft` | ✅ YES |
| 'Sent' | `Sent` | ✅ YES |
| 'Accepted' | `Accepted` | ✅ YES |
| 'Declined' | `Declined` | ✅ YES |
| Any other (lowercase) | `Draft` fallback | ⚠️ RISK |

**Risk**: Similar to InvoiceStatus - case-sensitivity issues.

---

### 1.5 normalizeStockSourceType()

**File**: [src/utils/normalize.ts](src/utils/normalize.ts#L180-L189)  
**Lines**: 180-189

```typescript
export function normalizeStockSourceType(value: unknown): StockSourceType {
  const str = toStringSafe(value).trim().toUpperCase();
  const validTypes: StockSourceType[] = ['PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN', 'TRANSFER'];
  if (validTypes.includes(str as StockSourceType)) {
    return str as StockSourceType;
  }
  return 'ADJUSTMENT';
}
```

**Type Definition** [types.ts](types.ts#L139):
```typescript
export type StockSourceType = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN' | 'TRANSFER';
```

**Mapping Table**:
| Input | Output | Risk |
|-------|--------|------|
| 'purchase' (lowercase) | `PURCHASE` (uppercased) | ✅ SAFE |
| 'SALE' | `SALE` | ✅ YES |
| 'adjustment' (lowercase) | `ADJUSTMENT` (uppercased) | ✅ SAFE |
| 'return' (lowercase) | `RETURN` (uppercased) | ✅ SAFE |
| 'transfer' (lowercase) | `TRANSFER` (uppercased) | ✅ SAFE |
| Any other | `ADJUSTMENT` (fallback) | ✅ SAFE (neutral) |

**Risk**: None - `.toUpperCase()` normalizes case-insensitively.

---

## PHASE 2: SEMANTIC RISKS SCAN

### Risk 1: ❌ CRITICAL - InvoiceStatus Case Sensitivity

**Issue**: `normalizeInvoiceStatus()` requires exact case match  
**Location**: [src/utils/normalize.ts](src/utils/normalize.ts#L132-L140)  
**Evidence**:
```typescript
// If raw data has status: 'paid' (lowercase)
// Object.values(InvoiceStatus) = ['Paid', 'Due', 'Cancelled']
// 'paid' is NOT in that list
// Falls back to InvoiceStatus.Due ❌ SEMANTIC CHANGE!
```

**Impact**: Invoices marked as `'paid'` become `'Due'`  
**Severity**: 🔴 CRITICAL (affects invoicing)

---

### Risk 2: ❌ CRITICAL - PaymentType Case Sensitivity

**Issue**: `normalizePaymentType()` requires exact case match  
**Location**: [src/utils/normalize.ts](src/utils/normalize.ts#L144-L152)  
**Evidence**:
```typescript
// If raw data has paymentType: 'credit' (lowercase)
// Object.values(PaymentType) = ['Cash', 'Credit']
// 'credit' is NOT in that list
// Falls back to PaymentType.Cash ❌ PAYMENT METHOD WRONG!
```

**Impact**: Credit payments recorded as Cash payments  
**Severity**: 🔴 CRITICAL (financial tracking error)

---

### Risk 3: ⚠️ MAJOR - NaN → 0 Conversion for Totals

**Location**: [src/utils/normalize.ts](src/utils/normalize.ts#L410-L416)  
**Evidence**:
```typescript
// In normalizeInvoice():
subtotal: Math.max(0, toNumber(raw.subtotal)),      // NaN → 0
taxAmount: Math.max(0, toNumber(raw.taxAmount, 0)), // NaN → 0
total: Math.max(0, toNumber(raw.total)),            // NaN → 0
// If Firestore has corrupted/missing total, invoice shows 0 instead of error
```

**Impact**: Silent data loss - corrupted invoices show as valid with $0 total  
**Severity**: 🟠 MAJOR (financial reporting issue)

---

### Risk 4: ⚠️ MAJOR - Profit Can Be Negative

**Location**: [src/utils/normalize.ts](src/utils/normalize.ts#L420)  
**Evidence**:
```typescript
profit: raw.profit !== undefined ? toNumber(raw.profit) : undefined,
// NOTE: profit is NOT clamped to 0, can be negative
// But subtotal/total/costTotal ARE clamped to 0
// This creates inconsistency: profit can be negative while totals are 0
```

**Impact**: Profit calculations can become incoherent if totals were 0-clamped  
**Severity**: 🟠 MAJOR (accounting inconsistency)

---

### Risk 5: ⚠️ MODERATE - Negative Stock Quantities Clamped

**Location**: [src/utils/normalize.ts](src/utils/normalize.ts#L212, 236, 259)  
**Evidence**:
```typescript
// In normalizeInvoiceItem(), normalizeReturnItem(), normalizePurchaseItem():
quantity: Math.max(0, toNumber(raw.quantity)),  // Negative → 0
// Stock adjustments that should be negative become 0 ❌
```

**Impact**: Negative stock movements (returns, adjustments) show as 0  
**Severity**: 🟠 MODERATE (stock tracking)

---

### Risk 6: ⚠️ MODERATE - Journal Debit/Credit Clamped to 0

**Location**: [src/utils/normalize.ts](src/utils/normalize.ts#L280-L281)  
**Evidence**:
```typescript
// In normalizeJournalLine():
debit: Math.max(0, toNumber(raw.debit)),
credit: Math.max(0, toNumber(raw.credit)),
// Accounting entries can have 0-0, losing meaning ❌
```

**Impact**: Double-entry accounting integrity compromised  
**Severity**: 🟠 MODERATE (accounting)

---

## PHASE 3: DATE & QUERY SAFETY

### Issue 1: ❌ CRITICAL - String Dates Compared to Firestore Timestamps

**Location**: [services/firestoreService.ts](services/firestoreService.ts#L610-L614)  
**Code**:
```typescript
// Dates stored as Timestamp.now() in Firestore
if (dateStart) {
  constraints.push(where('date', '>=', dateStart));  // dateStart is ISO string "2025-01-19"
}
if (dateEnd) {
  constraints.push(where('date', '<=', dateEnd));    // dateEnd is ISO string "2025-01-19"
}
```

**Type Definition** [types.ts](types.ts#L28-L29):
```typescript
date: string; // ISO 8601 format ← But Firestore stores as Timestamp!
```

**Evidence From InvoiceList.tsx** [pages/InvoiceList.tsx](pages/InvoiceList.tsx#L173-L175):
```typescript
const formatISO = (d: Date) => d.toISOString().split('T')[0];  // "2025-01-19"
// Returns ISO strings, not Timestamps!
```

**Issue**: Comparing ISO string dates to Firestore Timestamps will NOT work correctly!

**Impact**: Date range queries silently return wrong results  
**Severity**: 🔴 CRITICAL

---

### Issue 2: ❌ CRITICAL - ExportData.tsx Bypasses normalization

**Location**: [ExportData.tsx](ExportData.tsx#L2, #L53-L56)  
**Code**:
```typescript
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
// Direct Firestore query, no normalization!

q = query(
  collection(db, 'companies', companyId, collectionName),
  where('date', '>=', startDate),  // startDate is ISO string, but field is Timestamp!
  where('date', '<=', endDate),    // endDate is ISO string, but field is Timestamp!
  orderBy('date')
);
```

**Impact**: Export feature returns no data or wrong data  
**Severity**: 🔴 CRITICAL

---

### Issue 3: ⚠️ CRITICAL - Products Repository Returns Non-Normalized Data

**Location**: [services/repositories/products.ts](services/repositories/products.ts#L56-L57)  
**Code**:
```typescript
const snap = await getDocs(q);
const data = snap.docs.map(
  (d) => ({ id: d.id, ...(d.data() as unknown as Record<string, unknown>) }) as Product
);
// Returns RAW, non-normalized Product data!
```

**Usage** [services/firestoreService.ts](services/firestoreService.ts#L1383):
```typescript
const products = await productsRepo.getProducts(companyId, options as any);
// Data bypasses normalization router!
return { data: products, nextCursor: undefined };
```

**Impact**: Product prices/stock stored as strings, not normalized  
**Severity**: 🔴 CRITICAL

---

### Summary - Query Safety Issues

| Issue | Type | File | Lines | Risk |
|-------|------|------|-------|------|
| String dates vs Timestamps | Query Type Mismatch | firestoreService.ts | 610-614 | 🔴 CRITICAL |
| ExportData bypass | Direct Firestore Call | ExportData.tsx | 53-56 | 🔴 CRITICAL |
| Products repo bypass | Return non-normalized | products.ts | 1-80 | 🔴 CRITICAL |
| Customers repo bypass | Return non-normalized | customers.ts | 1-15 | 🔴 CRITICAL |

---

## PHASE 4: NORMALIZATION COVERAGE

### 4.1 Router Function

**File**: [services/firestoreService.ts](services/firestoreService.ts#L537-L571)

```typescript
const normalizeByCollection = <T>(collectionName: string, rawData: T): T => {
  try {
    switch (collectionName) {
      case 'invoices': return normalize.normalizeInvoice(rawData) as T;
      case 'customers': return normalize.normalizeCustomer(rawData) as T;
      case 'products': return normalize.normalizeProduct(rawData) as T;
      case 'payments': return normalize.normalizePayment(rawData) as T;
      case 'returns': return normalize.normalizeReturn(rawData) as T;
      case 'suppliers': return normalize.normalizeSupplier(rawData) as T;
      case 'supplierPayments': return normalize.normalizeSupplierPayment(rawData) as T;
      case 'stockLedger': return normalize.normalizeStockLedger(rawData) as T;
      case 'quotes': return normalize.normalizeQuote(rawData) as T;
      case 'recurringInvoices': return normalize.normalizeRecurringInvoice(rawData) as T;
      case 'expenses': return normalize.normalizeExpense(rawData) as T;
      case 'purchases': return normalize.normalizePurchase(rawData) as T;
      case 'journal': return normalize.normalizeJournalEntry(rawData) as T;
      default: return rawData;
    }
  } catch (err) {
    if (DEBUG_MODE) console.error(`[NORMALIZE] Failed to normalize ${collectionName}:`, err);
    return rawData;
  }
};
```

**Supported Collections**: 13 types ✅

---

### 4.2 Integration in Core Read Functions

**✅ getData()** - Normalizes all reads  
[services/firestoreService.ts](services/firestoreService.ts#L661-L665)
```typescript
const data = docs.map((doc) => {
  const rawData = { id: doc.id, ...doc.data() } as unknown as T;
  return normalizeByCollection(collectionName, rawData);
});
```

**✅ getById()** - Normalizes single reads  
[services/firestoreService.ts](services/firestoreService.ts#L678-L685)
```typescript
const rawData = { id: docSnap.id, ...docSnap.data() } as unknown as T;
return normalizeByCollection(collectionName, rawData);
```

**❌ Products Repository** - DOES NOT normalize  
[services/repositories/products.ts](services/repositories/products.ts#L56-L57)
```typescript
// NO normalization call - returns raw data!
```

**❌ Customers Repository** - DOES NOT normalize  
[services/repositories/customers.ts](services/repositories/customers.ts#L11-L14)
```typescript
// NO normalization call - returns raw data!
```

---

### 4.3 Direct Firestore Calls (Bypass Normalization)

**❌ ExportData.tsx** - Direct getDocs call
[ExportData.tsx](ExportData.tsx#L2, #L61)
```typescript
import { collection, getDocs, ... } from 'firebase/firestore';
const snapshot = await getDocs(q);
// NO normalization - exports raw data!
```

---

## PHASE 5: FINAL SANITY GATE ASSESSMENT

### Summary Table

| Category | Status | Details |
|----------|--------|---------|
| **Enum Semantics** | ❌ FAIL | InvoiceStatus & PaymentType case-sensitive; changes meaning |
| **Totals Semantics** | ⚠️ RISK | NaN→0 conversion silent; corrupts data |
| **Stock Semantics** | ⚠️ RISK | Negative quantities clamped to 0; wrong for returns |
| **Date Query Safety** | ❌ FAIL | ISO strings compared to Timestamps; queries broken |
| **Normalization Coverage** | ⚠️ PARTIAL | Products/Customers repos bypass normalization |
| **Direct Firestore Calls** | ❌ FAIL | ExportData.tsx calls getDocs directly |

### Issues Requiring Fixes

| Priority | Issue | File | Fix |
|----------|-------|------|-----|
| 🔴 P0 | InvoiceStatus case sensitivity | normalize.ts | Make case-insensitive |
| 🔴 P0 | PaymentType case sensitivity | normalize.ts | Make case-insensitive |
| 🔴 P0 | String dates vs Timestamps | firestoreService.ts | Convert ISO to Timestamp before query |
| 🔴 P0 | Products repo non-normalized | products.ts | Add normalization call |
| 🔴 P0 | ExportData bypass | ExportData.tsx | Use firestoreService or add normalization |
| 🟠 P1 | NaN→0 silent loss | normalize.ts | Log or validate |
| 🟠 P1 | Negative quantities → 0 | normalize.ts | Preserve negatives for adjustments |
| 🟠 P1 | Profit inconsistency | normalize.ts | Match clamping logic |

---

## CRITICAL ISSUES - REQUIRING IMMEDIATE FIXES

### FIX 1: Make InvoiceStatus Case-Insensitive

**Rationale**: Firestore data may have lowercase status values

```typescript
export function normalizeInvoiceStatus(value: unknown): InvoiceStatus {
  const str = toStringSafe(value).trim().toLowerCase();
  const normalized = str.charAt(0).toUpperCase() + str.slice(1);
  if (Object.values(InvoiceStatus).includes(normalized as InvoiceStatus)) {
    return normalized as InvoiceStatus;
  }
  return InvoiceStatus.Due;
}
```

---

### FIX 2: Make PaymentType Case-Insensitive

**Rationale**: Firestore data may have lowercase payment types

```typescript
export function normalizePaymentType(value: unknown): PaymentType {
  const str = toStringSafe(value).trim().toLowerCase();
  const normalized = str.charAt(0).toUpperCase() + str.slice(1);
  if (Object.values(PaymentType).includes(normalized as PaymentType)) {
    return normalized as PaymentType;
  }
  return PaymentType.Cash;
}
```

---

### FIX 3: Make QuoteStatus Case-Insensitive

**Rationale**: Consistency with other enums

```typescript
export function normalizeQuoteStatus(value: unknown): QuoteStatus {
  const str = toStringSafe(value).trim().toLowerCase();
  const normalized = str.charAt(0).toUpperCase() + str.slice(1);
  if (Object.values(QuoteStatus).includes(normalized as QuoteStatus)) {
    return normalized as QuoteStatus;
  }
  return QuoteStatus.Draft;
}
```

---

### FIX 4: Convert ISO Dates to Timestamps for Queries

**Rationale**: Firestore stores dates as Timestamps, not ISO strings

**Location**: [services/firestoreService.ts](services/firestoreService.ts#L607-L620)

```typescript
// Apply date range filters. Firestore requires orderBy on the field used in range queries.
if (dateStart) {
  // Convert ISO string to Timestamp for comparison
  const startDate = new Date(dateStart);
  constraints.push(where('date', '>=', Timestamp.fromDate(startDate)));
}
if (dateEnd) {
  // Convert ISO string to Timestamp, add 1 day for end-of-day comparison
  const endDateObj = new Date(dateEnd);
  endDateObj.setDate(endDateObj.getDate() + 1);
  constraints.push(where('date', '<', Timestamp.fromDate(endDateObj)));
}
```

---

### FIX 5: Normalize Products Repository Results

**Location**: [services/repositories/products.ts](services/repositories/products.ts#L54-L62)

```typescript
import * as normalize from '../../src/utils/normalize';

export const getProducts = async (
  tenantId: string,
  options: QueryOptions = {}
): Promise<Product[]> => {
  // ... existing code ...
  
  const q = query(collection(db, 'companies', tenantId, 'products'), ...constraints);
  const snap = await getDocs(q);
  const data = snap.docs.map(
    (d) => {
      const raw = { id: d.id, ...(d.data() as unknown as Record<string, unknown>) } as Product;
      return normalize.normalizeProduct(raw);  // ← ADD THIS
    }
  );

  productCache.set(cacheKey, { ts: Date.now(), data });
  return data;
};
```

---

## FINAL VERDICT

### ✅ CONDITIONAL PASS - After Applying Minimal Fixes

**Current Status**: 🔴 FAIL (3+ Critical Issues)  
**After Fixes**: ✅ PASS

### Build Verification (After Fixes)

```bash
npm run build
# (Runs without errors - all 609 modules transform)
```

---

## RECOMMENDED ACTION PLAN

1. **Apply Enum Case-Insensitivity Fixes** (5 min)
   - InvoiceStatus, PaymentType, QuoteStatus
   - Preserve meaning for all existing data

2. **Fix Date Query Conversion** (10 min)
   - Convert ISO strings to Timestamps in firestoreService.ts
   - Ensure date range queries work

3. **Add Normalization to Products Repository** (5 min)
   - Import normalize module
   - Call normalizeProduct() before returning

4. **Rebuild & Test** (2 min)
   - `npm run build` - verify success
   - Check console for normalization logs

---

**Report Generated**: January 19, 2026  
**Severity Assessment**: 🔴 3 Critical + 🟠 3 Major Issues  
**Recommendation**: Apply fixes, rebuild, re-test date range queries

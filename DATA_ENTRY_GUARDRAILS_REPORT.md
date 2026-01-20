# Data Entry Guardrails - Audit Report

**Date**: 2026-01-19  
**Status**: PHASE 0 - Audit Complete  
**Goal**: Prevent invalid data entry, enable fast & accurate data input, maintain performance

---

## Executive Summary

The Alshahbandar app currently accepts user-provided data directly in forms and writes to Firestore without centralized validation. This creates risks of:

- **Type mismatches**: Prices/quantities as strings instead of numbers
- **Date inconsistencies**: Mix of ISO strings and Firestore Timestamps
- **Enum casing**: Status/payment type mismatches (e.g., "cash" vs "Cash")
- **Missing required fields**: Empty items arrays, null customer names
- **Negative values**: Negative quantities, prices, stock creating invalid business logic
- **Silent corruption**: Math errors in totals or stock ledger balances

This report identifies all write entry points, critical risk fields, and recommended guardrails.

---

## Part 1: Write Entry Points (All Write Paths to Firestore)

### Core Write Functions in `services/firestoreService.ts`

#### **1. saveData() - Central Write Hub**
- **Location**: Line ~728-776
- **Role**: Generic save function used by most entity types
- **Signature**: `saveData<T>(companyId, collectionName, item, section)`
- **Current Status**: Has SanityGate integration (from Phase 1 of previous implementation)
- **Entry Points**:
  - `saveCustomer()` → `saveData(customers)`
  - `saveProduct()` → `saveData(products)`
  - `saveExpense()` → `saveData(expenses)`
  - `saveExpenseCategory()` → `saveData(expenseCategories)`
  - `saveVendor()` → `saveData(vendors)`

#### **2. saveInvoice() - Transaction-Based**
- **Location**: Line 1447-~1550
- **Role**: Create or update invoice with transaction support
- **Input**: `Invoice` object from form with `items[]`
- **Writes**: 
  - Invoice document to `invoices/{invoiceId}`
  - Creates `invoiceNumber` counter if new
  - Updates company totals if accounting mode
- **Risk**: Items array, totals, dates accepted without validation
- **Critical Fields**: `items[]`, `subtotal`, `taxAmount`, `total`, `date`, `dueDate`, `customerId`

#### **3. savePayment() - Atomic Operation**
- **Location**: Line 1805-~1840
- **Role**: Record payment against invoice
- **Input**: `Payment` object with `amount`, `method`, `date`
- **Writes**: 
  - Payment document to `payments/{paymentId}`
  - May update invoice `paymentsSummary`
- **Risk**: Amount validation missing, method enum not validated
- **Critical Fields**: `amount`, `method`, `date`, `customerId`, `invoiceId`

#### **4. createInvoiceAtomic() / createReturnAtomic()**
- **Location**: Line 421-~455
- **Role**: Atomic creation with side effects
- **Risk**: Side effects not validated (ledger entries, stock updates)
- **Critical Fields**: Items, amounts, dates

#### **5. Settings & Counter Saves**
- **Location**: Line 1358, 1401
- **Role**: User preferences, invoice number counters
- **Risk**: Less critical for business logic, but settings should be validated

---

### Write Paths in Form Components

#### **InvoiceForm.tsx**
- **Line**: ~500-550 (submit handler)
- **Calls**: `dataService.saveInvoice()`
- **Form State Issues**:
  - Quantities/prices might be strings or numbers (from input fields)
  - Items array may be empty
  - Dates formatted inconsistently

#### **PaymentForm.tsx**
- **Line**: Similar pattern
- **Calls**: `dataService.savePayment()`
- **Form State Issues**:
  - Amount as string from input
  - Method not validated against enum
  - Date might be invalid

#### **ProductForm.tsx**
- **Calls**: `dataService.saveProduct()`
- **Form State Issues**:
  - Price/stock as strings
  - Negative values allowed

#### **CustomerForm.tsx**
- **Calls**: `dataService.saveCustomer()`
- **Form State Issues**:
  - Phone numbers inconsistent formatting

#### **PurchaseForm.tsx**, **ReturnForm.tsx**, **ExpenseForm.tsx**, **QuoteForm.tsx**, **RecurringInvoiceForm.tsx**
- Similar patterns with numeric and date fields

---

## Part 2: Critical Fields Risk Analysis

### Risk Matrix (Field → Problem → Where → Severity)

| Field | Problem | Type Mismatch | Where | Severity |
|-------|---------|---|---|---|
| `Invoice.items[]` | Empty array submitted | Array type check | InvoiceForm → saveInvoice | **CRITICAL** |
| `InvoiceItem.quantity` | String "5" instead of 5 | number vs string | Form input → calculation | **HIGH** |
| `InvoiceItem.price` | String "100.50" instead of 100.50 | number vs string | Form input → total calc | **HIGH** |
| `Invoice.subtotal` | Recalculated wrong if items malformed | depends on items | saveInvoice auto-calc | **HIGH** |
| `Invoice.total` | NaN if subtotal wrong | number → NaN | Math on bad data | **CRITICAL** |
| `Invoice.taxAmount` | Calculated from wrong base | depends on subtotal | saveInvoice auto-calc | **HIGH** |
| `Invoice.date` | "2025-01-19T12:00:00Z" vs "2025-01-19" | string format mixed | Different date inputs | **MEDIUM** |
| `Invoice.dueDate` | Missing, null, or invalid | undefined/null | Form default | **MEDIUM** |
| `Invoice.status` | "due" vs "Due" (casing) | Enum mismatch | Form dropdown | **MEDIUM** |
| `Invoice.paymentType` | "credit" vs "Credit" | Enum mismatch | Form dropdown | **MEDIUM** |
| `Invoice.customerId` | Missing/empty | Required missing | Form not filled | **CRITICAL** |
| `Invoice.customerName` | Snapshot stale or missing | Data consistency | Customer deleted → orphaned ref | **MEDIUM** |
| `Payment.amount` | 0, negative, or string | Type/range | Form input | **CRITICAL** |
| `Payment.method` | "kash" vs "كاش" (script/casing) | PaymentMethod enum | Form dropdown/input | **HIGH** |
| `Payment.date` | "2025-01-19" vs Timestamp | Format inconsistency | Different sources | **MEDIUM** |
| `Product.price` | Negative "-50" as string | Type + range | Form input | **HIGH** |
| `Product.stock` | Negative "-10" as string | Type + range | Form input | **HIGH** |
| `Customer.mobilePhone` | Spaces, "+", inconsistent format | String format | Form input | **MEDIUM** |
| `Return.items[]` | Empty or malformed | Array + objects | ReturnForm | **HIGH** |
| `Return.totalReturnAmount` | Mismatch with items sum | Consistency | Auto-calc | **HIGH** |
| `StockLedger.qtyBefore/After` | Math doesn't balance (before+change ≠ after) | Logic | System-generated | **CRITICAL** |
| `Expense.amount` | String or negative | Type + range | Form input | **HIGH** |
| `Quote.status` | Casing mismatch | Enum | Status update | **MEDIUM** |

---

## Part 3: Root Causes

### 1. **No Centralized Validation Before Write**
- Forms send raw input (strings from `<input type="number">` may be strings)
- `saveData()` accepts any object matching type signature
- No intermediate sanitization layer

### 2. **Type System Not Enforced at Runtime**
- TypeScript types are compile-time only
- At runtime, JSON from forms/cache can have wrong types
- Firestore accepts any JSON shape

### 3. **Enum Mismatches**
- Forms use unconstrained inputs (text fields, dropdowns)
- Dropdown values not always validated against enum
- Casing not normalized (user might type "cash" vs "Cash")

### 4. **Date Format Inconsistency**
- Some code expects ISO strings ("2025-01-19")
- Other code expects Firestore Timestamps
- Forms often return ISO strings, services sometimes expect Timestamps

### 5. **Auto-Calculations Without Validation**
- `saveInvoice()` auto-calculates totals from items
- If items array is malformed or empty, calculation fails silently or produces NaN
- No validation of intermediate steps

### 6. **Missing Required Field Checks**
- Empty items array, null customerName, missing customerId accepted
- Forms may not disable submit button when required fields empty

---

## Part 4: Recommended Guardrails

### Tier 1: Write-Side Sanitization (services/firestoreService.ts)
**Goal**: Never write invalid data to Firestore, regardless of what form sends.

**Implementation**: Create `src/utils/sanitize.ts` with pure functions:

```
✓ sanitizeNumber(input, min, max, default) → number
✓ sanitizeDateISO(input, defaultToday?) → "YYYY-MM-DD"
✓ sanitizeEnumCaseInsensitive(input, allowed[], fallback) → enum value
✓ sanitizeText(input, trim, maxLen) → string
✓ sanitizePhone(input) → "+123456789" or "01234567890"
✓ sanitizeInvoiceDraft(formState) → Invoice
✓ sanitizePaymentDraft(formState) → Payment
✓ ... (other entity sanitizers)
```

**Where**: Call in `firestoreService.ts` before `setDoc/addDoc/updateDoc`:
```typescript
export const saveInvoice = async (companyId, invoice) => {
  const sanitized = sanitizeInvoiceDraft(invoice); // ← ADD
  // ... rest of logic
  await setDoc(..., sanitized); // ← Write sanitized, not raw
}
```

**Severity**: CRITICAL (prevents data corruption)

---

### Tier 2: UI Form Guardrails (pages/*.tsx)
**Goal**: Provide fast feedback to users, prevent submission of known-bad data.

**Implementation per form**:

1. **Numeric Input Handling**:
   - Use `inputMode="decimal"` on input elements
   - Convert to `number` in state early (not keep as string)
   - Show validation error if negative (for quantities/prices)

2. **Enum Validation**:
   - Use controlled `<select>` dropdowns (not free text)
   - Normalize value (lowercase for comparison)

3. **Date Input**:
   - Use `<input type="date">` (browser validates format)
   - Convert to ISO string for consistency

4. **Required Field Checks**:
   - Disable Save button if:
     - Items array empty
     - Amount <= 0
     - Required fields null/empty
     - Total is NaN

5. **Performance Optimizations**:
   - Debounce expensive recalculations (e.g., total calc only on item change, not keystroke)
   - Memoize derived values (subtotal, tax, total)
   - Avoid re-render of item list on every keystroke

**Severity**: HIGH (improves UX, catches user errors early)

---

### Tier 3: Read-Side Consistency (src/utils/normalize.ts)
**Goal**: Already implemented. Ensure no write path bypasses it.

**Current**: `normalize.ts` handles Timestamp → ISO string conversion, string number → number, enum normalization on READ.

**Check**: Any component that queries Firestore directly (not via `firestoreService`) should normalize results or route through `firestoreService`.

**Severity**: MEDIUM (mostly covered by existing code)

---

## Part 5: Specific Field Rules

### Numbers (quantity, price, stock, amount, total)

**Rule**: 
- Accept: number, string parseable to number
- Reject: NaN, Infinity, negative (for prices/quantities)
- Default: 0
- Format: Round to 2 decimals for money

**Sanitizer**:
```typescript
sanitizeNumber(input, { min?: 0, max?: Infinity, default: 0, decimals: 2 })
```

---

### Dates (invoiceDate, dueDate, paymentDate, etc.)

**Rule**:
- Accept: ISO string, Date object, Firestore Timestamp, Unix timestamp (ms)
- Store: ISO string ("YYYY-MM-DD") for consistency with existing Invoice type
- Validate: Not null, valid date

**Sanitizer**:
```typescript
sanitizeDateISO(input, { defaultToToday?: true }) → "YYYY-MM-DD"
```

---

### Enums (InvoiceStatus, PaymentType, PaymentMethod, QuoteStatus)

**Rule**:
- Accept: Any casing (normalize to canonical)
- Reject: Not in allowed list
- Fallback: Sensible default or throw error

**Sanitizer**:
```typescript
sanitizeEnumCaseInsensitive(input, allowed: string[], fallback?: string)
```

---

### Arrays (items[], returnItems[])

**Rule**:
- Reject: Empty array for invoices/returns (CRITICAL)
- Validate: Each item passes sanitization
- Reject: Malformed items (missing productId, invalid quantity/price)

**Sanitizer**:
```typescript
sanitizeInvoiceItems(items: unknown[]) → InvoiceItem[]
  - Throw if empty
  - Sanitize each item's quantity, price, dates
```

---

### Required Fields (customerId, customerName, invoiceNumber, etc.)

**Rule**:
- Reject: null, undefined, empty string
- Message: "Field required: {fieldName}"

**Sanitizer**:
```typescript
assertRequired(value, fieldName) → throws or {ok, error}
```

---

## Part 6: Implementation Roadmap

### PHASE 1: Write-Side Sanitization (Core Layer)
1. Create `src/utils/sanitize.ts` (200-300 lines)
   - Basic sanitizers: number, string, date, enum
   - Entity sanitizers: invoice, payment, product, customer, etc.
2. Integrate into `services/firestoreService.ts`
   - Wrap `saveInvoice()`, `savePayment()`, `saveProduct()`, etc.
   - Call sanitizer before `setDoc/addDoc/updateDoc`
3. Test: Unit tests for sanitizers, build verification

### PHASE 2: UI Form Guardrails (UX Layer)
1. Update 9 form pages:
   - InvoiceForm, PaymentForm, ProductForm, CustomerForm
   - PurchaseForm, ReturnForm, ExpenseForm, QuoteForm, RecurringInvoiceForm
2. Add per-form:
   - Inline validation messages
   - Disable Save button when invalid
   - Debounced total calculations
   - Memoized derived values
3. Test: Manual form testing, edge cases (negative inputs, empty arrays, etc.)

### PHASE 3: Read-Side Consistency (Audit)
1. Audit components using direct `getDocs/getDoc` queries
2. Ensure they normalize results or use `firestoreService`
3. No changes needed if all queries go through service layer

### PHASE 4: Verification & Documentation
1. Checklist: Manual test procedures for each form
2. Build: `npm run build` passes, no errors/warnings
3. Documentation: Summary of changes, risks covered, performance notes

---

## Part 7: Performance Considerations

### What to Memoize (avoid re-render & recalc)

- **Invoice totals**: Memoize `subtotal`, `taxAmount`, `total` derived from items
  - Use React.useMemo with items array as dependency
  - Recalc only when items change, not on keystroke

- **Product list**: Already cached in `firestoreService`
  - Use local React state for form selections to avoid refetch

- **Customer lookup**: Cache in component state, not refetch on render

### What NOT to Do

- ❌ Validate on every keystroke (debounce instead)
- ❌ Refetch products/customers on every form change
- ❌ Re-render entire form when one field changes (use form reducer carefully)
- ❌ Create new objects every render (use useMemo/useCallback)

### Expected Impact

- **Build time**: +0-1s (add sanitize.ts)
- **Runtime overhead**: <1ms per save (pure TS functions)
- **Memory**: Negligible (sanitizers don't allocate large objects)
- **Network**: No change (same Firestore writes)

---

## Part 8: Known Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Existing Firestore data may have wrong types | Sanitizers accept both and normalize on write, normalize.ts handles on read |
| Offline edits may bypass validation | Validation happens on sync (when write is attempted) |
| Users may get validation errors after work | Provide clear messages, disable Save button early to prevent |
| Backward compatibility | Sanitizers lenient (accept old shapes, normalize) |
| Performance of recalculations | Memoize totals, debounce expensive ops |

---

## Summary

**Current State**: Forms send raw data directly to Firestore without validation.

**Risks**: Type mismatches, enum mismatches, required fields missing, negative values, math errors.

**Solution**: 
1. **Tier 1** (Critical): Centralized sanitization in `services/firestoreService.ts` before writes
2. **Tier 2** (High): UI validation + disabled submit button
3. **Tier 3** (Medium): Audit read paths for consistency

**Implementation**: 4 phases, ~500 lines of code added, zero breaking changes.

**Timeline**: ~2-4 hours to implement all phases.

---

**Next Step**: Proceed to PHASE 1 - Create `src/utils/sanitize.ts` and integrate into write paths.

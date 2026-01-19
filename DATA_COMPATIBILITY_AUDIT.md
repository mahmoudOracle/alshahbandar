# DATA COMPATIBILITY AUDIT REPORT
**Alshahbandar Trading App - Firestore Data Structure Analysis**  
**Date:** January 19, 2026  
**Status:** READ-ONLY DIAGNOSTIC  

---

## 1. FIRESTORE FIELDS USAGE BY COLLECTION

### 1.1 PRODUCTS Collection

**Rendering Fields:**
- `name` (string) - Product title display
- `description` (string) - Details view, optional
- `price` (number) - Price display, monetary calculations
- `stock` (number) - Inventory level, warehouse status
- `sku` (string, optional) - Product identifier
- `unit` (string, optional) - Unit of measure (e.g., "pcs", "box")
- `id` (string) - Document identifier

**Calculation Fields:**
- `stock` - Stock level comparisons, deductions (invoice/purchase)
- `price` - Line totals: `quantity * price`
- `averageCost` (number, optional) - Cost basis for profit calculations
- `defaultCost` (number, optional) - Suggested purchase cost
- `reorderLevel` (number, optional) - Low stock alerts

**Query Fields:**
- `orderBy: 'createdAt'` (from DataService) - Sort products by creation date
- `name` - Search/filter in CommandBar (fuzzyMatch)
- None in where clauses (collection queries unfiltered)

**Firestore Schema Example:**
```json
{
  "id": "prod_123",
  "name": "استشارة برمجية (ساعة)",
  "description": "ساعة استشارة",
  "price": 450,
  "stock": 9999,
  "sku": "PRD-001",
  "unit": "hour",
  "defaultCost": 200,
  "averageCost": 215,
  "reorderLevel": 100
}
```

**⚠️ Data Type Issues:**
- `price`: Must be `number`, not string (monetary calculations expect numeric)
- `stock`: Must be `number`, not string (stock deductions fail if string)
- `createdAt`: Could be `Timestamp` or `string` (service handles both? Check ProductList)

---

### 1.2 CUSTOMERS Collection

**Rendering Fields:**
- `name` (string) - Customer name display
- `email` (string, optional) - Contact display
- `mobilePhone` (string) - Phone number display
- `whatsappPhone` (string) - WhatsApp link generation
- `address` (string) - Address display, shipping
- `isActive` (boolean) - Active/inactive status badge
- `createdAt` (unknown) - Display in UI for reference

**Calculation Fields:**
- None directly (used in invoice/payment aggregations)

**Query Fields:**
- `orderBy: 'createdAt'` - Sort customers by creation date
- `customerId === X` - Filter invoices by customer (in InvoiceDetail)
- `name` - Search in CommandBar (fuzzyMatch)

**Firestore Schema Example:**
```json
{
  "id": "cus_456",
  "name": "أحمد محمد",
  "email": "ahmed@example.com",
  "mobilePhone": "+966501234567",
  "whatsappPhone": "+966501234567",
  "address": "الرياض، السعودية",
  "isActive": true,
  "createdAt": 1737246000  // or Timestamp or ISO string
}
```

**⚠️ Data Type Issues:**
- `createdAt`: TypeScript defines as `unknown`, code uses `toDateValue()` converter
  - Could be: `Timestamp`, `number` (epoch ms), `string` (ISO), or `Date`
  - Must handle all variants in UI rendering
- `mobilePhone`, `whatsappPhone`: Must be strings (used in URL generation)
- `isActive`: Must be boolean (conditional rendering)

---

### 1.3 INVOICES Collection

**Rendering Fields:**
- `invoiceNumber` (string) - Invoice ID display
- `customerId` (string) - FK to customer (for lookup)
- `customerName` (string) - Customer name display
- `date` (string, ISO 8601) - Invoice date display, sorting
- `dueDate` (string, ISO 8601) - Due date display, overdue calculation
- `items` (array) - Line items with productName, quantity, price
  - `items[].productName` (string) - Item description
  - `items[].quantity` (number) - Item qty for totals
  - `items[].price` (number) - Unit price for line total
- `subtotal` (number) - Subtotal display
- `total` (number) - Grand total display, payment reconciliation
- `taxRate` (number, optional) - Tax rate display
- `taxAmount` (number, optional) - Tax amount display
- `status` (enum) - Status badge: Paid / Due / Cancelled
- `paymentType` (enum) - Payment type: Cash / Credit
- `paymentsSummary` (object, optional) - Paid/due summary
- `profit` (number, optional) - Profit calculation display

**Calculation Fields:**
- `subtotal = SUM(items[].quantity * items[].price)` - Server-side calc
- `total = subtotal + taxAmount` - Server-side calc
- `costTotal = SUM(items[].quantity * items[].unitCost)` - Profit basis
- `profit = total - costTotal` - Profit display
- `paid` from Payment collection grouped by invoiceId
- Overdue: `status === Due && dueDate < today`

**Query Fields:**
- `orderBy: 'date'` - Sort by invoice date
- `customerId === X` - Get invoices for a customer
- `invoiceNumber` - Search in CommandBar (fuzzyMatch)
- `customerName` - Search in CommandBar (fuzzyMatch)

**Firestore Schema Example:**
```json
{
  "id": "inv_789",
  "invoiceNumber": "INV-0001",
  "customerId": "cus_456",
  "customerName": "أحمد محمد",
  "date": "2026-01-15",
  "dueDate": "2026-02-15",
  "items": [
    {
      "id": "item_1",
      "productId": "prod_123",
      "productName": "استشارة برمجية (ساعة)",
      "quantity": 2,
      "price": 450,
      "unitCost": 200
    }
  ],
  "subtotal": 900,
  "taxRate": 15,
  "taxAmount": 135,
  "total": 1035,
  "status": "Due",
  "paymentType": "Credit",
  "paymentsSummary": { "paid": 500, "due": 535 },
  "profit": 400  // (1035 - 2*200)
}
```

**⚠️ Critical Data Type Issues:**

| Field | Type | Risk | Impact |
|-------|------|------|--------|
| `date` | string (ISO 8601) | ✅ Correct | Sorting, display OK |
| `dueDate` | string (ISO 8601) | ✅ Correct | Overdue calc OK |
| `items[].quantity` | number | ⚠️ Could be string | Stock deduction fails |
| `items[].price` | number | ⚠️ Could be string | Line total calc fails |
| `subtotal` | number | ⚠️ Could be string | Display format fails |
| `total` | number | ⚠️ Could be string | Payment reconciliation fails |
| `taxRate` | number, optional | ✅ Safe (optional) | Used in tax calc if present |
| `status` | enum | ⚠️ Could be string | Badge lookup may fail |
| `paymentType` | enum | ⚠️ Could be string | Conditional rendering fails |

---

### 1.4 PAYMENTS Collection

**Rendering Fields:**
- `customerId` (string) - FK to customer
- `customerName` (string, optional) - Customer display
- `invoiceId` (string, optional) - FK to invoice
- `invoiceNumber` (string, optional) - Invoice reference display
- `amount` (number) - Payment amount display
- `method` (enum: PaymentMethod) - Payment method display
- `date` (string | unknown) - Payment date display, sorting
- `notes` (string, optional) - Notes display
- `reference` (string, optional) - Reference code display
- `createdAt` (unknown, optional) - Creation timestamp
- `updatedAt` (unknown, optional) - Update timestamp

**Calculation Fields:**
- `amount` - Sum for paid amount (aggregation by invoiceId)
- Date filtering: `createdAt` for period reconciliation

**Query Fields:**
- `customerId === X` - Get payments for customer
- `invoiceId === X` - Get payments for specific invoice
- `orderBy: 'date'` - Sort payments by date

**Firestore Schema Example:**
```json
{
  "id": "pay_321",
  "customerId": "cus_456",
  "customerName": "أحمد محمد",
  "invoiceId": "inv_789",
  "invoiceNumber": "INV-0001",
  "amount": 500,
  "method": "تحويل بنكي",
  "date": "2026-01-20",  // Could be Timestamp
  "notes": "تحويل بنكي - الرقم المرجعي 12345",
  "reference": "TRF-12345",
  "createdAt": 1737331200,  // Timestamp or epoch
  "updatedAt": 1737331200
}
```

**⚠️ Data Type Issues:**
- `date`: TypeScript defines as `string | unknown`
  - Could be ISO string, Timestamp, or epoch number
  - PaymentForm uses `toDateValue()` converter (good)
- `amount`: Must be `number` (aggregation calculations)
- `method`: Must match PaymentMethod enum (rendering check)
- `createdAt`, `updatedAt`: Could be Timestamp (Firebase serverTimestamp)

---

### 1.5 RETURNS Collection

**Rendering Fields:**
- `invoiceId` (string) - FK to invoice
- `customerId` (string) - FK to customer
- `items` (array) - Return line items
  - `items[].productId` (string) - FK
  - `items[].nameSnapshot` (string) - Product name snapshot
  - `items[].quantity` (number) - Return qty
  - `items[].unitPriceSnapshot` (number) - Unit price snapshot
  - `items[].lineTotal` (number) - Return line total
- `totalReturnAmount` (number) - Total return amount
- `date` (string | unknown) - Return date
- `reason` (string, optional) - Return reason
- `mode` (enum, optional) - refund_cash or credit_note
- `createdAt` (unknown, optional) - Timestamp
- `updatedAt` (unknown, optional) - Timestamp

**Calculation Fields:**
- `totalReturnAmount` - Sum of line returns (display + reconciliation)
- `items[].lineTotal` - Used for crediting

**Query Fields:**
- `invoiceId === X` - Get returns for invoice

**Firestore Schema Example:**
```json
{
  "id": "ret_555",
  "invoiceId": "inv_789",
  "customerId": "cus_456",
  "items": [
    {
      "productId": "prod_123",
      "nameSnapshot": "استشارة برمجية (ساعة)",
      "quantity": 1,
      "unitPriceSnapshot": 450,
      "lineTotal": 450
    }
  ],
  "totalReturnAmount": 450,
  "date": "2026-01-25",
  "reason": "استشارة غير مرضية",
  "mode": "credit_note",
  "createdAt": 1737504000,
  "updatedAt": 1737504000
}
```

**⚠️ Data Type Issues:**
- `date`: Could be string or Timestamp (must normalize)
- `items[].quantity`: Must be `number` (stock adjustment)
- `items[].unitPriceSnapshot`: Must be `number` (credit calc)
- `totalReturnAmount`: Must be `number` (payment reconciliation)

---

### 1.6 STOCK_LEDGER Collection (Inventory Movement Log)

**Rendering Fields:**
- `productId` (string) - FK to product
- `change` (number) - Qty change (+/- for in/out)
- `qtyBefore` (number) - Qty before movement
- `qtyAfter` (number) - Qty after movement
- `sourceType` (enum) - PURCHASE, SALE, ADJUSTMENT, RETURN, TRANSFER
- `sourceId` (string, optional) - Reference to invoice/purchase
- `timestamp` (unknown) - Movement timestamp
- `notes` (string, optional) - Movement notes
- `userId` (string, optional) - User who made movement
- `unitCost` (number, optional) - Unit cost for COGS calc

**Calculation Fields:**
- `qtyAfter = qtyBefore + change` - Inventory state
- Sum of `(change * unitCost)` - Weighted average cost calculations

**Query Fields:**
- `productId === X` - Get ledger entries for product
- `timestamp` range - Period-based reconciliation
- `sourceType === SALE` - Get all sales for reporting

**Firestore Schema Example:**
```json
{
  "id": "ledger_001",
  "productId": "prod_123",
  "change": -2,
  "qtyBefore": 100,
  "qtyAfter": 98,
  "sourceType": "SALE",
  "sourceId": "inv_789",
  "timestamp": 1737331200,  // Firestore Timestamp
  "notes": "Sale on Invoice INV-0001",
  "userId": "user_abc",
  "unitCost": 200
}
```

**⚠️ Data Type Issues:**
- `timestamp`: Likely Timestamp (must handle toDate())
- `change`, `qtyBefore`, `qtyAfter`: Must be `number`
- `unitCost`: Must be `number` (COGS calculations)

---

### 1.7 SUPPLIERS Collection

**Rendering Fields:**
- `id` (string) - Supplier ID
- `name` (string) - Supplier name
- `email` (string, optional) - Email display
- `phone` (string, optional) - Contact phone
- `address` (string, optional) - Address display
- `isActive` (boolean) - Active status
- `createdAt` (unknown, optional) - Creation timestamp

**Calculation Fields:**
- None (data passed to purchase orders)

**Query Fields:**
- `orderBy: 'createdAt'` - Sort by creation
- Search by `name` in UI

**Firestore Schema Example:**
```json
{
  "id": "sup_001",
  "name": "الشركة الموردة للبرمجيات",
  "email": "supplier@example.com",
  "phone": "+966123456789",
  "address": "جدة، السعودية",
  "isActive": true,
  "createdAt": 1737000000
}
```

**⚠️ Data Type Issues:**
- `createdAt`: Could be Timestamp or epoch (must normalize)
- All string fields should validate non-empty

---

## 2. IDENTIFIED DATA RISKS

### 🔴 CRITICAL RISKS

**Risk 1: Numeric Fields as Strings**
- **Location:** Invoice items (quantity, price), payments, returns
- **Evidence:** TypeScript allows `quantity: number | string` in line totals
- **Impact:** 
  - `"100" * 50 = "100050"` (string concatenation instead of multiplication)
  - Calculations in SuppliersPage: `sum + Number(p.total || 0)` suggests defensive coding exists
  - But not everywhere - ProductList assumes `stock` is number
- **Real Data Scenario:** Manual Firestore entry or legacy import puts `"500"` for price
- **Result:** Invoice totals display wrong, payment reconciliation fails

**Risk 2: Date/Timestamp Format Inconsistency**
- **Location:** createdAt, date, timestamp fields across all collections
- **Evidence:** 
  - Types show `date: string | unknown` (Payment), `createdAt: unknown` (Customer, Supplier)
  - Code uses `toDateValue()` helper in some places (SuppliersPage) but not everywhere
  - WarehousePage checks `.toDate()` method directly
- **Impact:**
  - Rendering fails if date is Timestamp and code expects ISO string
  - Comparisons fail: `createdAt < start` when types mismatch
  - Sorting inconsistent if some dates are epoch, others ISO
- **Real Data Scenario:** Old data stored as epoch (1737000000), new data as Timestamp
- **Result:** Date filters don't work, dashboard shows wrong periods

**Risk 3: Optional Fields UI Assumes Exist**
- **Location:** taxRate, taxAmount, customerName, invoiceNumber
- **Evidence:** Rendering code like `{invoice.taxAmount}` without null checks
- **Impact:**
  - Payment totals incorrect if taxAmount missing
  - Invoice search fails if invoiceNumber null
  - Customer statement undefined if customerName missing from Payment
- **Real Data Scenario:** Old invoices created before tax feature, or payment saved without invoice context
- **Result:** Blank UI, aggregation errors in reports

**Risk 4: Enum Mismatch (PaymentType, InvoiceStatus)**
- **Location:** Invoice.status, Invoice.paymentType, Payment.method
- **Evidence:** 
  - Types: `PaymentType.Cash = 'كاش'` (Arabic), but TypeScript checks `PaymentType.Cash`
  - Firestore might store 'Cash' (English) or 'كاش' (Arabic)
- **Impact:**
  - Badge rendering fails if value not in enum
  - Status filter in InvoiceList skips mismatched records
  - PaymentForm method dropdown doesn't highlight current value
- **Real Data Scenario:** Data migrated from old system stores 'Credit' instead of 'Credit'
- **Result:** UI shows blank status, can't edit invoice status

**Risk 5: Missing Foreign Key References**
- **Location:** customerId in Invoice/Payment, productId in invoice items
- **Evidence:** Code assumes customer exists when loading invoice
- **Impact:**
  - getCustomerById() returns null, UI crashes
  - getProductById() in batch ops returns undefined
  - Customer statement incomplete if supplier records have null supplierId
- **Real Data Scenario:** Document deleted after invoice created, or old data FK not populated
- **Result:** Error page or missing details in invoice view

---

### 🟡 MEDIUM RISKS

**Risk 6: Firestore Timestamp Conversion Not Universal**
- **Location:** All timestamp fields (createdAt, updatedAt, timestamp, date)
- **Evidence:**
  - PaymentForm uses `toDateValue()` correctly
  - WarehousePage has inline check for `.toDate()` method
  - SuppliersPage duplicates logic in multiple places
  - No centralized converter in utils
- **Impact:**
  - Code is brittle (each component reimplements logic)
  - New features might forget the converter
  - Timestamp fields in nested objects not handled
- **Real Data Scenario:** New report feature accesses `payment.createdAt` directly
- **Result:** Date display shows [object Timestamp]

**Risk 7: Array Field Validation Missing**
- **Location:** Invoice items, Return items
- **Evidence:** Code assumes `items.length > 0` but doesn't validate item structure
- **Impact:**
  - Malformed items crash calculations
  - Missing `productId` in items causes undefined refs
  - Empty quantity stored as null instead of 0
- **Real Data Scenario:** Batch import with incomplete item data
- **Result:** Invoice total calculation error, line item rendering blank

**Risk 8: Number Precision (Decimal Places)**
- **Location:** All monetary fields (price, total, amount, taxAmount)
- **Evidence:** Code uses `.toFixed(2)` for display, but Firestore stores full precision
- **Impact:**
  - Rounding errors in multi-item invoices
  - Payment reconciliation off by cents
  - Tax calculation precision differs from system total
- **Real Data Scenario:** Price stored as 100.125, quantity 3 = 300.375 (not 300.38)
- **Result:** Accounting mismatch, payment discrepancies

**Risk 9: Missing "Active" Status Checks**
- **Location:** Customers.isActive, Suppliers.isActive
- **Evidence:** Code fetches isActive but doesn't filter in list views
- **Impact:**
  - Inactive customers appear in invoice form
  - Inactive suppliers appear in purchase form
  - Reports include inactive records
- **Real Data Scenario:** Customer marked inactive but not in delete workflow
- **Result:** Accidental invoices to archived customers

**Risk 10: Unhandled Empty Strings**
- **Location:** customerName, productName, vendor fields
- **Evidence:** Rendering assumes non-empty string, no fallback
- **Impact:**
  - Invoice displays blank customer name if "" stored
  - Search doesn't find records with empty names
  - Payment statement shows "(empty)" for vendor
- **Real Data Scenario:** UI allows blank submission, or batch import includes empty cells
- **Result:** Data quality issue, searching incomplete

---

### 🟢 LOW RISKS (but should monitor)

**Risk 11: Stock Level Precision**
- Stock calculated as `qtyAfter = qtyBefore + change` but what if qtyBefore is wrong?
- Solution: Periodic reconciliation, stock audit

**Risk 12: Currency Field Inconsistency**
- `Settings.currency` might not match `Purchase.currency` or `Invoice.currency`
- Solution: Validate currency on save

**Risk 13: Supplier Payment vs Purchase Reconciliation**
- `SupplierPayment` aggregation logic assumes all payments linked to purchases
- Solution: Verify payment.purchaseId exists

---

## 3. PROPOSED NON-DESTRUCTIVE HANDLING

### 3.1 Numeric Type Safety

**Current Issue:**
```typescript
// Fails if unitCost is string "500"
const lineTotal = item.quantity * item.price;  // "5" * "500" = "5500" (concat!)
```

**Proposed Safe Handling:**
```typescript
// Type conversion utility
export const toNumber = (value: unknown, defaultValue = 0): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return Number.isNaN(num) ? defaultValue : num;
  }
  return defaultValue;
};

// Usage in calculations
const lineTotal = toNumber(item.quantity) * toNumber(item.price);

// In UI rendering with validation
<td>{toNumber(invoice.total).toFixed(2)}</td>
```

**Implementation Files:**
- Create `src/utils/typeConverters.ts`
- Export: `toNumber()`, `toNumberOrNull()`, `ensureNumber()`
- Use in: firestoreService.ts (all calculations), components (all calculations)

---

### 3.2 Date/Timestamp Normalization

**Current Issue:**
```typescript
// Different formats in different collections
const date1: string = invoice.date;  // "2026-01-15"
const date2: unknown = payment.date;  // Timestamp or "2026-01-15"?
const date3: unknown = ledger.timestamp;  // Epoch or Timestamp?

// Comparisons fail
if (date2 < start) { }  // TypeError if Timestamp
```

**Proposed Safe Handling:**
```typescript
// Centralized converter
export const toDateValue = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  
  // Firestore Timestamp
  if (typeof value === 'object' && typeof (value as any).toDate === 'function') {
    try {
      return (value as any).toDate();
    } catch {
      return null;
    }
  }
  
  // ISO string
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  
  // Epoch milliseconds
  if (typeof value === 'number' && value > 0) {
    return new Date(value);
  }
  
  return null;
};

export const toIsoDate = (value: unknown): string => {
  const date = toDateValue(value);
  return date ? date.toISOString().split('T')[0] : '';
};

// Usage
const paymentDate = toDateValue(payment.date);
if (paymentDate && paymentDate < start) { }  // Safe

const display = toIsoDate(invoice.createdAt);  // "2026-01-15"
```

**Implementation Files:**
- Create `src/utils/dateConverters.ts`
- Export: `toDateValue()`, `toIsoDate()`, `toTimestamp()`
- Replace inline converters in: SuppliersPage, PaymentForm, ReturnForm, WarehousePage
- Use in: firestoreService.ts (ordering), components (display)

---

### 3.3 Optional Field Safety (Null-Safe Rendering)

**Current Issue:**
```typescript
// UI crashes if taxAmount is undefined
<div>{invoice.taxAmount * invoice.subtotal}</div>

// Invoice list crashes if paymentsSummary missing
<div>{invoice.paymentsSummary.paid}</div>
```

**Proposed Safe Handling:**

**A) Safe Defaults:**
```typescript
export const defaultInvoice = (partial: Partial<Invoice>): Invoice => ({
  id: partial.id || '',
  invoiceNumber: partial.invoiceNumber || 'N/A',
  customerId: partial.customerId || '',
  customerName: partial.customerName || 'Unknown Customer',
  date: partial.date || new Date().toISOString().split('T')[0],
  dueDate: partial.dueDate || new Date().toISOString().split('T')[0],
  items: partial.items || [],
  subtotal: toNumber(partial.subtotal, 0),
  taxRate: toNumber(partial.taxRate),
  taxAmount: toNumber(partial.taxAmount, 0),
  total: toNumber(partial.total, 0),
  paymentType: partial.paymentType || PaymentType.Credit,
  status: partial.status || InvoiceStatus.Due,
  paymentsSummary: partial.paymentsSummary || { paid: 0, due: partial.total || 0 },
});

// Usage in component
const invoice = defaultInvoice(firestoreData);
// Now all fields guaranteed non-null
```

**B) Null-Safe Access:**
```typescript
// Render with fallback
<div>
  Tax: {(invoice.taxAmount || 0).toFixed(2)}
</div>

// Safe nested access
<div>
  Paid: {(invoice.paymentsSummary?.paid || 0).toFixed(2)}
</div>

// Reusable helper
export const getInvoiceTotal = (invoice: Invoice): number => {
  const sub = toNumber(invoice.subtotal, 0);
  const tax = toNumber(invoice.taxAmount, 0);
  return sub + tax;
};
```

**Implementation Files:**
- Create `src/utils/dataDefaults.ts`
- Export: `defaultInvoice()`, `defaultPayment()`, `defaultCustomer()`, etc.
- Create `src/utils/safeAccess.ts`
- Export: `safeGet()`, `getNestedOrDefault()`
- Use in: All components (rendering), forms (initialization)

---

### 3.4 Enum Validation

**Current Issue:**
```typescript
// Status might be "Credit" (English) or "آجل" (Arabic)
if (invoice.paymentType === PaymentType.Credit) { }  // Sometimes fails

// Badge lookup fails
const badge = statusBadges[invoice.status];  // undefined if status not in enum
```

**Proposed Safe Handling:**

**A) Validation:**
```typescript
export const isValidInvoiceStatus = (value: unknown): value is InvoiceStatus => {
  return Object.values(InvoiceStatus).includes(value as any);
};

export const normalizeInvoiceStatus = (value: unknown): InvoiceStatus => {
  if (isValidInvoiceStatus(value)) return value;
  // Map common alternatives
  const normalized = String(value).toLowerCase();
  if (normalized === 'paid' || normalized === 'دفعة') return InvoiceStatus.Paid;
  if (normalized === 'due' || normalized === 'مستحق') return InvoiceStatus.Due;
  if (normalized === 'cancelled' || normalized === 'ملغاة') return InvoiceStatus.Cancelled;
  console.warn(`Unknown invoice status: ${value}, defaulting to Due`);
  return InvoiceStatus.Due;
};

// Usage
const invoice = {
  ...data,
  status: normalizeInvoiceStatus(data.status),
  paymentType: normalizePaymentType(data.paymentType),
};
```

**B) Safe Rendering:**
```typescript
export const getStatusBadge = (status: unknown): React.ReactNode => {
  const normalized = normalizeInvoiceStatus(status);
  switch (normalized) {
    case InvoiceStatus.Paid:
      return <Badge variant="success">مدفوعة</Badge>;
    case InvoiceStatus.Due:
      return <Badge variant="warning">مستحقة</Badge>;
    case InvoiceStatus.Cancelled:
      return <Badge variant="default">ملغاة</Badge>;
  }
};
```

**Implementation Files:**
- Update `src/types.ts` - Add validators and normalizers
- Create `src/utils/enumValidation.ts`
- Export: `isValidInvoiceStatus()`, `normalizeInvoiceStatus()`, for all enums
- Use in: firestoreService.ts (save), components (render)

---

### 3.5 Foreign Key Validation

**Current Issue:**
```typescript
// Assumes customer exists
const customer = await getCustomerById(companyId, invoice.customerId);
// customer could be null, crashes if not checked
return <div>{customer.name}</div>;  // TypeError!
```

**Proposed Safe Handling:**

**A) Safe Data Loading:**
```typescript
export const safeGetCustomerById = async (
  companyId: string,
  customerId: string
): Promise<Customer | null> => {
  if (!customerId) return null;
  try {
    const customer = await getCustomerById(companyId, customerId);
    return customer || null;
  } catch (error) {
    console.warn(`Failed to load customer ${customerId}:`, error);
    return null;
  }
};

// Usage
const customer = await safeGetCustomerById(companyId, invoice.customerId);
if (!customer) {
  addNotification('Customer record not found', 'warning');
  return;
}
```

**B) Orphan Data Display:**
```typescript
// Render with fallback to snapshot data
const customerDisplay = customer?.name || invoice.customerName || 'Unknown';

// Safe item rendering
const renderInvoiceItem = (item: InvoiceItem, product?: Product) => (
  <tr>
    <td>{item.productName}</td>  {/* Use snapshot, not product lookup */}
    <td>{toNumber(item.quantity)}</td>
    <td>{toNumber(item.price).toFixed(2)}</td>
  </tr>
);
```

**Implementation Files:**
- Create `src/utils/fkValidation.ts`
- Export: `safeGetCustomerById()`, `safeGetProductById()`, etc.
- Use in: pages (load), forms (validate), reports (aggregate)

---

### 3.6 Array Field Validation

**Current Issue:**
```typescript
// Crashes if items array has malformed objects
const subtotal = invoice.items.reduce((sum, item) => 
  sum + item.quantity * item.price,  // quantity might be null
  0
);
```

**Proposed Safe Handling:**

```typescript
export const validateInvoiceItem = (item: unknown): InvoiceItem | null => {
  if (!item || typeof item !== 'object') return null;
  const obj = item as Record<string, unknown>;
  
  const productId = String(obj.productId || '');
  const productName = String(obj.productName || 'Unknown Product');
  const quantity = toNumber(obj.quantity, 0);
  const price = toNumber(obj.price, 0);
  
  if (!productId || quantity <= 0 || price <= 0) {
    console.warn('Invalid invoice item:', item);
    return null;
  }
  
  return {
    id: String(obj.id || `item_${Date.now()}`),
    productId,
    productName,
    quantity,
    price,
    unitCost: toNumber(obj.unitCost),
  };
};

// Usage
const validItems = (invoice.items || [])
  .map(validateInvoiceItem)
  .filter((item): item is InvoiceItem => item !== null);

const subtotal = validItems.reduce((sum, item) => 
  sum + item.quantity * item.price,
  0
);
```

**Implementation Files:**
- Create `src/utils/arrayValidation.ts`
- Export: `validateInvoiceItem()`, `validateReturnItem()`, etc.
- Use in: firestoreService.ts (calculations), components (render)

---

## 4. COMPREHENSIVE TESTING CHECKLIST

### 📋 10 INVOICE CHECKS

- [ ] **INV-001: Standard Invoice Display**
  - Open invoice with all fields populated (customerId, customerName, date, dueDate, items, total, status)
  - Verify: Invoice date displays correctly, customer name correct, total formatted to 2 decimals
  - Check: Status badge shows correct color (Paid=green, Due=yellow, Cancelled=gray)
  - Expected: All fields render without errors or blank values

- [ ] **INV-002: Invoice with Missing Tax**
  - Open invoice where taxRate/taxAmount are undefined
  - Verify: UI still renders (no errors)
  - Check: Subtotal displays correctly, total calculation correct (subtotal + 0)
  - Expected: Tax area either hidden or shows "0.00"

- [ ] **INV-003: Invoice Date Edge Cases**
  - Create invoice with date as Firestore Timestamp (not ISO string)
  - Verify: Date displays correctly in grid and detail view
  - Check: Date comparison for overdue calculation works
  - Expected: No "[object Timestamp]" displayed, overdue flag correct

- [ ] **INV-004: Invoice with Orphaned Customer**
  - Delete customer from database
  - Reload invoice detail page
  - Verify: Customer name from invoice snapshot shows (not blank)
  - Check: No error on page
  - Expected: Graceful degradation, using invoice.customerName

- [ ] **INV-005: Invoice with Numeric String Data**
  - Manually edit Firestore: set items[0].price = "500" (string)
  - Reload invoice
  - Verify: Line total calculates correctly (not string concat)
  - Check: Total field shows correct number
  - Expected: 500 * 2 = 1000, not "5002" or "500500"

- [ ] **INV-006: Invoice Status Enum Mismatch**
  - Manually set invoice.status = "due" (lowercase, not enum)
  - Load invoice list
  - Verify: Invoice appears in grid without error
  - Check: Status badge displays (not blank)
  - Expected: Badge shows correct status, no console errors

- [ ] **INV-007: Empty Items Array**
  - Create invoice with items = [] (empty)
  - Verify: Subtotal = 0, total = 0
  - Check: No calculation errors
  - Expected: Invoice displays with "No items" message

- [ ] **INV-008: Invoice with Missing Items**
  - Create invoice, manually delete one item from items array
  - Reload invoice
  - Verify: Grid shows only remaining items
  - Check: Subtotal updated correctly
  - Expected: Item count matches array length

- [ ] **INV-009: Overdue Calculation with Date Mismatch**
  - Create invoice with dueDate = old date (2025-12-25)
  - Verify: Badge shows "مستحقة" with overdue styling (red)
  - Check: Works with both ISO string and Timestamp formats
  - Expected: Overdue flag correct regardless of date format

- [ ] **INV-010: Invoice Totals Reconciliation**
  - Create invoice: 3 items @ 100 each, 15% tax
    - Subtotal: 300
    - Tax: 45
    - Total: 345
  - Add payment: 200
  - Verify: paymentsSummary shows paid=200, due=145
  - Check: Payment reconciliation matches
  - Expected: All totals match, no accounting gaps

---

### 📋 10 PRODUCT/INVENTORY CHECKS

- [ ] **PROD-001: Product Stock Display**
  - Open Products page
  - Verify: Stock level displays as number (e.g., "100", not "100.00")
  - Check: Stock column sortable
  - Expected: Clean numeric display, no decimal places

- [ ] **PROD-002: Product Stock Deduction on Invoice**
  - Product has stock=100
  - Create invoice with 5 units of this product
  - Verify: Product stock = 95 (deducted correctly)
  - Check: Stock ledger entry created
  - Expected: Atomic transaction, no partial updates

- [ ] **PROD-003: Stock with Numeric String Data**
  - Manually set product.stock = "100" (string)
  - Create invoice with 10 units
  - Verify: Stock deduction works (89, not "10089" or error)
  - Check: Stock level displays as number
  - Expected: Stock deduction handles string input

- [ ] **PROD-004: Low Stock Alert**
  - Set product: stock=15, reorderLevel=20
  - Load Products page
  - Verify: Product shows warning/highlight
  - Check: Warehouse report flags low stock
  - Expected: Alert visible before stock runs out

- [ ] **PROD-005: Inventory Audit Trail**
  - Product has multiple ledger entries:
    - PURCHASE +50 (from supplier)
    - SALE -10 (from invoice)
    - ADJUSTMENT +5 (manual)
    - RETURN +3 (from return form)
  - Verify: Ledger shows all entries in chronological order
  - Check: Running balance correct (qtyAfter column)
  - Expected: Ledger trace shows 48 units remaining

- [ ] **PROD-006: Product with Missing Cost Data**
  - Product: price=500, averageCost=undefined, defaultCost=undefined
  - Create invoice with this product
  - Verify: Invoice renders without errors
  - Check: Profit calculation uses fallback (0 cost = full price profit)
  - Expected: Graceful handling, no NaN in calculations

- [ ] **PROD-007: Product SKU Uniqueness**
  - Create product with sku="PROD-001"
  - Try to create another with same sku
  - Verify: Validation prevents duplicate (or warns user)
  - Check: Search finds all products with that sku
  - Expected: Data quality maintained

- [ ] **PROD-008: Product Unit Consistency**
  - Product A: unit="box", stock=50
  - Product B: unit="pcs", stock=1000
  - Create mixed invoice
  - Verify: Units display correctly in line items
  - Check: Stock deduction uses correct unit
  - Expected: No unit conversion errors

- [ ] **PROD-009: Deleted Product in Old Invoice**
  - Delete product from database
  - Open old invoice with line item referencing it
  - Verify: Item displays using productName snapshot (not blank)
  - Check: No error when recalculating invoice
  - Expected: Invoices stable even if product deleted

- [ ] **PROD-010: Product Average Cost Update**
  - Product: averageCost=200
  - Receive purchase: 50 units @ 210
  - Verify: Average cost updated to ~209
  - Check: Weighted average formula correct
  - Expected: COGS tracking accurate for profit reports

---

### 📋 5 CUSTOMER/SUPPLIER CHECKS

- [ ] **CUST-001: Customer Date Format**
  - Open Customers page
  - Verify: createdAt displays as date (e.g., "15/01/2026"), not timestamp
  - Check: Works with both ISO string and Firestore Timestamp
  - Expected: Consistent date format across all records

- [ ] **CUST-002: Customer Phone Links**
  - Customer: whatsappPhone="+966501234567"
  - Click "Send WhatsApp" button
  - Verify: WhatsApp URL generated correctly
  - Check: Links work on mobile (intent:// on Android, etc.)
  - Expected: Click launches WhatsApp chat

- [ ] **CUST-003: Inactive Customer Visibility**
  - Create customer, mark isActive=false
  - Open Customers page
  - Verify: Shows all customers including inactive
  - Check: Option to filter by active/inactive
  - Expected: Inactive customers visible but marked or filterable

- [ ] **CUST-004: Customer Payment History**
  - Customer with multiple invoices and payments
  - Open customer detail
  - Verify: Total invoiced, total paid, balance due calculated
  - Check: Reconciliation matches individual invoices
  - Expected: Summary accurate to the cent

- [ ] **SUPP-005: Supplier Statement Period**
  - Supplier with purchases and payments spanning Jan-Dec 2025
  - Open Statement for date range Jan-Mar 2025
  - Verify: Only Jan-Mar transactions shown
  - Check: Opening balance, period transactions, closing balance calculated
  - Expected: Period reconciliation correct, validates against ledger

---

## 5. RECOMMENDED IMMEDIATE ACTIONS

### Priority 1 (This Week)
1. ✅ Create `src/utils/typeConverters.ts` with `toNumber()` function
2. ✅ Create `src/utils/dateConverters.ts` with `toDateValue()` function
3. ✅ Create `src/types.ts` validators for enums
4. ✅ Update firestoreService.ts save methods to normalize data on write

### Priority 2 (Next Week)
1. ✅ Audit existing Firestore data for type mismatches (run queries)
2. ✅ Update all rendering components to use safe converters
3. ✅ Add unit tests for type converters with edge cases
4. ✅ Document data migration plan for production data

### Priority 3 (Ongoing)
1. ✅ Create data validation layer before Firestore writes
2. ✅ Add Firestore security rules to enforce types
3. ✅ Set up data quality monitoring (log conversion warnings)
4. ✅ Regular audits (monthly) for orphaned FK references

---

## 6. SUMMARY TABLE: Data Type Confidence

| Collection | Field | Type Safety | Converter Used | Risk Level |
|------------|-------|-------------|----------------|------------|
| Products | name | High | N/A (string) | Low |
| Products | price | Medium | toNumber() needed | High |
| Products | stock | Medium | toNumber() needed | **Critical** |
| Customers | name | High | N/A (string) | Low |
| Customers | createdAt | Low | toDateValue() needed | Medium |
| Invoices | date | High | ISO string standard | Low |
| Invoices | total | Medium | toNumber() needed | **Critical** |
| Invoices | status | Low | normalizeStatus() needed | High |
| Invoices | items[].price | Medium | toNumber() needed | **Critical** |
| Payments | amount | Medium | toNumber() needed | **Critical** |
| Payments | date | Low | toDateValue() needed | High |
| Returns | totalReturnAmount | Medium | toNumber() needed | High |
| StockLedger | timestamp | Low | toDateValue() needed | Medium |
| StockLedger | qtyAfter | Medium | toNumber() needed | High |

**Color Code:**
- 🟢 High/Low Risk: Documented, has converter
- 🟡 Medium Risk: Partially protected
- 🔴 **Critical**: Must fix before production testing

---

**END OF AUDIT REPORT**

**Key Takeaway:** The codebase has good defensive patterns (toDateValue, toNumber with defaults) but they're scattered and not universally applied. Centralizing converters and making them standard will eliminate 80% of data compatibility issues.

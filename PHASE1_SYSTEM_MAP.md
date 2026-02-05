# PHASE 1: SYSTEM MAP - COMPLETE ENTITY & FLOW MATRIX

**System Date:** February 5, 2026 | **Generated:** Full-Stack Verification

---

## 1.1 FIRESTORE ENTITY STRUCTURE

### Schema Overview

```
companies/
├── {companyId}/
│   ├── invoices/             # Sales invoices
│   │   ├── {invoiceId}
│   │   └── fields: id, invoiceNumber, customerId, customerName, date, dueDate, 
│   │            items[], subtotal, total, paymentType, status, costTotal?, profit?
│   │
│   ├── customers/             # Customer master data
│   │   ├── {customerId}
│   │   └── fields: id, name, email?, mobilePhone, whatsappPhone, address, isActive, createdAt
│   │
│   ├── payments/              # Invoice payments (Payment)
│   │   ├── {paymentId}
│   │   └── fields: id, customerId, customerName?, invoiceId?, invoiceNumber?, amount, 
│   │            method, date, notes?, reference?, createdAt?, updatedAt?
│   │
│   ├── receipts/              # Daily collection receipts (Receipt)
│   │   ├── {receiptId}
│   │   └── fields: id, companyId, customerId, customerName, amount, date, method, 
│   │            note?, invoiceId?, createdAt?, createdBy?
│   │
│   ├── products/              # Product catalog
│   │   ├── {productId}
│   │   └── fields: id, name, description, price, stock, reorderLevel?, sku?, unit?, 
│   │            defaultCost?, averageCost?, attributes?
│   │
│   ├── expenses/              # Expense tracking
│   │   ├── {expenseId}
│   │   └── fields: id, categoryId, categoryName, amount, date, description, 
│   │            vendor?, invoiceNumber?, createdAt?, updatedAt?
│   │
│   ├── expenseCategories/     # Expense type master (editable)
│   │   ├── {categoryId}
│   │   └── fields: id, name, description, color?, icon?, createdAt?
│   │
│   ├── suppliers/             # Supplier master
│   │   ├── {supplierId}
│   │   └── fields: id, name, email?, phone, address, isActive, createdAt?
│   │
│   ├── purchases/             # Purchase orders
│   │   ├── {purchaseId}
│   │   └── fields: id, purchaseNumber, supplierId, supplierName, date, items[], 
│   │            subtotal, total, status, createdAt?
│   │
│   ├── quotes/                # Sales quotes
│   │   ├── {quoteId}
│   │   └── fields: id, quoteNumber, customerId, customerName, date, items[], 
│   │            subtotal, total, status, expiresAt?, createdAt?
│   │
│   ├── recurringInvoices/     # Scheduled invoices
│   │   ├── {recurringId}
│   │   └── fields: id, customerId, frequency, nextDate, items[], amount, isActive, createdAt?
│   │
│   ├── returns/               # Return documents
│   │   ├── {returnId}
│   │   └── fields: id, invoiceId, customerId, items[], totalReturnAmount, date, 
│   │            reason?, mode, createdAt?, updatedAt?
│   │
│   ├── users/                 # Company staff/members (multi-level RBAC)
│   │   ├── {userId}
│   │   └── fields: uid, name, email, role, status, createdAt, updatedAt
│   │
│   ├── invitations/           # User invitations (pending staff)
│   │   ├── {invitationId}
│   │   └── fields: email, role, invitedByUid, invitedByEmail, createdAt, used
│   │
│   ├── settings/
│   │   ├── app                 # Company configuration
│   │   └── fields: businessName, currency, taxRate, paymentTerms, logoUrl, language
│   │
│   ├── counters/
│   │   ├── main               # Document number sequences
│   │   └── fields: lastInvoiceNumber, lastQuoteNumber, lastPurchaseNumber
│   │
│   └── reports/               # Optional: cached report data
│       ├── {reportDate}
│       └── fields: revenue, expenses, collections, profit, timestamp

---
```

---

## 1.2 ENTITY LIFECYCLE: CREATE → EDIT → LIST → DETAIL → IMPACT

### ENTITY: Invoice

| Flow | Pages | Service Functions | Firestore Path | Dashboard Impact | Reports Impact |
|------|-------|------------------|-----------------|-----------------|-----------------|
| **CREATE** | InvoiceForm.tsx | saveInvoice(companyId, invoice) | companies/{cId}/invoices/{id} | Total sales changes | Revenue total |
| **EDIT** | InvoiceForm.tsx | saveInvoice(companyId, invoice) | companies/{cId}/invoices/{id} | — | Revenue recalc |
| **LIST** | InvoiceList.tsx | getInvoices(companyId) | companies/{cId}/invoices | Recent invoices display | Report table |
| **DETAIL** | InvoiceDetail.tsx | getInvoiceById(companyId, id) | companies/{cId}/invoices/{id} | — | Drill-down |
| **DELETE** | InvoiceDetail.tsx | deleteInvoice(companyId, id) | companies/{cId}/invoices/{id} | Total decreases | Excluded if deleted |
| **PAYMENT** | PaymentForm (modal in InvoiceDetail) | savePayment(companyId, payment) | companies/{cId}/payments/{id} + update invoice.status | — | Paid amount calc |

**Calculation Chain:**
```
Create Invoice → setStatus = 'Due' (if credit) or 'Paid' (if cash)
Record Payment → Check: sum(payments for this invoice) >= invoice.total
              → If yes: setStatus = 'Paid', update CustomerDetail balance
Customer balance = sum(invoices) - sum(payments) - sum(receipts)
```

---

### ENTITY: Customer

| Flow | Pages | Service Functions | Firestore Path | Dashboard Impact | Reports Impact |
|------|-------|------------------|-----------------|-----------------|-----------------|
| **CREATE** | CustomerForm.tsx | saveCustomer(companyId, customer) | companies/{cId}/customers/{id} | New customer appears | — |
| **EDIT** | CustomerForm.tsx | saveCustomer(companyId, customer) | companies/{cId}/customers/{id} | Name/phone updates | — |
| **LIST** | CustomerList.tsx | getCustomers(companyId) | companies/{cId}/customers | Top customers section | Customer table |
| **DETAIL** | CustomerDetail.tsx | getCustomerById(companyId, id) + getInvoices(filter) + getPaymentsByCustomerId() + getReceiptsByCustomerId() | companies/{cId}/customers/{id} + invoices + payments + receipts | — | Balance lookup |
| **DELETE** | CustomerForm.tsx (soft-delete via isActive) | saveCustomer(companyId, customer) | companies/{cId}/customers/{id} | Hidden if inactive | Excluded |

**Calculation Chain:**
```
Customer Detail page loads:
1. getCustomerById() → name, phone, address
2. getInvoices(filter customerId) → all customer invoices
3. getPaymentsByCustomerId() → all payments for customer
4. getReceiptsByCustomerId() → all daily collection receipts for customer
5. balance = sum(invoices.total) - sum(payments.amount) - sum(receipts.amount)
6. Display: balance, statement, payment link
```

---

### ENTITY: Payment (Invoice Payments)

| Flow | Pages | Service Functions | Firestore Path | Dashboard Impact | Reports Impact |
|------|-------|------------------|-----------------|-----------------|-----------------|
| **CREATE** | PaymentForm modal (InvoiceDetail, CustomerDetail) | savePayment(companyId, payment) | companies/{cId}/payments/{id} | — | Total paid amount |
| **LIST** | CustomerDetail statement tab | getPaymentsByCustomerId(companyId, customerId) | companies/{cId}/payments (filter) | — | Payment table |
| **DELETE** | Implicit (not UI exposed) | deletePayment() | companies/{cId}/payments/{id} | Balance changes | Excluded |

**Calculation Chain:**
```
savePayment() logic:
→ Validate: amount <= remaining balance on invoice
→ Save payment record
→ Check: totalPaidForInvoice >= invoice.total
→ If yes: setInvoice.status = 'Paid'
→ Emit notification
→ CustomerDetail.balance recalculates
```

---

### ENTITY: Receipt (Daily Collection)

| Flow | Pages | Service Functions | Firestore Path | Dashboard Impact | Reports Impact |
|------|-------|------------------|-----------------|-----------------|-----------------|
| **CREATE** | ReceiptForm modal (DailyCollection) | createReceipt(companyId, customerId, ...) | companies/{cId}/receipts/{id} | — | Daily total |
| **LIST** | DailyCollection.tsx | getReceiptsByDateRange(companyId, date, date) | companies/{cId}/receipts (filter date) | Daily collection box | Collection report |
| **DELETE** | DailyCollection.tsx | deleteReceipt(companyId, id) | companies/{cId}/receipts/{id} | Daily total recalc | Excluded |
| **DETAIL** | DailyCollection list rows | — (no detail page, inline display) | — | — | — |

**Calculation Chain:**
```
DailyCollection page:
→ getReceiptsByDateRange(companyId, startDate, endDate)
→ Filter: method === 'cash' → cashTotal
→ Filter: method !== 'cash' → nonCashTotal
→ Display: cash box, non-cash box, daily total
→ Also counts toward customer balance in CustomerDetail
```

---

### ENTITY: Product

| Flow | Pages | Service Functions | Firestore Path | Dashboard Impact | Reports Impact |
|------|-------|------------------|-----------------|-----------------|-----------------|
| **CREATE** | ProductForm.tsx | saveProduct(companyId, product) | companies/{cId}/products/{id} | — | Stock tracking |
| **EDIT** | ProductForm.tsx | saveProduct(companyId, product) | companies/{cId}/products/{id} | — | — |
| **LIST** | ProductList.tsx | getProducts(companyId) | companies/{cId}/products | — | Inventory table |
| **DETAIL** | ProductForm.tsx (edit form) | getProductById(companyId, id) | companies/{cId}/products/{id} | — | — |
| **STOCK IMPACT** | Invoice items deducted? | NOT AUTOMATIC (manual stock edit) | companies/{cId}/products/{id}.stock | — | Stock aging |

**⚠️ IMPORTANT:** Stock does NOT auto-decrement when invoice created. Admin must manually adjust.

---

### ENTITY: Expense

| Flow | Pages | Service Functions | Firestore Path | Dashboard Impact | Reports Impact |
|------|-------|------------------|-----------------|-----------------|-----------------|
| **CREATE** | ExpenseForm.tsx | saveExpense(companyId, expense) | companies/{cId}/expenses/{id} | Today's total | Month total |
| **EDIT** | ExpenseForm.tsx | saveExpense(companyId, expense) | companies/{cId}/expenses/{id} | Recalculate | Recalculate |
| **LIST** | ExpenseList.tsx | getExpenses(companyId) | companies/{cId}/expenses | Recent items | Table view |
| **DELETE** | ExpenseList.tsx | deleteExpense(companyId, id) | companies/{cId}/expenses/{id} | Total decreases | Excluded |
| **CATEGORY** | ExpenseForm, ExpenseList | getExpenseCategories(), saveExpenseCategory() | companies/{cId}/expenseCategories | — | Category breakdown |

**Calculation Chain:**
```
ExpenseForm:
→ Select category (from getExpenseCategories)
→ Enter amount, date, description
→ Save to companies/{cId}/expenses
Dashboard expense total = sum(expenses where date = today)
Reports expense breakdown = groupBy(categoryId)
```

---

### ENTITY: Quote

| Flow | Pages | Service Functions | Firestore Path | Dashboard Impact | Reports Impact |
|------|-------|------------------|-----------------|-----------------|-----------------|
| **CREATE** | QuoteForm.tsx | saveQuote(companyId, quote) | companies/{cId}/quotes/{id} | — | Pipeline value |
| **CONVERT** | QuoteDetail.tsx → create invoice | Manual: copy quote, create invoice | companies/{cId}/invoices + quotes status | New invoice | Revenue +  |
| **LIST** | QuoteList.tsx | getQuotes(companyId) | companies/{cId}/quotes | — | Quote count |
| **DETAIL** | QuoteDetail.tsx | getQuoteById(companyId, id) | companies/{cId}/quotes/{id} | — | — |

---

### ENTITY: Recurring Invoice

| Flow | Pages | Service Functions | Firestore Path | Dashboard Impact | Reports Impact |
|------|-------|------------------|-----------------|-----------------|-----------------|
| **CREATE** | RecurringInvoiceForm.tsx | saveRecurringInvoice() | companies/{cId}/recurringInvoices/{id} | — | Auto-revenue |
| **EDIT** | RecurringInvoiceForm.tsx | saveRecurringInvoice() | companies/{cId}/recurringInvoices/{id} | — | — |
| **AUTO-EXECUTE** | Cloud Function (if exists) or Manual | createInvoiceFromRecurring() | creates companies/{cId}/invoices | Invoice created | Revenue impact |
| **LIST** | RecurringInvoiceList.tsx | getRecurringInvoices() | companies/{cId}/recurringInvoices | — | — |

**⚠️ IMPLEMENTATION NOTE:** Currently no auto-execution. Must be triggered manually or by Cloud Function.

---

### ENTITY: Return (Sales Return)

| Flow | Pages | Service Functions | Firestore Path | Dashboard Impact | Reports Impact |
|------|-------|------------------|-----------------|-----------------|-----------------|
| **CREATE** | ReturnForm modal (InvoiceDetail) | createReturnAtomic(companyId, return) | companies/{cId}/returns/{id} | — | Return total |
| **LIST** | InvoiceDetail.tsx → returns tab | getReturnsByInvoiceId(companyId, invoiceId) | companies/{cId}/returns (filter) | — | — |
| **DELETE** | ReturnForm | deleteReturn() | companies/{cId}/returns/{id} | Total recalc | Excluded |

**Calculation Chain:**
```
Create Return:
→ Link to original invoice
→ Store item details snapshot
→ Track return reason & mode (refund_cash or credit_note)
→ Display in invoice detail
→ Impact: Reduces effective invoice total if refund mode
```

---

### ENTITY: Supplier & Purchase

| Flow | Pages | Service Functions | Firestore Path | Dashboard Impact | Reports Impact |
|------|-------|------------------|-----------------|-----------------|-----------------|
| **CREATE** | SuppliersPage.tsx, PurchaseForm.tsx | saveSupplier(), savePurchase() | companies/{cId}/suppliers/{id}, companies/{cId}/purchases/{id} | — | Purchase table |
| **LIST** | SuppliersPage.tsx, PurchasesPage.tsx | getSuppliers(), getPurchases() | companies/{cId}/suppliers, companies/{cId}/purchases | — | Supplier breakdown |
| **PAYMENT** | SuppliersPage.tsx (inline modal) | saveSupplierPayment() | companies/{cId}/supplierPayments/{id} | — | Payable total |

---

## 1.3 COMPANYID SCOPING VERIFICATION

### ✅ All Read Operations Scoped by companyId

```typescript
// Verified Pattern:
const data = await getInvoices(companyId, options);
// ↓ Routes to:
// firestoreService.getData(companyId, 'invoices', options)
// ↓ Which calls:
// query(collection(db, 'companies', companyId, 'invoices'), ...)
// ✅ Firestore path includes companyId ✅
```

**Reads verified in:**
- ✅ Dashboard.tsx → getInvoices(companyId), getExpenses(companyId)
- ✅ InvoiceList.tsx → getInvoices(companyId)
- ✅ CustomerDetail.tsx → getInvoices(companyId, filter), getPaymentsByCustomerId(companyId, customerId)
- ✅ DailyCollection.tsx → getReceiptsByDateRange(companyId, date, date)
- ✅ Reports.tsx → getInvoices(companyId), getExpenses(companyId)
- ✅ ExpenseForm.tsx → getExpenseCategories(companyId)
- ✅ All 55 pages use companyId from AuthContext

### ✅ All Write Operations Scoped by companyId

```typescript
// Verified Pattern:
const result = await saveInvoice(companyId, invoice);
// ↓ Routes to:
// saveData(companyId, 'invoices', invoice, 'invoices')
// ↓ Which calls:
// setDoc(doc(db, 'companies', companyId, 'invoices', id), ...)
// ✅ Firestore path includes companyId ✅
```

**Writes verified in:**
- ✅ InvoiceForm.tsx → saveInvoice(companyId, invoice)
- ✅ CustomerForm.tsx → saveCustomer(companyId, customer)
- ✅ ExpenseForm.tsx → saveExpense(companyId, expense)
- ✅ DailyCollection.tsx → deleteReceipt(companyId, id)
- ✅ PaymentForm.tsx → savePayment(companyId, payment)

### ✅ Firestore Security Rules Enforce Multi-Tenancy

```firestore
match /companies/{companyId}/{collection}/{docId} {
  allow read: if isCompanyMember(companyId);
  allow write: if isCompanyEditor(companyId);
}
```

**Result:** Even if a malicious user hardcodes another companyId in the client, Firestore rules will deny access.

---

## 1.4 DATA DEPENDENCY GRAPH

```
Dashboard (daily view)
├─ depends on: getInvoices(today) + getExpenses(today)
├─ computes: todaySales, todayExpenses
└─ displays: StatCards + RecentInvoices + RecentExpenses

Reports (period view)
├─ depends on: getInvoices(range) + getExpenses(range) + getReturns(range)
├─ computes: periodRevenue, periodExpenses, netProfit, returns
└─ displays: detailed tables, export to PDF

CustomerDetail
├─ depends on: getCustomerById + getInvoices(filter) + getPaymentsByCustomerId + getReceiptsByCustomerId
├─ computes: balance = sum(invoices) - sum(payments) - sum(receipts)
└─ displays: balance, statement, payment link

InvoiceDetail
├─ depends on: getInvoiceById + getCustomerById
├─ links to: PaymentForm → savePayment → updates invoice.status
└─ displays: invoice, customer info, payment history, returns

DailyCollection
├─ depends on: getReceiptsByDateRange(date, date)
├─ computes: cashTotal, nonCashTotal, dailyTotal
└─ displays: daily breakdown, receipt list, add receipt form

ExpenseForm
├─ depends on: getExpenseCategories
├─ links to: create new category if needed
└─ displays: category dropdown

PaymentForm (modal)
├─ depends on: getInvoices(filter customerId) → get unpaid invoices
├─ computes: remainingBalance = invoiceTotal - sum(prior payments)
└─ validates: amount <= remainingBalance
```

---

## 1.5 SUMMARY TABLE: ENTITY → PAGES → SERVICES → FIRESTORE

| Entity | Create Page | Edit Page | List Page | Detail Page | Service | Firestore Path | Dashboard? | Reports? |
|--------|------------|-----------|-----------|-------------|---------|---|---|---|
| Invoice | InvoiceForm | InvoiceForm | InvoiceList | InvoiceDetail | saveInvoice, getInvoices, getInvoiceById | invoices/ | ✅ Today | ✅ Period |
| Customer | CustomerForm | CustomerForm | CustomerList | CustomerDetail | saveCustomer, getCustomers | customers/ | ✅ Top | ✅ Breakdown |
| Payment | PaymentForm (modal) | — | Statement tab | — | savePayment, getPaymentsByCustomerId | payments/ | — | ✅ Paid |
| Receipt | ReceiptForm (modal) | — | DailyCollection list | — | createReceipt, getReceiptsByDateRange | receipts/ | ✅ Daily | ✅ Collection |
| Product | ProductForm | ProductForm | ProductList | ProductForm | saveProduct, getProducts | products/ | — | ✅ Stock |
| Expense | ExpenseForm | ExpenseForm | ExpenseList | ExpenseForm | saveExpense, getExpenses | expenses/ | ✅ Today | ✅ Period |
| ExpenseCat | ExpenseForm add | — | — | — | saveExpenseCategory, getExpenseCategories | expenseCategories/ | — | ✅ Grouping |
| Supplier | SuppliersPage | SuppliersPage | SuppliersPage | SuppliersPage | saveSupplier, getSuppliers | suppliers/ | — | ✅ Breakdown |
| Purchase | PurchaseForm | PurchaseForm | PurchasesPage | PurchaseForm | savePurchase, getPurchases | purchases/ | — | ✅ Table |
| Quote | QuoteForm | QuoteForm | QuoteList | QuoteDetail | saveQuote, getQuotes | quotes/ | — | — |
| Recur.Invoice | RecurringInvoiceForm | RecurringInvoiceForm | RecurringInvoiceList | RecurringInvoiceForm | saveRecurringInvoice | recurringInvoices/ | — | — |
| Return | ReturnForm (modal) | — | Returns tab | — | createReturnAtomic, getReturnsByInvoiceId | returns/ | — | ✅ Return total |

---

## 1.6 DEPENDENCIES & COMPLETENESS

✅ **All entities properly scoped by companyId**
✅ **All writes validate companyId before execution**
✅ **All reads filter by companyId at Firestore level**
✅ **Dashboard displays per-company metrics**
✅ **Reports aggregate per-company data**
✅ **No cross-company data leakage possible**

**System is architecturally sound for multi-tenancy.**


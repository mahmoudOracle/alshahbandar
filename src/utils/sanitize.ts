/**
 * Data Sanitization Module
 * 
 * Provides lightweight, pure functions to sanitize user-provided input
 * before writing to Firestore. Ensures type safety and business rule validation
 * without external dependencies.
 * 
 * Philosophy:
 * - Fast: O(n) operations, no expensive operations
 * - Lenient on input: Accept multiple formats (string numbers, ISO dates, etc.)
 * - Strict on output: Only valid values exit these functions
 * - No side effects: Pure functions, no mutations
 * - Fail-safe: Throw clear errors or provide defaults
 */

import { Invoice, Payment, Product, Customer, ReturnDoc, Expense, Quote, RecurringInvoice, Purchase } from '../../types';
import { InvoiceStatus, PaymentType, QuoteStatus } from '../../types';

// ============================================================================
// BASIC SANITIZERS
// ============================================================================

/**
 * Sanitize a value to a number with optional min/max constraints
 */
export function sanitizeNumber(
  input: unknown,
  options: { min?: number; max?: number; default?: number; decimals?: number } = {}
): number {
  const { min, max, default: defaultVal = 0, decimals = 2 } = options;

  if (input === null || input === undefined) {
    return defaultVal;
  }

  let num: number;
  if (typeof input === 'number') {
    num = input;
  } else if (typeof input === 'string') {
    num = parseFloat(input);
  } else {
    return defaultVal;
  }

  if (isNaN(num) || !isFinite(num)) {
    return defaultVal;
  }

  // Apply constraints
  if (min !== undefined && num < min) {
    num = min;
  }
  if (max !== undefined && num > max) {
    num = max;
  }

  // Round to decimals
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Sanitize a value to an ISO date string (YYYY-MM-DD)
 * Accepts: ISO string, Date object, Unix timestamp (ms), string date formats
 */
export function sanitizeDateISO(
  input: unknown,
  options: { defaultToToday?: boolean } = {}
): string {
  const { defaultToToday = true } = options;

  if (input === null || input === undefined) {
    return defaultToToday ? new Date().toISOString().split('T')[0] : '';
  }

  let date: Date | null = null;

  // Already ISO string in YYYY-MM-DD format
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  // ISO string with time
  if (typeof input === 'string' && input.includes('T')) {
    date = new Date(input);
  }
  // Date object
  else if (input instanceof Date) {
    date = input;
  }
  // Unix timestamp (ms)
  else if (typeof input === 'number' && input > 0) {
    date = new Date(input);
  }
  // String that might be parseable
  else if (typeof input === 'string') {
    date = new Date(input);
  }

  if (date && !isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return defaultToToday ? new Date().toISOString().split('T')[0] : '';
}

/**
 * Sanitize a value to an enum value (case-insensitive)
 */
export function sanitizeEnumCaseInsensitive(
  input: unknown,
  allowed: string[],
  fallback?: string
): string {
  if (input === null || input === undefined) {
    if (fallback) return fallback;
    throw new Error('Enum value required');
  }

  const inputStr = String(input).trim().toLowerCase();

  // Find case-insensitive match
  const match = allowed.find((v) => v.toLowerCase() === inputStr);
  if (match) {
    return match;
  }

  if (fallback) {
    return fallback;
  }

  throw new Error(`Invalid enum value: "${input}". Allowed: ${allowed.join(', ')}`);
}

/**
 * Sanitize a string with optional trim and max length
 */
export function sanitizeText(
  input: unknown,
  options: { trim?: boolean; maxLen?: number; default?: string } = {}
): string {
  const { trim: shouldTrim = true, maxLen, default: defaultVal = '' } = options;

  if (input === null || input === undefined) {
    return defaultVal;
  }

  let str = String(input);

  if (shouldTrim) {
    str = str.trim();
  }

  if (maxLen && str.length > maxLen) {
    str = str.substring(0, maxLen);
  }

  return str;
}

/**
 * Sanitize phone number (keep digits and + sign, remove spaces)
 */
export function sanitizePhone(input: unknown): string {
  const str = sanitizeText(input, { trim: true });
  if (!str) return '';

  // Keep only digits and + sign
  return str.replace(/[^\d+]/g, '');
}

/**
 * Assertion: throw if condition false
 */
export function assertValid(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Assert value is not null/undefined/empty string
 */
export function assertRequired(value: unknown, fieldName: string): void {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) {
    throw new Error(`Field required: ${fieldName}`);
  }
}

// ============================================================================
// ENTITY SANITIZERS
// ============================================================================

/**
 * Sanitize a single invoice item
 */
function sanitizeInvoiceItem(item: unknown): InvoiceItem {
  if (!item || typeof item !== 'object') {
    throw new Error('Invalid invoice item');
  }

  const obj = item as Record<string, unknown>;

  const productId = sanitizeText(obj.productId, { trim: true });
  assertRequired(productId, 'productId');

  const productName = sanitizeText(obj.productName, { trim: true, maxLen: 200 });

  const quantity = sanitizeNumber(obj.quantity, { min: 0.01, decimals: 2 });
  assertValid(quantity > 0, 'Item quantity must be > 0');

  const price = sanitizeNumber(obj.price, { min: 0, decimals: 2 });
  assertValid(price >= 0, 'Item price cannot be negative');

  const unitCost = obj.unitCost ? sanitizeNumber(obj.unitCost, { min: 0, decimals: 2 }) : undefined;

  return {
    id: sanitizeText(obj.id, { trim: true }) || String(Date.now()),
    productId,
    productName: productName || 'Unknown Product',
    quantity,
    price,
    unitCost,
  } as InvoiceItem;
}

/**
 * Sanitize invoice draft from form
 */
export function sanitizeInvoiceDraft(input: unknown): Omit<Invoice, 'id'> {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid invoice input');
  }

  const obj = input as Record<string, unknown>;

  // Required fields
  const customerId = sanitizeText(obj.customerId, { trim: true });
  assertRequired(customerId, 'customerId');

  const customerName = sanitizeText(obj.customerName, { trim: true, maxLen: 200 }) || 'Unknown';

  const invoiceNumber = sanitizeText(obj.invoiceNumber, { trim: true, maxLen: 50 }) || 'AUTO';

  // Dates
  const date = sanitizeDateISO(obj.date, { defaultToToday: true });
  const dueDate = sanitizeDateISO(obj.dueDate, { defaultToToday: false }) || date;

  // Items (CRITICAL: must not be empty)
  const items = Array.isArray(obj.items) ? obj.items : [];
  assertValid(items.length > 0, 'Invoice must have at least one item');

  const sanitizedItems = items.map((item) => sanitizeInvoiceItem(item));

  // Calculate totals
  const subtotal = sanitizedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const taxRate = sanitizeNumber(obj.taxRate, { min: 0, max: 100, default: 0, decimals: 2 });
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  assertValid(isFinite(total) && total >= 0, 'Invoice total calculation invalid');

  // Status and payment type
  const status = sanitizeEnumCaseInsensitive(
    obj.status,
    Object.values(InvoiceStatus),
    InvoiceStatus.Due
  ) as InvoiceStatus;

  const paymentType = sanitizeEnumCaseInsensitive(
    obj.paymentType,
    Object.values(PaymentType),
    PaymentType.Credit
  ) as PaymentType;

  return {
    invoiceNumber,
    customerId,
    customerName,
    date,
    dueDate,
    items: sanitizedItems,
    subtotal,
    taxRate,
    taxAmount,
    total,
    status,
    paymentType,
  };
}

/**
 * Sanitize payment draft from form
 */
export function sanitizePaymentDraft(input: unknown): Omit<Payment, 'id'> {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid payment input');
  }

  const obj = input as Record<string, unknown>;

  const customerId = sanitizeText(obj.customerId, { trim: true });
  assertRequired(customerId, 'customerId');

  const amount = sanitizeNumber(obj.amount, { min: 0.01, decimals: 2 });
  assertValid(amount > 0, 'Payment amount must be > 0');

  const method = sanitizeEnumCaseInsensitive(
    obj.method,
    ['كاش', 'محفظة', 'إنستاباي', 'تحويل بنكي', 'أخرى'],
    'أخرى'
  );

  const date = sanitizeDateISO(obj.date, { defaultToToday: true });
  const customerName = sanitizeText(obj.customerName, { trim: true, maxLen: 200 });
  const invoiceId = sanitizeText(obj.invoiceId, { trim: true, maxLen: 100 });
  const invoiceNumber = sanitizeText(obj.invoiceNumber, { trim: true, maxLen: 50 });
  const notes = sanitizeText(obj.notes, { trim: true, maxLen: 500 });
  const reference = sanitizeText(obj.reference, { trim: true, maxLen: 100 });

  return {
    customerId,
    customerName: customerName || undefined,
    invoiceId: invoiceId || undefined,
    invoiceNumber: invoiceNumber || undefined,
    amount,
    method: method as any,
    date,
    notes: notes || undefined,
    reference: reference || undefined,
  };
}

/**
 * Sanitize product draft from form
 */
export function sanitizeProductDraft(input: unknown): Omit<Product, 'id'> {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid product input');
  }

  const obj = input as Record<string, unknown>;

  const name = sanitizeText(obj.name, { trim: true, maxLen: 200 });
  assertRequired(name, 'name');

  const price = sanitizeNumber(obj.price, { min: 0, decimals: 2 });
  assertValid(price >= 0, 'Price cannot be negative');

  const stock = sanitizeNumber(obj.stock, { min: 0, decimals: 2 });
  assertValid(stock >= 0, 'Stock cannot be negative');

  const description = sanitizeText(obj.description, { trim: true, maxLen: 1000 });
  const sku = sanitizeText(obj.sku, { trim: true, maxLen: 50 });
  const unit = sanitizeText(obj.unit, { trim: true, maxLen: 20 });
  const reorderLevel = obj.reorderLevel ? sanitizeNumber(obj.reorderLevel, { min: 0, decimals: 2 }) : undefined;
  const defaultCost = obj.defaultCost ? sanitizeNumber(obj.defaultCost, { min: 0, decimals: 2 }) : undefined;
  const averageCost = obj.averageCost ? sanitizeNumber(obj.averageCost, { min: 0, decimals: 2 }) : undefined;

  return {
    name,
    description: description || '',
    price,
    stock,
    sku: sku || undefined,
    unit: unit || undefined,
    reorderLevel,
    defaultCost,
    averageCost,
  };
}

/**
 * Sanitize customer draft from form
 */
export function sanitizeCustomerDraft(input: unknown): Omit<Customer, 'id' | 'createdAt'> {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid customer input');
  }

  const obj = input as Record<string, unknown>;

  const name = sanitizeText(obj.name, { trim: true, maxLen: 200 });
  assertRequired(name, 'name');

  const email = sanitizeText(obj.email, { trim: true, maxLen: 200 });
  const mobilePhone = sanitizePhone(obj.mobilePhone);
  const whatsappPhone = sanitizePhone(obj.whatsappPhone);
  const address = sanitizeText(obj.address, { trim: true, maxLen: 500 });

  const isActive = typeof obj.isActive === 'boolean' ? obj.isActive : true;

  return {
    name,
    email: email || undefined,
    mobilePhone: mobilePhone || '',
    whatsappPhone: whatsappPhone || '',
    address: address || '',
    isActive,
  };
}

/**
 * Sanitize return draft from form
 */
export function sanitizeReturnDraft(input: unknown): Omit<ReturnDoc, 'id'> {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid return input');
  }

  const obj = input as Record<string, unknown>;

  const invoiceId = sanitizeText(obj.invoiceId, { trim: true });
  assertRequired(invoiceId, 'invoiceId');

  const customerId = sanitizeText(obj.customerId, { trim: true });
  assertRequired(customerId, 'customerId');

  const items = Array.isArray(obj.items) ? obj.items : [];
  assertValid(items.length > 0, 'Return must have at least one item');

  // Sanitize each return item
  const sanitizedItems = items.map((item: unknown) => {
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid return item');
    }
    const itemObj = item as Record<string, unknown>;

    return {
      productId: sanitizeText(itemObj.productId, { trim: true }) || '',
      nameSnapshot: sanitizeText(itemObj.nameSnapshot, { trim: true, maxLen: 200 }) || '',
      quantity: sanitizeNumber(itemObj.quantity, { min: 0, decimals: 2 }),
      unitPriceSnapshot: sanitizeNumber(itemObj.unitPriceSnapshot, { min: 0, decimals: 2 }),
      lineTotal: sanitizeNumber(itemObj.lineTotal, { min: 0, decimals: 2 }),
    };
  });

  const totalReturnAmount = sanitizedItems.reduce((sum, item) => sum + item.lineTotal, 0);

  const date = sanitizeDateISO(obj.date, { defaultToToday: true });
  const reason = sanitizeText(obj.reason, { trim: true, maxLen: 500 });
  const mode = sanitizeEnumCaseInsensitive(obj.mode, ['refund_cash', 'credit_note'], 'credit_note') as
    | 'refund_cash'
    | 'credit_note';

  return {
    invoiceId,
    customerId,
    items: sanitizedItems as any,
    totalReturnAmount,
    date,
    reason: reason || undefined,
    mode,
  };
}

/**
 * Sanitize expense draft from form
 */
export function sanitizeExpenseDraft(input: unknown): Omit<Expense, 'id'> {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid expense input');
  }

  const obj = input as Record<string, unknown>;

  const category =
    sanitizeText(obj.category ?? obj.categoryId, { trim: true }) ||
    sanitizeText(obj.categoryName, { trim: true });
  assertRequired(category, 'category');

  const amount = sanitizeNumber(obj.amount, { min: 0.01, decimals: 2 });
  assertValid(amount > 0, 'Expense amount must be > 0');

  const date = sanitizeDateISO(obj.date, { defaultToToday: true });
  const description = sanitizeText(
    obj.description ?? obj.note ?? obj.notes,
    { trim: true, maxLen: 500 }
  );
  const vendor = sanitizeText(
    obj.vendor ?? obj.vendorName ?? obj.vendorId,
    { trim: true, maxLen: 100 }
  );

  return {
    category,
    amount,
    date,
    description: description || '',
    vendor: vendor || '',
  };
}

/**
 * Sanitize quote draft from form
 */
export function sanitizeQuoteDraft(input: unknown): Omit<Quote, 'id'> {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid quote input');
  }

  const obj = input as Record<string, unknown>;

  const customerId = sanitizeText(obj.customerId, { trim: true });
  assertRequired(customerId, 'customerId');

  const customerName = sanitizeText(obj.customerName, { trim: true, maxLen: 200 }) || 'Unknown';
  const quoteNumber = sanitizeText(obj.quoteNumber, { trim: true, maxLen: 50 }) || 'AUTO';

  const items = Array.isArray(obj.items) ? obj.items : [];
  assertValid(items.length > 0, 'Quote must have at least one item');

  const sanitizedItems = items.map((item) => sanitizeInvoiceItem(item));

  const subtotal = sanitizedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const taxRate = sanitizeNumber(obj.taxRate, { min: 0, max: 100, default: 0, decimals: 2 });
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const status = sanitizeEnumCaseInsensitive(
    obj.status,
    Object.values(QuoteStatus),
    QuoteStatus.Draft
  ) as QuoteStatus;

  const date = sanitizeDateISO(obj.date, { defaultToToday: true });
  const validUntil = sanitizeDateISO(obj.validUntil, { defaultToToday: false });
  const notes = sanitizeText(obj.notes, { trim: true, maxLen: 1000 });

  return {
    quoteNumber,
    customerId,
    customerName,
    date,
    items: sanitizedItems,
    subtotal,
    taxRate,
    taxAmount,
    total,
    status,
    validUntil: validUntil || undefined,
    notes: notes || undefined,
  };
}

/**
 * Sanitize purchase draft from form
 */
export function sanitizePurchaseDraft(input: unknown): Omit<Purchase, 'id'> {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid purchase input');
  }

  const obj = input as Record<string, unknown>;

  const supplierId = sanitizeText(obj.supplierId, { trim: true });
  assertRequired(supplierId, 'supplierId');

  const supplierName = sanitizeText(obj.supplierName, { trim: true, maxLen: 200 }) || 'Unknown';
  const poNumber = sanitizeText(obj.poNumber, { trim: true, maxLen: 50 }) || 'AUTO';

  const items = Array.isArray(obj.items) ? obj.items : [];
  assertValid(items.length > 0, 'Purchase must have at least one item');

  const sanitizedItems = items.map((item) => sanitizeInvoiceItem(item));

  const subtotal = sanitizedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const taxRate = sanitizeNumber(obj.taxRate, { min: 0, max: 100, default: 0, decimals: 2 });
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const date = sanitizeDateISO(obj.date, { defaultToToday: true });
  const expectedDelivery = sanitizeDateISO(obj.expectedDelivery, { defaultToToday: false });
  const notes = sanitizeText(obj.notes, { trim: true, maxLen: 1000 });

  return {
    poNumber,
    supplierId,
    supplierName,
    date,
    items: sanitizedItems,
    subtotal,
    taxRate,
    taxAmount,
    total,
    expectedDelivery: expectedDelivery || undefined,
    notes: notes || undefined,
  };
}

/**
 * Sanitize recurring invoice draft from form
 */
export function sanitizeRecurringInvoiceDraft(input: unknown): Omit<RecurringInvoice, 'id'> {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid recurring invoice input');
  }

  const obj = input as Record<string, unknown>;

  const customerId = sanitizeText(obj.customerId, { trim: true });
  assertRequired(customerId, 'customerId');

  const customerName = sanitizeText(obj.customerName, { trim: true, maxLen: 200 }) || 'Unknown';

  const items = Array.isArray(obj.items) ? obj.items : [];
  assertValid(items.length > 0, 'Recurring invoice must have at least one item');

  const sanitizedItems = items.map((item) => sanitizeInvoiceItem(item));

  const subtotal = sanitizedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const taxRate = sanitizeNumber(obj.taxRate, { min: 0, max: 100, default: 0, decimals: 2 });
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const status = sanitizeEnumCaseInsensitive(
    obj.status,
    Object.values(InvoiceStatus),
    InvoiceStatus.Due
  ) as InvoiceStatus;

  const frequency = sanitizeEnumCaseInsensitive(obj.frequency, ['monthly', 'quarterly', 'annually'], 'monthly');

  const startDate = sanitizeDateISO(obj.startDate, { defaultToToday: true });
  const endDate = sanitizeDateISO(obj.endDate, { defaultToToday: false });

  return {
    customerId,
    customerName,
    items: sanitizedItems,
    subtotal,
    taxRate,
    taxAmount,
    total,
    status,
    frequency: frequency as any,
    startDate,
    endDate: endDate || undefined,
  };
}

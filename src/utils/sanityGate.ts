/**
 * Sanity Gate Module
 * Provides centralized validation and coercion for all Firestore writes.
 * 
 * Rules:
 * - All writes must pass through sanitizeX() functions
 * - Invalid data throws SanityError with clear messages
 * - Dates are coerced to Firestore Timestamp for storage
 * - Numbers are validated for min/max constraints
 * - Enums are case-insensitive with semantic preservation
 * - Required fields are enforced
 */

import { Timestamp } from 'firebase/firestore';
import {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  PaymentType,
  Payment,
  PaymentMethod,
  Customer,
  Product,
  ReturnDoc,
  StockLedgerEntry,
  StockSourceType,
} from '../../types';

// ===== ERROR TYPES =====

export class SanityError extends Error {
  constructor(
    message: string,
    public code: string,
    public field?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SanityError';
  }
}

// ===== COERCION UTILITIES =====

/**
 * Coerce input to a number within optional min/max constraints
 */
export function coerceNumber(
  input: unknown,
  options: { default?: number; min?: number; max?: number } = {}
): number {
  const { default: defaultVal = 0, min, max } = options;

  if (input === null || input === undefined) {
    return defaultVal;
  }

  const num = typeof input === 'number' ? input : parseFloat(String(input));

  if (isNaN(num)) {
    return defaultVal;
  }

  if (min !== undefined && num < min) {
    return min;
  }

  if (max !== undefined && num > max) {
    return max;
  }

  return num;
}

/**
 * Coerce input to a string with optional trim and max length
 */
export function coerceString(
  input: unknown,
  options: { default?: string; trim?: boolean; maxLen?: number } = {}
): string {
  const { default: defaultVal = '', trim: shouldTrim = true, maxLen } = options;

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
 * Coerce various date formats to Firestore Timestamp
 * Accepts: Date, ISO string, number (ms since epoch), Timestamp
 */
export function coerceTimestamp(input: unknown): Timestamp {
  if (input instanceof Timestamp) {
    return input;
  }

  if (input instanceof Date) {
    return Timestamp.fromDate(input);
  }

  if (typeof input === 'string') {
    try {
      const date = new Date(input);
      if (!isNaN(date.getTime())) {
        return Timestamp.fromDate(date);
      }
    } catch {
      // Fall through to error
    }
    throw new SanityError(
      `Invalid date string: "${input}". Use ISO format (YYYY-MM-DD or ISO 8601).`,
      'INVALID_DATE_STRING',
      'date'
    );
  }

  if (typeof input === 'number') {
    try {
      return Timestamp.fromDate(new Date(input));
    } catch {
      // Fall through to error
    }
  }

  throw new SanityError(
    `Cannot coerce value to Timestamp: ${typeof input}. Provide Date, ISO string, or number.`,
    'INVALID_TIMESTAMP_TYPE'
  );
}

/**
 * Require that object has all specified fields (non-null, non-undefined)
 */
export function requireFields(
  obj: Record<string, unknown>,
  fields: string[]
): void {
  const missing: string[] = [];

  for (const field of fields) {
    const value = obj[field];
    if (value === null || value === undefined) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    throw new SanityError(
      `Required fields missing: ${missing.join(', ')}`,
      'MISSING_REQUIRED_FIELDS',
      undefined,
      { missing }
    );
  }
}

/**
 * Validate enum: ensure value exists in allowed array, with optional fallback
 */
export function validateEnum(
  value: unknown,
  allowed: string[],
  fallback?: string
): string {
  if (!value) {
    if (fallback) return fallback;
    throw new SanityError(
      `Enum value is required. Allowed: ${allowed.join(', ')}`,
      'MISSING_ENUM_VALUE'
    );
  }

  const strValue = String(value).trim().toLowerCase();

  // Try exact match first
  const exactMatch = allowed.find((v) => v.toLowerCase() === strValue);
  if (exactMatch) {
    return exactMatch;
  }

  // No match
  if (fallback) {
    return fallback;
  }

  throw new SanityError(
    `Invalid enum value: "${value}". Allowed: ${allowed.join(', ')}`,
    'INVALID_ENUM_VALUE',
    undefined,
    { value, allowed }
  );
}

/**
 * Assert a condition; throw SanityError if false
 */
export function assert(condition: boolean, message: string, code: string = 'ASSERTION_FAILED'): void {
  if (!condition) {
    throw new SanityError(message, code);
  }
}

// ===== ENTITY SANITIZERS =====

/**
 * Sanitize customer input before write
 */
export function sanitizeCustomer(input: unknown): Omit<Customer, 'id'> {
  const obj = input as Record<string, unknown>;

  // Required: name
  const name = coerceString(obj.name, { maxLen: 200 });
  requireFields({ name }, ['name']);

  // Optional fields
  const email = coerceString(obj.email || '', { maxLen: 200 });
  const mobilePhone = coerceString(obj.mobilePhone || '', { maxLen: 20 });
  const whatsappPhone = coerceString(obj.whatsappPhone || '', { maxLen: 20 });
  const address = coerceString(obj.address || '', { maxLen: 500 });
  const isActive = typeof obj.isActive === 'boolean' ? obj.isActive : true;

  // Timestamps
  const now = Timestamp.now();
  const createdAt = obj.createdAt instanceof Timestamp ? obj.createdAt : now;
  const updatedAt = now;

  return {
    name,
    email: email || undefined,
    mobilePhone: mobilePhone || undefined,
    whatsappPhone: whatsappPhone || undefined,
    address: address || undefined,
    isActive,
    createdAt,
    updatedAt,
  };
}

/**
 * Sanitize product input before write
 */
export function sanitizeProduct(input: unknown): Omit<Product, 'id'> {
  const obj = input as Record<string, unknown>;

  // Required: name, price, stock
  const name = coerceString(obj.name, { maxLen: 200 });
  const price = coerceNumber(obj.price, { min: 0, default: 0 });
  const stock = coerceNumber(obj.stock, { min: 0, default: 0 });

  requireFields({ name, price, stock }, ['name', 'price', 'stock']);

  // Validate price and stock are not negative
  assert(
    price >= 0,
    'Product price cannot be negative',
    'NEGATIVE_PRICE'
  );
  assert(
    stock >= 0,
    'Product stock cannot be negative',
    'NEGATIVE_STOCK'
  );

  // Optional fields
  const sku = coerceString(obj.sku || '', { maxLen: 50 });
  const description = coerceString(obj.description || '', { maxLen: 1000 });
  const unit = coerceString(obj.unit || '', { maxLen: 20 });
  const reorderLevel = coerceNumber(obj.reorderLevel, { min: 0, default: 0 });
  const defaultCost = coerceNumber(obj.defaultCost, { min: 0 });
  const averageCost = coerceNumber(obj.averageCost, { min: 0 });

  const now = Timestamp.now();
  const createdAt = obj.createdAt instanceof Timestamp ? obj.createdAt : now;

  return {
    name,
    description: description || undefined,
    price,
    stock,
    sku: sku || undefined,
    unit: unit || undefined,
    reorderLevel: reorderLevel || undefined,
    defaultCost: defaultCost || undefined,
    averageCost: averageCost || undefined,
    createdAt,
    updatedAt: Timestamp.now(),
  };
}

/**
 * Sanitize invoice item input
 */
export function sanitizeInvoiceItem(item: unknown): InvoiceItem {
  const obj = item as Record<string, unknown>;

  // Required: productId, quantity, price
  const productId = coerceString(obj.productId || '', { maxLen: 100 });
  const quantity = coerceNumber(obj.quantity, { min: 0.01, default: 1 });
  const price = coerceNumber(obj.price, { min: 0, default: 0 });

  requireFields({ productId, quantity, price }, ['productId', 'quantity', 'price']);

  // Validate constraints
  assert(
    quantity > 0,
    'Invoice item quantity must be greater than 0',
    'INVALID_ITEM_QUANTITY'
  );
  assert(
    price >= 0,
    'Invoice item price cannot be negative',
    'INVALID_ITEM_PRICE'
  );

  const productName = coerceString(obj.productName || '', { maxLen: 200 });
  const unitCost = coerceNumber(obj.unitCost, { min: 0 });

  return {
    id: coerceString(obj.id || '', { maxLen: 100 }),
    productId,
    productName: productName || 'Unknown',
    quantity,
    price,
    unitCost: unitCost || undefined,
  };
}

/**
 * Sanitize invoice input before write
 * Enforces total calculations and enum constraints
 */
export function sanitizeInvoice(input: unknown): Omit<Invoice, 'id'> {
  const obj = input as Record<string, unknown>;

  // Required: customerId, date, items
  const customerId = coerceString(obj.customerId || '', { maxLen: 100 });
  const customerName = coerceString(obj.customerName || '', { maxLen: 200 });
  const invoiceNumber = coerceString(obj.invoiceNumber || '', { maxLen: 50 });

  requireFields({ customerId }, ['customerId']);

  // Date
  let invoiceDate: Timestamp;
  try {
    invoiceDate = obj.date instanceof Timestamp ? obj.date : coerceTimestamp(obj.date || new Date());
  } catch {
    invoiceDate = Timestamp.now();
  }

  let dueDate: Timestamp;
  try {
    dueDate = obj.dueDate instanceof Timestamp ? obj.dueDate : coerceTimestamp(obj.dueDate || invoiceDate);
  } catch {
    dueDate = invoiceDate;
  }

  // Items
  const items = Array.isArray(obj.items) ? obj.items : [];
  assert(
    items.length > 0,
    'Invoice must have at least one line item',
    'EMPTY_INVOICE_ITEMS'
  );

  const sanitizedItems = items.map((item) => sanitizeInvoiceItem(item));

  // Calculate totals
  const subtotal = sanitizedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const discount = coerceNumber(obj.discount, { min: 0, default: 0 });
  const taxRate = coerceNumber(obj.taxRate, { min: 0, max: 100, default: 0 });
  const taxAmount = coerceNumber(obj.taxAmount, { min: 0, default: (subtotal - discount) * (taxRate / 100) });
  const total = Math.max(0, subtotal - discount + taxAmount);

  // Validate totals
  assert(
    isFinite(total),
    'Invoice total is not a valid number',
    'INVALID_TOTAL'
  );
  assert(
    total >= 0,
    'Invoice total cannot be negative',
    'NEGATIVE_TOTAL'
  );

  // Status and payment type
  const statusAllowed = Object.values(InvoiceStatus);
  const status = validateEnum(obj.status, statusAllowed, InvoiceStatus.Due) as InvoiceStatus;

  const paymentTypeAllowed = Object.values(PaymentType);
  const paymentType = validateEnum(obj.paymentType, paymentTypeAllowed, PaymentType.Cash) as PaymentType;

  // Optional fields
  const costTotal = coerceNumber(obj.costTotal, { min: 0 });
  const profit = coerceNumber(obj.profit);

  const now = Timestamp.now();
  const createdAt = obj.createdAt instanceof Timestamp ? obj.createdAt : now;

  return {
    invoiceNumber: invoiceNumber || 'AUTO',
    customerId,
    customerName: customerName || 'Unknown',
    date: invoiceDate,
    dueDate,
    items: sanitizedItems,
    subtotal,
    taxRate,
    taxAmount,
    total,
    paymentType,
    status,
    costTotal: costTotal || undefined,
    profit: profit || undefined,
    createdAt,
    updatedAt: Timestamp.now(),
  };
}

/**
 * Sanitize payment input before write
 */
export function sanitizePayment(input: unknown): Omit<Payment, 'id'> {
  const obj = input as Record<string, unknown>;

  // Required: customerId, amount
  const customerId = coerceString(obj.customerId || '', { maxLen: 100 });
  const amount = coerceNumber(obj.amount, { min: 0.01, default: 0 });

  requireFields({ customerId, amount }, ['customerId', 'amount']);

  // Validate constraints
  assert(
    amount > 0,
    'Payment amount must be greater than 0',
    'INVALID_PAYMENT_AMOUNT'
  );

  // Date
  let date: Timestamp;
  try {
    date = obj.date instanceof Timestamp ? obj.date : coerceTimestamp(obj.date || new Date());
  } catch {
    date = Timestamp.now();
  }

  // Method
  const allowedMethods: PaymentMethod[] = ['كاش', 'محفظة', 'إنستاباي', 'تحويل بنكي', 'أخرى'];
  const method = validateEnum(obj.method, allowedMethods, 'أخرى') as PaymentMethod;

  // Optional fields
  const customerName = coerceString(obj.customerName || '', { maxLen: 200 });
  const invoiceId = coerceString(obj.invoiceId || '', { maxLen: 100 });
  const invoiceNumber = coerceString(obj.invoiceNumber || '', { maxLen: 50 });
  const notes = coerceString(obj.notes || '', { maxLen: 500 });
  const reference = coerceString(obj.reference || '', { maxLen: 100 });

  const now = Timestamp.now();
  const createdAt = obj.createdAt instanceof Timestamp ? obj.createdAt : now;

  return {
    customerId,
    customerName: customerName || undefined,
    invoiceId: invoiceId || undefined,
    invoiceNumber: invoiceNumber || undefined,
    amount,
    method,
    date,
    notes: notes || undefined,
    reference: reference || undefined,
    createdAt,
    updatedAt: now,
  };
}

/**
 * Sanitize return document input
 */
export function sanitizeReturn(input: unknown): Omit<ReturnDoc, 'id'> {
  const obj = input as Record<string, unknown>;

  // Required: invoiceId, customerId, items
  const invoiceId = coerceString(obj.invoiceId || '', { maxLen: 100 });
  const customerId = coerceString(obj.customerId || '', { maxLen: 100 });
  const items = Array.isArray(obj.items) ? obj.items : [];

  requireFields({ invoiceId, customerId }, ['invoiceId', 'customerId']);

  assert(
    items.length > 0,
    'Return must have at least one item',
    'EMPTY_RETURN_ITEMS'
  );

  // Calculate total return amount
  const totalReturnAmount = items.reduce((sum: number, item: any) => {
    const lineTotal = coerceNumber(item.lineTotal, { min: 0, default: 0 });
    return sum + lineTotal;
  }, 0);

  // Date
  let date: Timestamp;
  try {
    date = obj.date instanceof Timestamp ? obj.date : coerceTimestamp(obj.date || new Date());
  } catch {
    date = Timestamp.now();
  }

  // Mode
  const allowedModes = ['refund_cash', 'credit_note'];
  const mode = (validateEnum(obj.mode, allowedModes, 'credit_note') || 'credit_note') as 'refund_cash' | 'credit_note';

  const reason = coerceString(obj.reason || '', { maxLen: 500 });

  const now = Timestamp.now();
  const createdAt = obj.createdAt instanceof Timestamp ? obj.createdAt : now;

  return {
    invoiceId,
    customerId,
    items,
    totalReturnAmount,
    date,
    reason: reason || undefined,
    mode,
    createdAt,
    updatedAt: now,
  };
}

/**
 * Sanitize stock ledger entry before write
 */
export function sanitizeStockLedger(input: unknown): Omit<StockLedgerEntry, 'id'> {
  const obj = input as Record<string, unknown>;

  // Required: productId, change, qtyBefore, qtyAfter, sourceType
  const productId = coerceString(obj.productId || '', { maxLen: 100 });
  const change = coerceNumber(obj.change, { default: 0 });
  const qtyBefore = coerceNumber(obj.qtyBefore, { min: 0, default: 0 });
  const qtyAfter = coerceNumber(obj.qtyAfter, { min: 0, default: 0 });

  requireFields({ productId }, ['productId']);

  // Validate consistency
  assert(
    qtyBefore + change === qtyAfter,
    `Stock ledger math error: ${qtyBefore} + ${change} !== ${qtyAfter}`,
    'STOCK_LEDGER_MATH_ERROR'
  );

  // Source type
  const allowedSourceTypes: StockSourceType[] = ['PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN', 'TRANSFER'];
  const sourceType = validateEnum(obj.sourceType, allowedSourceTypes, 'ADJUSTMENT') as StockSourceType;

  // Optional fields
  const companyId = coerceString(obj.companyId || '', { maxLen: 100 });
  const locationId = coerceString(obj.locationId || '', { maxLen: 100 });
  const unitCost = coerceNumber(obj.unitCost, { min: 0 });
  const sourceId = coerceString(obj.sourceId || '', { maxLen: 100 });
  const userId = coerceString(obj.userId || '', { maxLen: 100 });
  const notes = coerceString(obj.notes || '', { maxLen: 500 });

  let timestamp: Timestamp;
  try {
    timestamp = obj.timestamp instanceof Timestamp ? obj.timestamp : coerceTimestamp(obj.timestamp || new Date());
  } catch {
    timestamp = Timestamp.now();
  }

  return {
    productId,
    change,
    qtyBefore,
    qtyAfter,
    sourceType,
    companyId: companyId || undefined,
    locationId: locationId || undefined,
    unitCost: unitCost || undefined,
    sourceId: sourceId || undefined,
    userId: userId || undefined,
    timestamp,
    notes: notes || undefined,
  };
}

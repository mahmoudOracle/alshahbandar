/**
 * Data Normalization Layer
 * 
 * Standardizes all Firestore reads into stable internal models.
 * Handles:
 * - Numbers stored as strings
 * - Timestamp vs string date inconsistency
 * - Enum/status mismatches
 * - Missing optional fields
 * - Orphaned references
 * 
import { toISODateCairo } from './date'; * Does NOT modify Firestore data. Purely read-side normalization.
 */

import {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  PaymentType,
  Customer,
  Product,
  Payment,
  PaymentMethod,
  ReturnDoc,
  ReturnItem,
  Supplier,
  StockLedgerEntry,
  StockSourceType,
  SupplierPayment,
  Quote,
  QuoteStatus,
  RecurringInvoice,
  Expense,
  JournalEntry,
  JournalLine,
  Purchase,
  PurchaseItem,
} from '../../types';
import { Timestamp } from 'firebase/firestore';
import { DEBUG_MODE } from '../../config';

// ============================================================================
// BASIC CONVERTERS
// ============================================================================

/**
 * Convert any value to a number safely
 */
export function toNumber(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

/**
 * Convert any value to a string safely
 */
export function toStringSafe(value: unknown, fallback: string = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  return String(value) || fallback;
}

/**
 * Convert various date formats to ISO 8601 string (YYYY-MM-DD format)
 * Handles:
 * - Firestore Timestamp objects
 * - ISO 8601 strings
 * - Date objects
 * - Unix timestamps (ms or seconds)
 * - Invalid dates return a fallback
 */
export function toDateValue(value: unknown, fallback: string = ''): string {
  if (value === null || value === undefined) return fallback;

  let date: Date | null = null;

  // Firestore Timestamp
  if (value instanceof Timestamp) {
    date = value.toDate();
  }
  // Date object
  else if (value instanceof Date) {
    date = value;
  }
  // String (ISO format or other)
  else if (typeof value === 'string' && value.trim()) {
    // If it's already YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      date = parsed;
    }
  }
  // Unix timestamp (number)
  else if (typeof value === 'number' && value > 0) {
    // Assume milliseconds if very large, seconds if small
    const ms = value > 1e10 ? value : value * 1000;
    date = new Date(ms);
  }

  if (date && !isNaN(date.getTime())) {
    return toISODateCairo(date); // YYYY-MM-DD
  }

  return fallback;
}

/**
 * Convert to a consistent Date object (or null)
 */
export function toDate(value: unknown): Date | null {
  const isoStr = toDateValue(value);
  if (!isoStr) return null;
  const date = new Date(isoStr);
  return isNaN(date.getTime()) ? null : date;
}

// ============================================================================
// ENUM NORMALIZERS
// ============================================================================

/**
 * Normalize invoice status to valid enum value
 */
export function normalizeInvoiceStatus(value: unknown): InvoiceStatus {
  const str = toStringSafe(value).trim().toLowerCase();
  const normalized = str.charAt(0).toUpperCase() + str.slice(1);
  if (Object.values(InvoiceStatus).includes(normalized as InvoiceStatus)) {
    return normalized as InvoiceStatus;
  }
  // Fallback to Due if unrecognized
  return InvoiceStatus.Due;
}

/**
 * Normalize payment type to valid enum value
 */
export function normalizePaymentType(value: unknown): PaymentType {
  const str = toStringSafe(value).trim().toLowerCase();
  const normalized = str.charAt(0).toUpperCase() + str.slice(1);
  if (Object.values(PaymentType).includes(normalized as PaymentType)) {
    return normalized as PaymentType;
  }
  // Fallback to Cash
  return PaymentType.Cash;
}

/**
 * Normalize payment method (Arabic payment methods)
 */
export function normalizePaymentMethod(value: unknown): PaymentMethod {
  const str = toStringSafe(value).trim();
  const validMethods: PaymentMethod[] = ['كاش', 'محفظة', 'إنستاباي', 'تحويل بنكي', 'أخرى'];
  if (validMethods.includes(str as PaymentMethod)) {
    return str as PaymentMethod;
  }
  // Fallback to "أخرى" (other)
  return 'أخرى';
}

/**
 * Normalize quote status to valid enum value
 */
export function normalizeQuoteStatus(value: unknown): QuoteStatus {
  const str = toStringSafe(value).trim().toLowerCase();
  const normalized = str.charAt(0).toUpperCase() + str.slice(1);
  if (Object.values(QuoteStatus).includes(normalized as QuoteStatus)) {
    return normalized as QuoteStatus;
  }
  return QuoteStatus.Draft;
}

/**
 * Normalize stock source type
 */
export function normalizeStockSourceType(value: unknown): StockSourceType {
  const str = toStringSafe(value).trim().toUpperCase();
  const validTypes: StockSourceType[] = ['PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN', 'TRANSFER'];
  if (validTypes.includes(str as StockSourceType)) {
    return str as StockSourceType;
  }
  return 'ADJUSTMENT';
}

// ============================================================================
// ITEM NORMALIZERS
// ============================================================================

/**
 * Normalize invoice line item
 */
export function normalizeInvoiceItem(item: unknown): InvoiceItem {
  if (!item || typeof item !== 'object') {
    return {
      id: '',
      productId: '',
      productName: '',
      quantity: 0,
      price: 0,
    };
  }

  const raw = item as Record<string, unknown>;
  return {
    id: toStringSafe(raw.id),
    productId: toStringSafe(raw.productId),
    productName: toStringSafe(raw.productName),
    quantity: Math.max(0, toNumber(raw.quantity)),
    price: Math.max(0, toNumber(raw.price)),
    unitCost: raw.unitCost !== undefined ? Math.max(0, toNumber(raw.unitCost)) : undefined,
  };
}

/**
 * Normalize return item
 */
export function normalizeReturnItem(item: unknown): ReturnItem {
  if (!item || typeof item !== 'object') {
    return {
      productId: '',
      nameSnapshot: '',
      quantity: 0,
      unitPriceSnapshot: 0,
      lineTotal: 0,
    };
  }

  const raw = item as Record<string, unknown>;
  return {
    productId: toStringSafe(raw.productId),
    nameSnapshot: toStringSafe(raw.nameSnapshot),
    quantity: Math.max(0, toNumber(raw.quantity)),
    unitPriceSnapshot: Math.max(0, toNumber(raw.unitPriceSnapshot)),
    lineTotal: Math.max(0, toNumber(raw.lineTotal)),
  };
}

/**
 * Normalize purchase item
 */
export function normalizePurchaseItem(item: unknown): PurchaseItem {
  if (!item || typeof item !== 'object') {
    return {
      productId: '',
      quantity: 0,
      unitCost: 0,
    };
  }

  const raw = item as Record<string, unknown>;
  return {
    productId: toStringSafe(raw.productId),
    sku: toStringSafe(raw.sku || ''),
    productName: toStringSafe(raw.productName || ''),
    quantity: Math.max(0, toNumber(raw.quantity)),
    unitCost: Math.max(0, toNumber(raw.unitCost)),
    lineTotal: raw.lineTotal ? Math.max(0, toNumber(raw.lineTotal)) : undefined,
  };
}

/**
 * Normalize journal line
 */
export function normalizeJournalLine(line: unknown): JournalLine {
  if (!line || typeof line !== 'object') {
    return {
      accountId: '',
      debit: 0,
      credit: 0,
    };
  }

  const raw = line as Record<string, unknown>;
  return {
    accountId: toStringSafe(raw.accountId),
    debit: Math.max(0, toNumber(raw.debit)),
    credit: Math.max(0, toNumber(raw.credit)),
  };
}

// ============================================================================
// BUSINESS OBJECT NORMALIZERS
// ============================================================================

/**
 * Normalize customer document
 */
export function normalizeCustomer(doc: unknown): Customer {
  if (!doc || typeof doc !== 'object') {
    return {
      id: '',
      name: 'عميل غير موجود',
      mobilePhone: '',
      whatsappPhone: '',
      address: '',
      isActive: false,
      createdAt: null,
    };
  }

  const raw = doc as Record<string, unknown>;
  return {
    id: toStringSafe(raw.id),
    name: toStringSafe(raw.name),
    email: toStringSafe(raw.email || ''),
    mobilePhone: toStringSafe(raw.mobilePhone || ''),
    whatsappPhone: toStringSafe(raw.whatsappPhone || ''),
    address: toStringSafe(raw.address || ''),
    isActive: Boolean(raw.isActive),
    createdAt: raw.createdAt || null,
  };
}

/**
 * Normalize product document
 */
export function normalizeProduct(doc: unknown): Product {
  if (!doc || typeof doc !== 'object') {
    return {
      id: '',
      name: 'منتج غير موجود',
      description: '',
      price: 0,
      stock: 0,
      reorderLevel: 0,
    };
  }

  const raw = doc as Record<string, unknown>;
  return {
    id: toStringSafe(raw.id),
    name: toStringSafe(raw.name),
    description: toStringSafe(raw.description || ''),
    price: Math.max(0, toNumber(raw.price)),
    stock: Math.max(0, toNumber(raw.stock)),
    reorderLevel: raw.reorderLevel ? Math.max(0, toNumber(raw.reorderLevel)) : undefined,
    sku: toStringSafe(raw.sku || ''),
    unit: toStringSafe(raw.unit || ''),
    defaultCost: raw.defaultCost ? Math.max(0, toNumber(raw.defaultCost)) : undefined,
    averageCost: raw.averageCost ? Math.max(0, toNumber(raw.averageCost)) : undefined,
    attributes: typeof raw.attributes === 'object' && raw.attributes ? (raw.attributes as Record<string, string>) : undefined,
  };
}

/**
 * Normalize supplier document
 */
export function normalizeSupplier(doc: unknown): Supplier {
  if (!doc || typeof doc !== 'object') {
    return {
      id: '',
      supplierName: 'مورد غير موجود',
    };
  }

  const raw = doc as Record<string, unknown>;
  return {
    id: toStringSafe(raw.id),
    supplierName: toStringSafe(raw.supplierName),
    supplierNameLower: toStringSafe(raw.supplierNameLower || ''),
    companyName: toStringSafe(raw.companyName || ''),
    phone: toStringSafe(raw.phone || ''),
    email: toStringSafe(raw.email || ''),
    address: toStringSafe(raw.address || ''),
    notes: toStringSafe(raw.notes || ''),
    createdAt: raw.createdAt || undefined,
  };
}

/**
 * Normalize invoice document
 */
export function normalizeInvoice(doc: unknown): Invoice {
  if (!doc || typeof doc !== 'object') {
    return {
      id: '',
      invoiceNumber: '',
      customerId: '',
      customerName: 'عميل غير موجود',
      date: toDateValue(null),
      dueDate: toDateValue(null),
      items: [],
      subtotal: 0,
      taxRate: 0,
      taxAmount: 0,
      total: 0,
      paymentType: PaymentType.Cash,
      status: InvoiceStatus.Due,
    };
  }

  const raw = doc as Record<string, unknown>;
  const items = Array.isArray(raw.items)
    ? raw.items.map(normalizeInvoiceItem)
    : [];

  return {
    id: toStringSafe(raw.id),
    invoiceNumber: toStringSafe(raw.invoiceNumber),
    customerId: toStringSafe(raw.customerId),
    customerName: toStringSafe(raw.customerName),
    date: toDateValue(raw.date),
    dueDate: toDateValue(raw.dueDate),
    items,
    subtotal: Math.max(0, toNumber(raw.subtotal)),
    taxRate: toNumber(raw.taxRate, 0),
    taxAmount: Math.max(0, toNumber(raw.taxAmount, 0)),
    total: Math.max(0, toNumber(raw.total)),
    paymentType: normalizePaymentType(raw.paymentType),
    status: normalizeInvoiceStatus(raw.status),
    paymentsSummary: raw.paymentsSummary && typeof raw.paymentsSummary === 'object'
      ? {
          paid: Math.max(0, toNumber((raw.paymentsSummary as Record<string, unknown>).paid)),
          due: Math.max(0, toNumber((raw.paymentsSummary as Record<string, unknown>).due)),
        }
      : undefined,
    costTotal: raw.costTotal ? Math.max(0, toNumber(raw.costTotal)) : undefined,
    profit: raw.profit !== undefined ? toNumber(raw.profit) : undefined,
  };
}

/**
 * Normalize payment document
 */
export function normalizePayment(doc: unknown): Payment {
  if (!doc || typeof doc !== 'object') {
    return {
      id: '',
      customerId: '',
      amount: 0,
      method: 'أخرى',
      date: toDateValue(null),
    };
  }

  const raw = doc as Record<string, unknown>;
  return {
    id: toStringSafe(raw.id),
    customerId: toStringSafe(raw.customerId),
    customerName: toStringSafe(raw.customerName || ''),
    invoiceId: toStringSafe(raw.invoiceId || ''),
    invoiceNumber: toStringSafe(raw.invoiceNumber || ''),
    amount: Math.max(0, toNumber(raw.amount)),
    method: normalizePaymentMethod(raw.method),
    date: toDateValue(raw.date),
    notes: toStringSafe(raw.notes || ''),
    reference: toStringSafe(raw.reference || ''),
    createdAt: raw.createdAt || undefined,
    updatedAt: raw.updatedAt || undefined,
  };
}

/**
 * Normalize return document
 */
export function normalizeReturn(doc: unknown): ReturnDoc {
  if (!doc || typeof doc !== 'object') {
    return {
      id: '',
      invoiceId: '',
      customerId: '',
      items: [],
      totalReturnAmount: 0,
      date: toDateValue(null),
    };
  }

  const raw = doc as Record<string, unknown>;
  const items = Array.isArray(raw.items)
    ? raw.items.map(normalizeReturnItem)
    : [];

  return {
    id: toStringSafe(raw.id),
    invoiceId: toStringSafe(raw.invoiceId),
    customerId: toStringSafe(raw.customerId),
    items,
    totalReturnAmount: Math.max(0, toNumber(raw.totalReturnAmount)),
    date: toDateValue(raw.date),
    reason: toStringSafe(raw.reason || ''),
    mode: raw.mode as 'refund_cash' | 'credit_note' | undefined,
    createdAt: raw.createdAt || undefined,
    updatedAt: raw.updatedAt || undefined,
  };
}

/**
 * Normalize supplier payment document
 */
export function normalizeSupplierPayment(doc: unknown): SupplierPayment {
  if (!doc || typeof doc !== 'object') {
    return {
      id: '',
      supplierId: '',
      amount: 0,
      method: 'أخرى',
      date: toDateValue(null),
    };
  }

  const raw = doc as Record<string, unknown>;
  return {
    id: toStringSafe(raw.id),
    supplierId: toStringSafe(raw.supplierId),
    supplierName: toStringSafe(raw.supplierName || ''),
    purchaseId: toStringSafe(raw.purchaseId || ''),
    amount: Math.max(0, toNumber(raw.amount)),
    method: normalizePaymentMethod(raw.method),
    date: toDateValue(raw.date),
    notes: toStringSafe(raw.notes || ''),
    reference: toStringSafe(raw.reference || ''),
    createdAt: raw.createdAt || undefined,
    updatedAt: raw.updatedAt || undefined,
  };
}

/**
 * Normalize stock ledger entry
 */
export function normalizeStockLedger(doc: unknown): StockLedgerEntry {
  if (!doc || typeof doc !== 'object') {
    return {
      id: '',
      productId: '',
      change: 0,
      qtyBefore: 0,
      qtyAfter: 0,
      sourceType: 'ADJUSTMENT',
      timestamp: null,
    };
  }

  const raw = doc as Record<string, unknown>;
  return {
    id: toStringSafe(raw.id),
    companyId: toStringSafe(raw.companyId || ''),
    productId: toStringSafe(raw.productId),
    locationId: toStringSafe(raw.locationId || ''),
    change: toNumber(raw.change),
    qtyBefore: Math.max(0, toNumber(raw.qtyBefore)),
    qtyAfter: Math.max(0, toNumber(raw.qtyAfter)),
    unitCost: raw.unitCost ? Math.max(0, toNumber(raw.unitCost)) : undefined,
    sourceType: normalizeStockSourceType(raw.sourceType),
    sourceId: toStringSafe(raw.sourceId || ''),
    userId: toStringSafe(raw.userId || ''),
    timestamp: raw.timestamp || null,
    notes: toStringSafe(raw.notes || ''),
  };
}

/**
 * Normalize quote document
 */
export function normalizeQuote(doc: unknown): Quote {
  if (!doc || typeof doc !== 'object') {
    return {
      id: '',
      quoteNumber: '',
      customerId: '',
      customerName: 'عميل غير موجود',
      date: toDateValue(null),
      expiryDate: toDateValue(null),
      items: [],
      subtotal: 0,
      total: 0,
      status: QuoteStatus.Draft,
    };
  }

  const raw = doc as Record<string, unknown>;
  const items = Array.isArray(raw.items)
    ? raw.items.map(normalizeInvoiceItem)
    : [];

  return {
    id: toStringSafe(raw.id),
    quoteNumber: toStringSafe(raw.quoteNumber),
    customerId: toStringSafe(raw.customerId),
    customerName: toStringSafe(raw.customerName),
    date: toDateValue(raw.date),
    expiryDate: toDateValue(raw.expiryDate),
    items,
    subtotal: Math.max(0, toNumber(raw.subtotal)),
    taxRate: toNumber(raw.taxRate, 0),
    taxAmount: Math.max(0, toNumber(raw.taxAmount, 0)),
    total: Math.max(0, toNumber(raw.total)),
    status: normalizeQuoteStatus(raw.status),
  };
}

/**
 * Normalize recurring invoice
 */
export function normalizeRecurringInvoice(doc: unknown): RecurringInvoice {
  if (!doc || typeof doc !== 'object') {
    return {
      id: '',
      customerId: '',
      customerName: '',
      items: [],
      frequency: 'Monthly' as const,
      startDate: toDateValue(null),
      nextDueDate: toDateValue(null),
      autoSend: false,
    };
  }

  const raw = doc as Record<string, unknown>;
  const items = Array.isArray(raw.items)
    ? raw.items.map(normalizeInvoiceItem)
    : [];

  return {
    id: toStringSafe(raw.id),
    customerId: toStringSafe(raw.customerId),
    customerName: toStringSafe(raw.customerName),
    items,
    frequency: raw.frequency as any || 'Monthly',
    startDate: toDateValue(raw.startDate),
    nextDueDate: toDateValue(raw.nextDueDate),
    endDate: raw.endDate ? toDateValue(raw.endDate) : undefined,
    taxRate: toNumber(raw.taxRate, 0),
    autoSend: Boolean(raw.autoSend),
  };
}

/**
 * Normalize expense document
 */
export function normalizeExpense(doc: unknown): Expense {
  if (!doc || typeof doc !== 'object') {
    return {
      id: '',
      date: toDateValue(null),
      category: '',
      vendor: '',
      description: '',
      amount: 0,
    };
  }

  const raw = doc as Record<string, unknown>;
  return {
    id: toStringSafe(raw.id),
    date: toDateValue(raw.date),
    category: toStringSafe(raw.category),
    vendor: toStringSafe(raw.vendor),
    description: toStringSafe(raw.description),
    amount: Math.max(0, toNumber(raw.amount)),
  };
}

/**
 * Normalize purchase document
 */
export function normalizePurchase(doc: unknown): Purchase {
  if (!doc || typeof doc !== 'object') {
    return {
      id: '',
      items: [],
      subtotal: 0,
      total: 0,
    };
  }

  const raw = doc as Record<string, unknown>;
  const items = Array.isArray(raw.items)
    ? raw.items.map(normalizePurchaseItem)
    : [];

  return {
    id: toStringSafe(raw.id),
    supplierId: toStringSafe(raw.supplierId || ''),
    supplierName: toStringSafe(raw.supplierName || ''),
    items,
    subtotal: Math.max(0, toNumber(raw.subtotal)),
    taxAmount: raw.taxAmount ? Math.max(0, toNumber(raw.taxAmount)) : undefined,
    total: Math.max(0, toNumber(raw.total)),
    currency: toStringSafe(raw.currency || 'USD'),
    status: raw.status as any || 'ORDERED',
    receivedAt: raw.receivedAt || undefined,
    createdAt: raw.createdAt || undefined,
    userId: toStringSafe(raw.userId || ''),
    reference: toStringSafe(raw.reference || ''),
  };
}

/**
 * Normalize journal entry
 */
export function normalizeJournalEntry(doc: unknown): JournalEntry {
  if (!doc || typeof doc !== 'object') {
    return {
      id: '',
      date: toDateValue(null),
      lines: [],
    };
  }

  const raw = doc as Record<string, unknown>;
  const lines = Array.isArray(raw.lines)
    ? raw.lines.map(normalizeJournalLine)
    : [];

  return {
    id: toStringSafe(raw.id),
    date: toDateValue(raw.date),
    lines,
    referenceType: toStringSafe(raw.referenceType || ''),
    referenceId: toStringSafe(raw.referenceId || ''),
    description: toStringSafe(raw.description || ''),
    createdAt: raw.createdAt || undefined,
  };
}

// ============================================================================
// ARRAY NORMALIZERS
// ============================================================================

/**
 * Normalize an array of items of a specific type
 */
export function normalizeArray<T>(
  items: unknown,
  normalizer: (item: unknown) => T,
  fallback: T[] = []
): T[] {
  if (!Array.isArray(items)) {
    return fallback;
  }
  try {
    return items.map(normalizer);
  } catch (err) {
    if (DEBUG_MODE) {
      console.error('[NORMALIZE] Array normalization failed:', err);
    }
    return fallback;
  }
}

// ============================================================================
// DEBUG UTILITIES (DEV ONLY)
// ============================================================================

/**
 * Log normalization differences (DEV only)
 */
export function logNormalizationDiff(original: unknown, normalized: unknown, context: string) {
  if (!DEBUG_MODE) return;
  
  const originalStr = JSON.stringify(original, null, 2);
  const normalizedStr = JSON.stringify(normalized, null, 2);
  
  if (originalStr !== normalizedStr) {
    console.warn(`[NORMALIZE] Diff in ${context}:`, {
      original,
      normalized,
    });
  }
}

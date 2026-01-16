// --- Business Data Types ---

export enum InvoiceStatus {
  Paid = 'Paid',
  Due = 'Due',
  Cancelled = 'Cancelled',
}

export enum PaymentType {
  Cash = 'Cash',
  Credit = 'Credit',
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  unitCost?: number; // snapshot of cost for profit calculation
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  date: string; // ISO 8601 format
  dueDate: string; // ISO 8601 format
  items: InvoiceItem[];
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  paymentType: PaymentType;
  status: InvoiceStatus;
  paymentsSummary?: { paid: number; due: number };
  costTotal?: number; // total cost (sum of unitCost * qty)
  profit?: number; // total - costTotal
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  mobilePhone: string;
  whatsappPhone: string;
  address: string;
  isActive: boolean;
  createdAt: unknown;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  reorderLevel?: number;
  sku?: string;
  unit?: string; // e.g., pcs, box
  defaultCost?: number; // suggested purchase cost
  averageCost?: number; // maintained by inventory logic
  attributes?: Record<string, string>;
}

export type PaymentMethod =
  | 'كاش'
  | 'محفظة'
  | 'إنستاباي'
  | 'تحويل بنكي'
  | 'أخرى';

export interface Payment {
  id: string;
  customerId: string;
  customerName?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  method: PaymentMethod;
  date: string | unknown; // ISO 8601 or Firestore Timestamp
  notes?: string;
  reference?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ReturnItem {
  productId: string;
  nameSnapshot: string;
  quantity: number;
  unitPriceSnapshot: number;
  lineTotal: number;
}

export interface ReturnDoc {
  id: string;
  invoiceId: string;
  customerId: string;
  items: ReturnItem[];
  totalReturnAmount: number;
  date: string | unknown;
  reason?: string;
  mode?: 'refund_cash' | 'credit_note';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName?: string;
  purchaseId?: string;
  amount: number;
  method: PaymentMethod;
  date: string | unknown;
  notes?: string;
  reference?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

// --- Inventory / Ledger Types ---
export interface InventoryItem {
  id: string; // productId or productId_locationId
  productId: string;
  locationId?: string;
  quantity: number;
  reserved?: number;
  averageCost?: number;
  lastUpdated?: unknown;
}

export type StockSourceType = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN' | 'TRANSFER';

export interface StockLedgerEntry {
  id: string;
  companyId?: string;
  productId: string;
  locationId?: string;
  change: number; // positive for in, negative for out
  qtyBefore: number;
  qtyAfter: number;
  unitCost?: number; // cost applied to this movement (for purchases / COGS)
  sourceType: StockSourceType;
  sourceId?: string; // reference to purchase/invoice/adjustment
  userId?: string;
  timestamp: unknown;
  notes?: string;
}

export interface PurchaseItem {
  productId: string;
  sku?: string;
  productName?: string;
  quantity: number;
  unitCost: number;
  lineTotal?: number;
}

export interface Purchase {
  id: string;
  supplierId?: string;
  supplierName?: string;
  items: PurchaseItem[];
  subtotal: number;
  taxAmount?: number;
  total: number;
  currency?: string;
  status?: 'RECEIVED' | 'PARTIAL' | 'ORDERED';
  receivedAt?: unknown;
  createdAt?: unknown;
  userId?: string;
  reference?: string;
}

export interface Counter {
  id: string;
  seq: number;
}

export interface Tax {
  id: string;
  name: string;
  rate: number;
}

export interface Settings {
  businessName: string;
  slogan: string;
  address: string;
  contactInfo: string;
  currency: string;
  logo: string;
  invoiceFooter?: string;
  language?: 'ar' | 'en';
  taxes: Tax[];
  source?: 'firestore' | 'local';
  lockedPeriods?: string[]; // list of YYYY-MM strings representing locked accounting periods
}

export interface StoredExpenseCategory {
  id: string;
  name: string;
}

export interface StoredVendor {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  vendor: string;
  description: string;
  amount: number;
}

export enum QuoteStatus {
  Draft = 'Draft',
  Sent = 'Sent',
  Accepted = 'Accepted',
  Declined = 'Declined',
}

export type QuoteItem = InvoiceItem;

export interface Quote {
  id: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  expiryDate: string;
  items: QuoteItem[];
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  status: QuoteStatus;
}

export enum Frequency {
  Weekly = 'Weekly',
  Monthly = 'Monthly',
  Yearly = 'Yearly',
}

export interface RecurringInvoice {
  id: string;
  customerId: string;
  customerName: string;
  items: InvoiceItem[];
  frequency: Frequency;
  startDate: string;
  nextDueDate: string;
  endDate?: string;
  taxRate?: number;
  autoSend: boolean;
}

// --- Multi-tenant Auth & RBAC Types ---

export enum UserRole {
  Owner = 'owner',
  Manager = 'manager',
  Employee = 'employee',
  Viewer = 'viewer',
}

export interface PlatformAdmin {
  uid: string;
  name: string;
  email: string;
  createdAt: unknown; // serverTimestamp
}

export interface PlatformUser {
  uid: string;
  name: string;
  email: string;
  platformAdmin: boolean;
  createdAt: unknown; // serverTimestamp
}

export interface Company {
  id: string;
  companyName: string;
  companyAddress?: string;
  address?: string;
  logo?: string;
  ownerName?: string;
  phone?: string;
  email?: string;
  emailLower?: string;
  country?: string;
  city?: string;
  businessType?: string;
  status: 'pending' | 'approved' | 'rejected';
  isActive?: boolean;
  plan?: { maxUsers: number } | string;
  ownerUid?: string | null;
  createdAt: unknown; // serverTimestamp
  updatedAt?: unknown;
}

export interface CompanyStats {
  userCount: number;
  invoiceCount: number;
}

export interface CompanyUser {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  mobile?: string;
  role: UserRole;
  status: 'active' | 'disabled';
  profileCompleted: boolean;
  createdAt: unknown; // serverTimestamp
  updatedAt: unknown; // serverTimestamp
}

export interface CompanyInvitation {
  id: string;
  email: string;
  emailLower?: string;
  role: UserRole;
  invitedByUid: string;
  invitedByEmail: string;
  createdAt: unknown; // serverTimestamp
  used: boolean;
  usedByUid?: string;
  usedAt?: unknown; // serverTimestamp
}

// For AuthContext
export interface CompanyMembership {
  companyId: string;
  companyName: string;
  role: UserRole;
  status: 'active' | 'disabled';
}

// Type for paginated data responses
export interface PaginatedData<T> {
  data: T[];
  nextCursor?: unknown;
  prevCursor?: unknown;
}

// --- Inventory / Suppliers Types ---
export interface Supplier {
  id: string;
  supplierName: string;
  supplierNameLower?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt?: unknown;
}

// --- Accounting / Journal ---
export interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string | unknown; // ISO string or Firestore Timestamp
  lines: JournalLine[];
  referenceType?: string | null;
  referenceId?: string | null;
  description?: string | null;
  createdAt?: unknown;
}

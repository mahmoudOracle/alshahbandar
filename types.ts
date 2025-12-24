
// --- Business Data Types ---

export enum InvoiceStatus {
  Paid = 'Paid',
  Due = 'Due',
  Cancelled = 'Cancelled',
}

export enum PaymentType {
  Cash = 'كاش',
  Credit = 'آجل',
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
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
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  mobilePhone: string;
  whatsappPhone: string;
  address: string;
  isActive: boolean;
  createdAt: any; 
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  customerId: string;
  amount: number;
  date: string; // ISO 8601 format
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
  taxes: Tax[];
  source?: 'firestore' | 'local';
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
    Weekly = 'أسبوعي',
    Monthly = 'شهري',
    Yearly = 'سنوي',
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
    createdAt: any; // serverTimestamp
}

export interface Company {
  id: string;
  companyName: string;
  ownerName: string;
  phone: string;
  email: string;
  country: string;
  city: string;
  businessType?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any; // serverTimestamp
  updatedAt?: any;
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
    createdAt: any; // serverTimestamp
    updatedAt: any; // serverTimestamp
}

export interface CompanyInvitation {
    id: string;
    email: string;
  emailLower?: string;
    role: UserRole;
    invitedByUid: string;
    invitedByEmail: string;
    createdAt: any; // serverTimestamp
    used: boolean;
    usedByUid?: string;
    usedAt?: any; // serverTimestamp
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
  nextCursor?: any;
  prevCursor?: any;
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
  createdAt?: any;
}

export interface IncomingReceiptProduct {
  productId: string;
  productName?: string;
  quantityReceived: number;
  note?: string;
}

export interface IncomingReceipt {
  id: string;
  receiptId?: string;
  supplierId: string;
  supplierName?: string;
  products: IncomingReceiptProduct[];
  receivedBy?: string;
  receivedAt?: any;
  createdAt?: any;
  idempotencyKey?: string;
}
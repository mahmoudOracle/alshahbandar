// This file provides a mock implementation of the firestoreService for development purposes.
// It uses in-memory arrays to store data.

import {
  Customer, Product, Invoice, Payment, Settings, Expense, Quote, RecurringInvoice,
  UserRole, StoredExpenseCategory, StoredVendor, InvoiceStatus,
  PaymentType, QuoteStatus, Frequency, PaginatedData, CompanyUser, CompanyInvitation, CompanyMembership
} from '../types';
import { User } from 'firebase/auth';


let customers: Customer[] = [];
let products: Product[] = [];
let invoices: Invoice[] = [];
let payments: Payment[] = [];
let settings: Settings | null = null;
let expenses: Expense[] = [];
let quotes: Quote[] = [];
let recurringInvoices: RecurringInvoice[] = [];
let companyUsers: CompanyUser[] = [];
const invitations: CompanyInvitation[] = [];
const expenseCategories: StoredExpenseCategory[] = [];
const vendors: StoredVendor[] = [];

let lastInvoiceNumber = 0;
let lastQuoteNumber = 0;
let isSeeded = false;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const seedData = async (companyId: string) => {
    if (isSeeded) return;
    console.log(`Seeding MOCK data for company: ${companyId}`);
    
    try {
        const [brandingRes, settingsRes] = await Promise.all([
            fetch('/config/branding.json'),
            fetch('/config/settings.json')
        ]);
        const branding = await brandingRes.json();
        const settingsConfig = await settingsRes.json();
        settings = { ...branding, ...settingsConfig, source: 'local' };
    } catch {
        settings = { businessName: 'Mock Business', slogan: '', address: '', contactInfo: '', currency: 'USD', logo: '', taxes: [], source: 'local' };
    }
    
    // FIX: Updated mock user data to match the CompanyUser interface.
    companyUsers = [
        { uid: 'dev-owner-id', firstName: 'Dev', lastName: 'Owner', fullName: 'Dev Owner', email: 'owner@test.com', role: UserRole.Owner, status: 'active', profileCompleted: true, createdAt: new Date(), updatedAt: new Date() },
        { uid: 'dev-manager-id', firstName: 'Dev', lastName: 'Manager', fullName: 'Dev Manager', email: 'manager@test.com', role: UserRole.Manager, status: 'active', profileCompleted: true, createdAt: new Date(), updatedAt: new Date() },
    ];

    const subtractDays = (date: Date, days: number): Date => {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() - days);
        return newDate;
    };
    const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    const dummyCustomers: Omit<Customer, 'id'>[] = [
        { name: 'شركة النور للتجارة', email: 'sales@alnoor-trade.com', mobilePhone: '0501234567', whatsappPhone: '0501234567', address: '123 شارع الملك فهد، الرياض', isActive: true, createdAt: subtractDays(new Date(), 5).toISOString() },
        { name: 'مقاولات القمة الحديثة', email: 'contact@qimma-con.com', mobilePhone: '0557654321', whatsappPhone: '0557654321', address: '456 طريق الملك عبدالله، جدة', isActive: true, createdAt: subtractDays(new Date(), 15).toISOString() },
    ];
    customers = dummyCustomers.map((c, i) => ({ ...c, id: `cust_${i}`}));

    const dummyProducts: Omit<Product, 'id'>[] = [
        { name: 'استشارة برمجية (ساعة)', description: 'ساعة استشارة.', price: 450, stock: 9999 },
        { name: 'تصميم شعار احترافي', description: 'تصميم شعار فريد.', price: 1800, stock: 9999 },
    ];
    products = dummyProducts.map((p, i) => ({ ...p, id: `prod_${i}`}));

    for (let i = 0; i < 5; i++) {
        const customer = getRandom(customers);
        const product = getRandom(products);
        const items = [{ id: crypto.randomUUID(), productId: product.id, productName: product.name, quantity: 1, price: product.price }];
        const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
        const total = subtotal;
        lastInvoiceNumber++;
        invoices.push({
            id: `inv_${i}`,
            invoiceNumber: `INV-${String(lastInvoiceNumber).padStart(4, '0')}`,
            customerId: customer.id,
            customerName: customer.name,
            date: subtractDays(new Date(), getRandomInt(1, 30)).toISOString().split('T')[0],
            dueDate: new Date().toISOString().split('T')[0],
            items, subtotal, total,
            paymentType: PaymentType.Credit,
            status: InvoiceStatus.Due,
        });
    }

    isSeeded = true;
};

// --- Mock Service Implementation ---

export function initialize(firebaseConfig: any) {
    // This is a no-op for the mock service but is required for type compatibility.
}

const findAndClone = <T extends {id: string}>(repo: T[], id: string): T | undefined => {
    const item = repo.find(x => x.id === id);
    return item ? deepClone(item) : undefined;
};

const saveAndClone = <T extends {id?: string}>(repo: T[], item: Omit<T, 'id'> | T): T => {
    if ('id' in item && item.id) {
        const index = repo.findIndex(x => (x as any).id === item.id);
        if (index > -1) {
            repo[index] = deepClone(item as T);
            return repo[index];
        }
    }
    const newItem = { ...deepClone(item), id: `mock_${Date.now()}` } as T;
    repo.push(newItem);
    return newItem;
};

const deleteById = <T extends {id: string}>(repo: T[], id: string): boolean => {
    const index = repo.findIndex(x => x.id === id);
    if (index > -1) {
        repo.splice(index, 1);
        return true;
    }
    return false;
};

const paginate = <T>(items: T[], options: { limit?: number; startAfter?: number } = {}): PaginatedData<T> => {
    const sortedItems = [...items].reverse();
    return { data: deepClone(sortedItems) };
};


// --- AUTH & MEMBERSHIP (MOCK) ---
export const checkIfPlatformAdmin = async (uid: string): Promise<boolean> => {
    await delay(50);
    return uid === 'platform-admin-uid'; // special UID for mock admin
};

export const getCompanyMemberships = async (uid: string): Promise<CompanyMembership[]> => {
    await delay(100);
    // Return a mock membership for any logged-in user in dev
    if (uid) {
        return [{
            companyId: 'mock-company-id',
            companyName: 'Mock Company Inc.',
            role: UserRole.Owner,
            status: 'active',
        }];
    }
    return [];
};

export const resolveFirstLogin = async (user: User): Promise<{ success: boolean; message?: string }> => {
    await delay(100);
    // No-op for mock, but return a compatible shape. Tests/dev environment can override if needed.
    return { success: false };
};

// --- USER MANAGEMENT (MOCK) ---
export const getCompanyUsers = async (companyId: string): Promise<CompanyUser[]> => { await delay(100); return deepClone(companyUsers); };
export const getPendingInvitations = async (companyId: string): Promise<CompanyInvitation[]> => { await delay(100); return deepClone(invitations); };
export const inviteUser = async (companyId: string, email: string, role: UserRole, invitedBy: { uid: string; email: string; }) => {
    await delay(150);
    const inv: CompanyInvitation = { id: `inv_${Date.now()}`, email, emailLower: (email || '').trim().toLowerCase(), role, invitedByUid: invitedBy.uid, invitedByEmail: invitedBy.email, createdAt: new Date(), used: false };
    return saveAndClone(invitations, inv);
};
export const deleteInvitation = async (companyId: string, invitationId: string) => { await delay(150); return deleteById(invitations, invitationId); };
export const updateUserRole = async (companyId: string, userId: string, role: UserRole) => {
    await delay(150);
    const user = companyUsers.find(u => u.uid === userId);
    if (user) user.role = role;
};
export const removeUserFromCompany = async (companyId: string, userId: string) => { 
    await delay(150);
    const index = companyUsers.findIndex(u => u.uid === userId);
    if (index > -1) {
        companyUsers.splice(index, 1);
        return true;
    }
    return false;
};


// --- Data implementation ---
export const getCustomers = async (companyId: string, options: any = {}): Promise<PaginatedData<Customer>> => { await delay(100); return paginate(customers, options); };
export const getCustomerById = async (companyId: string, id: string): Promise<Customer | undefined> => { await delay(50); return findAndClone(customers, id); };
export const saveCustomer = async (companyId: string, customer: Omit<Customer, 'id' | 'createdAt'> | Customer) => {
    await delay(150);
    const saved = saveAndClone(customers, { ...customer, createdAt: new Date().toISOString() });
    return saved;
};

export const getProducts = async (companyId: string, options: any = {}): Promise<PaginatedData<Product>> => { await delay(100); return paginate(products, options); };
export const getProductById = async (companyId: string, id: string): Promise<Product | undefined> => { await delay(50); return findAndClone(products, id); };
export const saveProduct = async (companyId: string, product: Omit<Product, 'id'> | Product) => { await delay(150); return saveAndClone(products, product); };
export const deleteProduct = async (companyId: string, id: string) => { await delay(150); return deleteById(products, id); };

export const getInvoices = async (companyId: string, options: any = {}): Promise<PaginatedData<Invoice>> => { await delay(100); return paginate(invoices, options); };
export const getInvoiceById = async (companyId: string, id: string): Promise<Invoice | undefined> => { await delay(50); return findAndClone(invoices, id); };
export const saveInvoice = async (companyId: string, invoice: Omit<Invoice, 'id'> | Invoice) => {
    await delay(150);
    if (!('id' in invoice) || !invoice.id) {
        lastInvoiceNumber++;
        (invoice as Invoice).invoiceNumber = `INV-${String(lastInvoiceNumber).padStart(4, '0')}`;
    }
    return saveAndClone(invoices, invoice);
};
export const deleteInvoice = async (companyId: string, id: string) => { await delay(150); return deleteById(invoices, id); };

export const getPayments = async (companyId: string, options: any = {}): Promise<PaginatedData<Payment>> => { await delay(100); return paginate(payments, options); };
export const getPaymentsByCustomerId = async (companyId: string, customerId: string): Promise<PaginatedData<Payment>> => {
    await delay(100);
    const filtered = payments.filter(p => p.customerId === customerId);
    return { data: deepClone(filtered) };
};
export const savePayment = async (companyId: string, payment: Omit<Payment, 'id'> | Payment) => { await delay(150); return saveAndClone(payments, payment); };

export const getSettings = async (companyId: string): Promise<Settings | null> => { await delay(50); return deepClone(settings); };
export const saveSettings = async (companyId: string, newSettings: Settings) => {
    await delay(150);
    settings = deepClone(newSettings);
    return settings;
};

export const getExpenses = async (companyId: string, options: any = {}): Promise<PaginatedData<Expense>> => { await delay(100); return paginate(expenses, options); };
export const getExpenseById = async (companyId: string, id: string): Promise<Expense | undefined> => { await delay(50); return findAndClone(expenses, id); };
export const saveExpense = async (companyId: string, expense: Omit<Expense, 'id'> | Expense) => { await delay(150); return saveAndClone(expenses, expense); };
export const deleteExpense = async (companyId: string, id: string) => { await delay(150); return deleteById(expenses, id); };

export const getExpenseCategories = async (companyId: string): Promise<PaginatedData<StoredExpenseCategory>> => { await delay(50); return { data: deepClone(expenseCategories) }; };
export const saveExpenseCategory = async (companyId: string, category: Omit<StoredExpenseCategory, 'id'>) => { await delay(150); return saveAndClone(expenseCategories, category); };
export const getVendors = async (companyId: string): Promise<PaginatedData<StoredVendor>> => { await delay(50); return { data: deepClone(vendors) }; };
export const saveVendor = async (companyId: string, vendor: Omit<StoredVendor, 'id'>) => { await delay(150); return saveAndClone(vendors, vendor); };

export const getQuotes = async (companyId: string, options: any = {}): Promise<PaginatedData<Quote>> => { await delay(100); return paginate(quotes, options); };
export const getQuoteById = async (companyId: string, id: string): Promise<Quote | undefined> => { await delay(50); return findAndClone(quotes, id); };
export const saveQuote = async (companyId: string, quote: Omit<Quote, 'id'> | Quote) => {
    await delay(150);
    if (!('id' in quote) || !quote.id) {
        lastQuoteNumber++;
        (quote as Quote).quoteNumber = `QT-${String(lastQuoteNumber).padStart(4, '0')}`;
    }
    return saveAndClone(quotes, quote);
};

export const getRecurringInvoices = async (companyId: string, options: any = {}): Promise<PaginatedData<RecurringInvoice>> => { await delay(100); return paginate(recurringInvoices, options); };
export const getRecurringInvoiceById = async (companyId: string, id: string): Promise<RecurringInvoice | undefined> => { await delay(50); return findAndClone(recurringInvoices, id); };
export const saveRecurringInvoice = async (companyId: string, rec: Omit<RecurringInvoice, 'id'> | RecurringInvoice) => { await delay(150); return saveAndClone(recurringInvoices, rec); };
export const deleteRecurringInvoice = async (companyId: string, id: string) => { await delay(150); return deleteById(recurringInvoices, id); };

export const createInvoiceFromQuote = async (companyId: string, quoteId: string) => {
    await delay(200);
    const quote = findAndClone(quotes, quoteId);
    if (!quote) throw new Error("Quote not found");
    
    const newInvoiceData: Omit<Invoice, 'id'> = {
        invoiceNumber: '',
        customerId: quote.customerId,
        customerName: quote.customerName,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: quote.items,
        subtotal: quote.subtotal,
        taxRate: quote.taxRate,
        taxAmount: quote.taxAmount,
        total: quote.total,
        paymentType: PaymentType.Credit,
        status: InvoiceStatus.Due,
    };

    return saveInvoice(companyId, newInvoiceData);
};

export const generateInvoicesFromRecurring = async (companyId: string) => {
    await delay(200);
    return [];
};

// Dev Actions
export const populateDummyData = async (companyId: string) => { isSeeded = false; await seedData(companyId); return true; };
export const deleteAllCompanyData = async (companyId: string) => {
    customers = [];
    products = [];
    invoices = [];
    payments = [];
    expenses = [];
    quotes = [];
    recurringInvoices = [];
    isSeeded = false;
    await delay(200);
    console.log("Mock data cleared.");
};
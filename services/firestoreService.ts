import {
    collection, getDocs, doc, getDoc, setDoc, addDoc, deleteDoc, writeBatch, query, where,
    orderBy,
    startAfter,
    limit as firestoreLimit,
    QueryConstraint,
    QueryDocumentSnapshot,
    collectionGroup,
    runTransaction,
    Timestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { User } from 'firebase/auth';
import { 
    Invoice, Customer, Product, Payment, Settings, Expense, Quote, RecurringInvoice, 
    InvoiceStatus, PaymentType, QuoteStatus, Frequency, UserRole, StoredExpenseCategory, StoredVendor, PaginatedData,
    CompanyMembership, CompanyUser, CompanyInvitation, Company, CompanyStats
} from '../types';
import { db, functions, auth } from './firebase';


// --- PLATFORM ADMIN REPOSITORY ---

interface PlatformQueryOptions {
    limit?: number;
    startAfter?: QueryDocumentSnapshot;
    status?: boolean; // active/inactive filter
}

export const getCompanies = async (options: PlatformQueryOptions = {}): Promise<PaginatedData<Company>> => {
    // NOTE: In a real app, this should be a secured cloud function for platform admins.
    const { limit: queryLimit, startAfter: startAfterDoc, status } = options;
    const constraints: QueryConstraint[] = [];

    if (status !== undefined) {
        constraints.push(where('isActive', '==', status));
    }
    constraints.push(orderBy('createdAt', 'desc'));

    if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc));
    }

    if (queryLimit) {
        constraints.push(firestoreLimit(queryLimit + 1));
    }

    const q = query(collection(db, 'companies'), ...constraints);
    const querySnapshot = await getDocs(q);

    let docs = querySnapshot.docs;
    let hasMore = false;
    if (queryLimit && docs.length > queryLimit) {
        hasMore = true;
        docs.pop();
    }

    const data = docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Company));
    
    return {
        data,
        nextCursor: hasMore ? docs[docs.length - 1] : undefined,
    };
};

export const createCompany = async (companyData: Pick<Company, 'id' | 'name' | 'ownerEmail' | 'plan'>): Promise<Company> => {
    // NOTE: In a real app, this should be a secured cloud function for platform admins.
    const companyRef = doc(db, 'companies', companyData.id);

    const newCompany: Omit<Company, 'id'> = {
        name: companyData.name,
        ownerEmail: companyData.ownerEmail,
        plan: companyData.plan,
        isActive: true,
        ownerUid: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };

    await runTransaction(db, async (transaction) => {
        const companyDoc = await transaction.get(companyRef);
        if (companyDoc.exists()) {
            const err = new Error('Company ID already exists.');
            (err as any).code = 'already-exists';
            throw err;
        }
        transaction.set(companyRef, newCompany);
    });

    return { ...newCompany, id: companyData.id };
};


export const updateCompanyStatus = async (companyId: string, isActive: boolean): Promise<void> => {
    // NOTE: In a real app, this should be a secured cloud function for platform admins.
    const companyRef = doc(db, 'companies', companyId);
    await setDoc(companyRef, { isActive, updatedAt: Timestamp.now() }, { merge: true });
};

export const getCompanyCounts = async (companyId: string): Promise<CompanyStats> => {
    // NOTE: This is inefficient for large datasets and should be a cloud function with counters.
    const usersSnapshot = await getDocs(collection(db, 'companies', companyId, 'users'));
    const invoicesSnapshot = await getDocs(collection(db, 'companies', companyId, 'invoices'));
    return {
        userCount: usersSnapshot.size,
        invoiceCount: invoicesSnapshot.size,
    };
};


// --- RBAC REPOSITORY GUARDS ---

type WriteableSection = 'invoices' | 'customers' | 'products' | 'expenses' | 'settings' | 'users' | 'quotes' | 'recurring' | 'payments' | 'reports';

// This is insecure and should not be used for writes. It's kept for read-only UI logic for now.
function getRuntimeRole(): UserRole | null {
  try {
    const raw = localStorage.getItem('app:activeRole');
    if (raw && Object.values(UserRole).includes(raw as UserRole)) {
      return raw as UserRole;
    }
    return null;
  } catch { 
    return null;
  }
}

// Insecure, but kept to avoid breaking the UI layer. Real security is in Firestore Rules.
function ensureWriteAllowed(section: WriteableSection) {
  const role = getRuntimeRole();
  let allowed = false;
  if (role === UserRole.Owner || role === UserRole.Manager) {
    allowed = true;
  } else if (role === UserRole.Employee) {
    allowed = section !== 'settings' && section !== 'users';
  }
  
  if (!allowed) {
    const err = new Error('صلاحية غير كافية لتنفيذ هذا الإجراء.');
    (err as any).code = 'forbidden-role';
    throw err;
  }
}

// --- NEW QUERY INTERFACE ---
interface QueryOptions {
    limit?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    startAfter?: QueryDocumentSnapshot;
    filters?: [string, "==", any][];
}


// --- HELPER FUNCTIONS ---

const getCollectionRef = (companyId: string, collectionName: string) => {
    return collection(db, 'companies', companyId, collectionName);
};

const getData = async <T>(
    companyId: string,
    collectionName: string,
    options: QueryOptions = {}
): Promise<PaginatedData<T>> => {
    const {
        limit: queryLimit,
        orderBy: orderByField,
        orderDirection = 'desc',
        startAfter: startAfterDoc,
        filters = []
    } = options;

    const constraints: QueryConstraint[] = [];

    filters.forEach(f => constraints.push(where(f[0], f[1], f[2])));

    if (orderByField) {
        constraints.push(orderBy(orderByField, orderDirection));
    }

    if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc));
    }
    
    // Fetch one extra to determine if a next page exists
    if (queryLimit) {
        constraints.push(firestoreLimit(queryLimit + 1));
    }

    const q = query(getCollectionRef(companyId, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);

    let docs = querySnapshot.docs;
    let hasMore = false;
    if (queryLimit && docs.length > queryLimit) {
        hasMore = true;
        docs.pop(); // Remove the extra doc
    }

    const data = docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));

    return {
        data,
        nextCursor: hasMore ? docs[docs.length - 1] : undefined,
    };
};

const getById = async <T>(companyId: string, collectionName: string, id: string): Promise<T | undefined> => {
    const docRef = doc(db, 'companies', companyId, collectionName, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as unknown as T : undefined;
};

const saveData = async <T extends { id?: string }>(companyId: string, collectionName: string, item: Omit<T, 'id'> | T, section: WriteableSection): Promise<T> => {
    ensureWriteAllowed(section);
    if ('id' in item && item.id) {
        const { id, ...data } = item;
        const docRef = doc(db, 'companies', companyId, collectionName, id);
        await setDoc(docRef, data, { merge: true });
        return item as T;
    } else {
        const docRef = await addDoc(getCollectionRef(companyId, collectionName), item);
        return { id: docRef.id, ...item } as T;
    }
};

const deleteData = async (companyId: string, collectionName: string, id: string, section: WriteableSection): Promise<boolean> => {
    ensureWriteAllowed(section);
    await deleteDoc(doc(db, 'companies', companyId, collectionName, id));
    return true;
};

// --- AUTH & MEMBERSHIP RESOLUTION ---

export const checkIfPlatformAdmin = async (uid: string): Promise<boolean> => {
    const adminRef = doc(db, 'platformAdmins', uid);
    const adminSnap = await getDoc(adminRef);
    return adminSnap.exists();
};

export const getCompanyMemberships = async (uid: string): Promise<CompanyMembership[]> => {
    const memberships: CompanyMembership[] = [];
    const usersQuery = query(collectionGroup(db, 'users'), where('uid', '==', uid));
    const querySnapshot = await getDocs(usersQuery);

    for (const userDoc of querySnapshot.docs) {
        const userData = userDoc.data() as CompanyUser;
        const companyId = userDoc.ref.parent.parent?.id; // companies/{companyId}/users/{userId}
        if (companyId) {
            const companyDoc = await getDoc(doc(db, 'companies', companyId));
            if (companyDoc.exists()) {
                memberships.push({
                    companyId: companyId,
                    companyName: companyDoc.data().name || 'Unnamed Company',
                    role: userData.role,
                    status: userData.status,
                });
            }
        }
    }
    return memberships;
};

export const resolveFirstLogin = async (user: User): Promise<boolean> => {
    let membershipCreated = false;
    // 1. Check for company ownership claim
    const ownerQuery = query(
        collection(db, 'companies'),
        where('ownerEmail', '==', user.email),
        where('ownerUid', '==', null)
    );
    const ownerSnapshot = await getDocs(ownerQuery);

    if (!ownerSnapshot.empty) {
        const companyDoc = ownerSnapshot.docs[0];
        const companyId = companyDoc.id;
        
        await runTransaction(db, async (transaction) => {
            transaction.update(doc(db, 'companies', companyId), {
                ownerUid: user.uid,
                updatedAt: Timestamp.now()
            });
            const userRef = doc(db, `companies/${companyId}/users/${user.uid}`);
            transaction.set(userRef, {
                uid: user.uid,
                name: user.displayName || 'Owner',
                email: user.email,
                role: UserRole.Owner,
                status: 'active',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
        });
        membershipCreated = true;
        return membershipCreated; // Exit early after claiming ownership
    }

    // 2. Check for staff invitations
    const invitationQuery = query(
        collectionGroup(db, 'invitations'),
        where('email', '==', user.email),
        where('used', '==', false)
    );
    const invitationSnapshot = await getDocs(invitationQuery);

    if (!invitationSnapshot.empty) {
        for (const invitationDoc of invitationSnapshot.docs) {
            const invitationData = invitationDoc.data() as CompanyInvitation;
            const companyId = invitationDoc.ref.parent.parent?.id;

            if (companyId) {
                await runTransaction(db, async (transaction) => {
                    const userRef = doc(db, `companies/${companyId}/users/${user.uid}`);
                    transaction.set(userRef, {
                        uid: user.uid,
                        name: user.displayName || user.email,
                        email: user.email,
                        role: invitationData.role,
                        status: 'active',
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    });
                    transaction.update(invitationDoc.ref, {
                        used: true,
                        usedByUid: user.uid,
                        usedAt: Timestamp.now(),
                    });
                });
                membershipCreated = true;
            }
        }
    }
    return membershipCreated;
};

// --- USER MANAGEMENT (MULTI-TENANT) ---
export const getCompanyUsers = async (companyId: string): Promise<CompanyUser[]> => {
    const result = await getData<CompanyUser>(companyId, 'users');
    return result.data;
};

export const getPendingInvitations = async (companyId: string): Promise<CompanyInvitation[]> => {
    const result = await getData<CompanyInvitation>(companyId, 'invitations', { filters: [['used', '==', false]] });
    return result.data;
};

export const inviteUser = async (companyId: string, email: string, role: UserRole, invitedBy: { uid: string; email: string; }): Promise<CompanyInvitation> => {
    ensureWriteAllowed('users');
    const invitation: Omit<CompanyInvitation, 'id'> = { 
        email, 
        role, 
        invitedByUid: invitedBy.uid,
        invitedByEmail: invitedBy.email,
        createdAt: Timestamp.now(),
        used: false,
    };
    return await saveData(companyId, 'invitations', invitation, 'users');
};

export const deleteInvitation = async (companyId: string, invitationId: string): Promise<boolean> => {
    ensureWriteAllowed('users');
    return await deleteData(companyId, 'invitations', invitationId, 'users');
};

export const updateUserRole = async (companyId: string, userId: string, role: UserRole): Promise<void> => {
    ensureWriteAllowed('users');
    const userRef = doc(db, 'companies', companyId, 'users', userId);
    await setDoc(userRef, { role, updatedAt: Timestamp.now() }, { merge: true });
};

export const removeUserFromCompany = async (companyId: string, userId: string): Promise<boolean> => {
    ensureWriteAllowed('users');
    return await deleteData(companyId, 'users', userId, 'users');
};

// --- SETTINGS ---
export const getSettings = async (companyId: string): Promise<Settings | null> => {
    const docRef = doc(db, 'companies', companyId, 'settings', 'app');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as Settings : null;
};

export const saveSettings = async (companyId: string, settings: Omit<Settings, 'source'>): Promise<Omit<Settings, 'source'>> => {
    ensureWriteAllowed('settings');
    const docRef = doc(db, 'companies', companyId, 'settings', 'app');
    await setDoc(docRef, settings, { merge: true });
    return settings;
};

// --- DATA SERVICES (Bulletproofed) ---
const updateStockAtomically = async (companyId: string, invoice: Invoice, operation: 'increase' | 'decrease') => {
    ensureWriteAllowed('invoices'); // Internal stock updates are tied to invoice permissions
    if (invoice.items.length === 0) return;

    const batch = writeBatch(db);
    for (const item of invoice.items) {
        if (item.productId) {
            const productRef = doc(db, 'companies', companyId, 'products', item.productId);
            const productDoc = await getDoc(productRef); 
            if (productDoc.exists()) {
                const currentStock = productDoc.data().stock || 0;
                const newStock = operation === 'decrease'
                    ? currentStock - item.quantity
                    : currentStock + item.quantity;
                batch.update(productRef, { stock: newStock });
            }
        }
    }
    await batch.commit();
};

const getNextDocumentNumber = async (companyId: string, type: 'invoice' | 'quote'): Promise<string> => {
    ensureWriteAllowed(type === 'invoice' ? 'invoices' : 'quotes');
    const counterRef = doc(db, 'companies', companyId, 'counters', 'main');
    const companySnap = await getDoc(counterRef);
    let nextNumber = 1;

    if (companySnap.exists()) {
        const data = companySnap.data();
        if (type === 'invoice') {
            nextNumber = (data.lastInvoiceNumber || 0) + 1;
        } else {
            nextNumber = (data.lastQuoteNumber || 0) + 1;
        }
    }
    
    const updateData = type === 'invoice' ? { lastInvoiceNumber: nextNumber } : { lastQuoteNumber: nextNumber };
    await setDoc(counterRef, updateData, { merge: true });

    const prefix = type === 'invoice' ? 'INV' : 'QT';
    return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
};

// --- Public API ---
export const getCustomers = (companyId: string, options: QueryOptions = {}) => getData<Customer>(companyId, 'customers', { orderBy: 'createdAt', ...options });
export const getCustomerById = (companyId: string, id: string) => getById<Customer>(companyId, 'customers', id);
export const saveCustomer = (companyId: string, customer: Omit<Customer, 'id' | 'createdAt'> | Customer) => {
    if ('id' in customer && customer.id) {
        return saveData<Customer>(companyId, 'customers', customer, 'customers');
    } else {
        const newCustomerWithTimestamp: Omit<Customer, 'id'> = {
            ...customer,
            createdAt: new Date().toISOString(),
        };
        return saveData<Customer>(companyId, 'customers', newCustomerWithTimestamp, 'customers');
    }
};

export const getProducts = (companyId: string, options: QueryOptions = {}) => getData<Product>(companyId, 'products', options);
export const getProductById = (companyId: string, id: string) => getById<Product>(companyId, 'products', id);
export const saveProduct = (companyId: string, product: Omit<Product, 'id'> | Product) => saveData<Product>(companyId, 'products', product, 'products');
export const deleteProduct = (companyId: string, id: string) => deleteData(companyId, 'products', id, 'products');

export const getInvoices = (companyId: string, options: QueryOptions = {}) => getData<Invoice>(companyId, 'invoices', { orderBy: 'date', ...options });
export const getInvoiceById = (companyId: string, id: string) => getById<Invoice>(companyId, 'invoices', id);

export const saveInvoice = async (companyId: string, invoice: Omit<Invoice, 'id'> | Invoice): Promise<Invoice> => {
    let invoiceToSave = { ...invoice };

    if (!('id' in invoiceToSave) || !invoiceToSave.id) {
        invoiceToSave.invoiceNumber = await getNextDocumentNumber(companyId, 'invoice');
    }
    
    invoiceToSave.subtotal = invoiceToSave.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    invoiceToSave.total = invoiceToSave.subtotal;
    delete invoiceToSave.taxRate;
    delete invoiceToSave.taxAmount;

    if ('id' in invoiceToSave && invoiceToSave.id) { // This is an update
        const oldInvoice = await getInvoiceById(companyId, invoiceToSave.id);
        if (oldInvoice) await updateStockAtomically(companyId, oldInvoice, 'increase');
    }
    
    const savedInvoice = await saveData<Invoice>(companyId, 'invoices', invoiceToSave, 'invoices');
    await updateStockAtomically(companyId, savedInvoice, 'decrease');
    
    return savedInvoice;
};

export const deleteInvoice = async (companyId: string, id: string): Promise<boolean> => {
    const invoiceToDelete = await getInvoiceById(companyId, id);
    if (invoiceToDelete) await updateStockAtomically(companyId, invoiceToDelete, 'increase');
    return deleteData(companyId, 'invoices', id, 'invoices');
};

export const getPayments = (companyId: string, options: QueryOptions = {}) => getData<Payment>(companyId, 'payments', { orderBy: 'date', ...options });
export const getPaymentsByCustomerId = (companyId: string, customerId: string) => {
    return getData<Payment>(companyId, 'payments', { filters: [['customerId', '==', customerId]], orderBy: 'date' });
};

export const savePayment = async (companyId: string, payment: Omit<Payment, 'id'> | Payment): Promise<Payment> => {
    const savedPayment = await saveData<Payment>(companyId, 'payments', payment, 'payments');
    
    if (savedPayment.invoiceId) {
        const invoice = await getById<Invoice>(companyId, 'invoices', savedPayment.invoiceId);
        if (invoice && invoice.status !== InvoiceStatus.Paid) {
            const paymentsResult = await getPaymentsByCustomerId(companyId, invoice.customerId);
            const totalPaid = paymentsResult.data
                .filter(p => p.invoiceId === savedPayment.invoiceId)
                .reduce((sum, p) => sum + p.amount, 0);

            if (totalPaid >= invoice.total) {
                await saveData<Invoice>(companyId, 'invoices', { ...invoice, status: InvoiceStatus.Paid }, 'invoices');
            }
        }
    }
    return savedPayment;
};


export const getExpenses = (companyId: string, options: QueryOptions = {}) => getData<Expense>(companyId, 'expenses', { orderBy: 'date', ...options });
export const getExpenseById = (companyId: string, id: string) => getById<Expense>(companyId, 'expenses', id);
export const saveExpense = (companyId: string, expense: Omit<Expense, 'id'> | Expense) => saveData<Expense>(companyId, 'expenses', expense, 'expenses');
export const deleteExpense = (companyId: string, id: string) => deleteData(companyId, 'expenses', id, 'expenses');

export const getExpenseCategories = (companyId: string) => getData<StoredExpenseCategory>(companyId, 'expenseCategories');
export const saveExpenseCategory = (companyId: string, category: Omit<StoredExpenseCategory, 'id'>) => saveData<StoredExpenseCategory>(companyId, 'expenseCategories', category, 'expenses');
export const getVendors = (companyId: string) => getData<StoredVendor>(companyId, 'vendors');
export const saveVendor = (companyId: string, vendor: Omit<StoredVendor, 'id'>) => saveData<StoredVendor>(companyId, 'vendors', vendor, 'expenses');


export const getQuotes = (companyId: string, options: QueryOptions = {}) => getData<Quote>(companyId, 'quotes', { orderBy: 'date', ...options });
export const getQuoteById = (companyId: string, id: string) => getById<Quote>(companyId, 'quotes', id);
export const saveQuote = async (companyId: string, quote: Omit<Quote, 'id'> | Quote): Promise<Quote> => {
    if (!('id' in quote)) {
        (quote as Quote).quoteNumber = await getNextDocumentNumber(companyId, 'quote');
    }
    return saveData<Quote>(companyId, 'quotes', quote, 'quotes');
};

export const createInvoiceFromQuote = async (companyId: string, quoteId: string): Promise<Invoice> => {
    ensureWriteAllowed('invoices'); // Creating an invoice from a quote requires invoice permissions
    const quote = await getQuoteById(companyId, quoteId);
    if (!quote) throw new Error("Quote not found");

    const newInvoiceData: Omit<Invoice, 'id'> = {
        invoiceNumber: '',
        customerId: quote.customerId,
        customerName: quote.customerName,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: quote.items,
        subtotal: quote.subtotal,
        total: quote.total,
        paymentType: PaymentType.Credit,
        status: InvoiceStatus.Due,
    };
    
    await saveData<Quote>(companyId, 'quotes', { ...quote, status: QuoteStatus.Accepted }, 'quotes');
    
    return saveInvoice(companyId, newInvoiceData);
};

export const getRecurringInvoices = (companyId: string, options: QueryOptions = {}) => getData<RecurringInvoice>(companyId, 'recurringInvoices', { orderBy: 'nextDueDate', ...options });
export const getRecurringInvoiceById = (companyId: string, id: string) => getById<RecurringInvoice>(companyId, 'recurringInvoices', id);
export const saveRecurringInvoice = (companyId: string, rec: Omit<RecurringInvoice, 'id'> | RecurringInvoice) => saveData<RecurringInvoice>(companyId, 'recurringInvoices', rec, 'recurring');
export const deleteRecurringInvoice = (companyId: string, id: string) => deleteData(companyId, 'recurringInvoices', id, 'recurring');
export const generateInvoicesFromRecurring = async (companyId: string): Promise<Invoice[]> => {
    ensureWriteAllowed('invoices'); // Generating invoices requires invoice permissions
    const recurringResult = await getRecurringInvoices(companyId);
    const recurring = recurringResult.data;
    const today = new Date().toISOString().split('T')[0];
    const invoicesToCreate: Omit<Invoice, 'id'>[] = [];
    const recurringToUpdate: RecurringInvoice[] = [];

    for (const rec of recurring) {
        if (rec.nextDueDate <= today && (!rec.endDate || rec.endDate >= today)) {
             const subtotal = rec.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
             const taxAmount = subtotal * ((rec.taxRate || 0) / 100);
             const total = subtotal + taxAmount;
            
            invoicesToCreate.push({
                invoiceNumber: '',
                customerId: rec.customerId,
                customerName: rec.customerName,
                date: today,
                dueDate: today,
                items: rec.items,
                subtotal: subtotal,
                taxRate: rec.taxRate,
                taxAmount: taxAmount,
                total: total,
                paymentType: PaymentType.Credit,
                status: InvoiceStatus.Due,
            });

            const nextDueDate = new Date(rec.nextDueDate);
            if (rec.frequency === Frequency.Weekly) nextDueDate.setDate(nextDueDate.getDate() + 7);
            if (rec.frequency === Frequency.Monthly) nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            if (rec.frequency === Frequency.Yearly) nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            
            recurringToUpdate.push({ ...rec, nextDueDate: nextDueDate.toISOString().split('T')[0] });
        }
    }

    if (invoicesToCreate.length === 0) return [];
    
    const createdInvoices = await Promise.all(invoicesToCreate.map(inv => saveInvoice(companyId, inv)));
    await Promise.all(recurringToUpdate.map(rec => saveRecurringInvoice(companyId, rec)));
    
    return createdInvoices;
};

// --- DEVELOPMENT ---
export const deleteAllCompanyData = async (companyId: string): Promise<void> => {
    ensureWriteAllowed('settings'); // A manager-only action
    console.warn(`DELETING ALL DATA for company ${companyId}`);
    const collections = ['customers', 'products', 'invoices', 'payments', 'expenses', 'quotes', 'recurringInvoices', 'expenseCategories', 'vendors', 'settings', 'counters', 'users', 'invitations'];
    const batch = writeBatch(db);

    for (const collectionName of collections) {
        const querySnapshot = await getDocs(getCollectionRef(companyId, collectionName));
        querySnapshot.docs.forEach(doc => batch.delete(doc.ref));
    }
    
    await batch.commit();
    console.log(`All data for company ${companyId} has been cleared.`);
};

// FIX: Add function to call the 'createInvitation' cloud function.
export const createCustomerInvitation = async (email: string, companyName: string, notes: string): Promise<any> => {
    const createInvitationFunction = httpsCallable(functions, 'createInvitation');
    const result = await createInvitationFunction({ email, companyName, notes });
    return result.data;
};

// This function is not applicable in Firestore mode, it's for mocks.
export const populateDummyData = (companyId: string): Promise<boolean> => Promise.resolve(false);
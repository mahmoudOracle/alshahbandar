import * as firestoreService from './firestoreService';

type ServiceModule = typeof firestoreService;

let service: ServiceModule | null = null;
let dataSourceType: string = 'uninitialized';

/**
 * Injects the concrete data service implementation (e.g., firestoreService or mockService).
 * This must be called at application startup after Firebase is initialized.
 * @param impl - The service module to use.
 * @param name - A string identifier for the service implementation (e.g., 'firestore').
 */
export const setDataServiceImpl = (impl: ServiceModule, name: string): void => {
    service = impl;
    dataSourceType = name;
};

/**
 * Returns the name of the currently configured data source.
 */
export const getDataSourceType = (): string => dataSourceType;

// This is a proxy that ensures the service implementation is set before being used.
// It throws a clear error if any service function is called prematurely.
// Simple in-memory read cache to reduce repeated reads and improve perceived performance
const READ_CACHE_TTL = 15 * 1000; // 15 seconds
const readCache = new Map<string, { ts: number; data: any }>();

const cacheKey = (fn: string | symbol, args: unknown[]) => {
    try {
        return `${String(fn)}:${JSON.stringify(args)}`;
    } catch {
        return `${String(fn)}:${args.map(a => String(a)).join('|')}`;
    }
};

const READ_CACHE_FUNCS = new Set(['getProducts', 'getCustomers', 'getInvoices', 'getSettings', 'getQuotes', 'getPayments', 'getExpenses', 'getJournalEntries']);
// Cache supplier reads as well
READ_CACHE_FUNCS.add('getSuppliers');

const safeService = new Proxy({}, {
    get(_target, prop: string | symbol) {
        return async (...args: unknown[]) => {
            if (!service) {
                throw new Error(`Data service has not been initialized. Ensure setDataServiceImpl() is called at startup.`);
            }

            const svcAny = service as any;
            if (typeof svcAny[prop] !== 'function') {
                const errorMsg = `Service function "${String(prop)}" does not exist.`;
                console.error(errorMsg);
                return Promise.reject(new Error(errorMsg));
            }

            // Serve from cache for some read-only functions
            if (READ_CACHE_FUNCS.has(String(prop))) {
                const key = cacheKey(prop, args);
                const cached = readCache.get(key);
                const now = Date.now();
                if (cached && (now - cached.ts) < READ_CACHE_TTL) {
                    return cached.data;
                }
                const res = await svcAny[prop](...args);
                readCache.set(key, { ts: now, data: res });
                return res;
            }

            return svcAny[prop](...args);
        };
    }
}) as ServiceModule;


// Export all functions through the safe proxy
export const {
    // Platform Admin
    getCompanies,
    createCompany,
    updateCompanyStatus,
    getCompanyCounts,
    // Auth & Users
    checkIfPlatformAdmin,
    getCompanyMemberships,
    createCompanyWithOwner,
    resolveFirstLogin,
    getCompanyUsers,
    getUserProfile,
    getCompany,
    getPendingInvitations,
    inviteUser,
    updateUserRole,
    removeUserFromCompany,
    deleteInvitation,
        updateCompanyDetails,
        logAdminAction,
        getAdminActions,
    // Business Data
    getCustomers,
    getCustomerById,
    saveCustomer,
    getProducts,
    getProductById,
    saveProduct,
    deleteProduct,
    getInvoices,
    getInvoiceById,
    saveInvoice,
    duplicateLastInvoice,
    deleteInvoice,
    getPayments,
    getPaymentsByCustomerId,
    savePayment,
    getJournalEntries,
    getExpenses,
    getExpenseById,
    saveExpense,
    deleteExpense,
    getExpenseCategories,
    saveExpenseCategory,
    getVendors,
    saveVendor,
    // Suppliers & Receiving
    getSuppliers,
    getSupplierById,
    saveSupplier,
    deleteSupplier,
    getIncomingReceipts,
    getIncomingReceiptById,
    saveGoodsReceipt,
    saveIncomingReceipt,
    editIncomingReceipt,
    createJournalEntry,
    createPurchase,
    createPurchaseReturn,
    createSalesReturn,
    getQuotes,
    getQuoteById,
    saveQuote,
    createInvoiceFromQuote,
    getRecurringInvoices,
    getRecurringInvoiceById,
    saveRecurringInvoice,
    deleteRecurringInvoice,
    generateInvoicesFromRecurring,
    getSettings,
    saveSettings,
    // Customer Invitations
    createCustomerInvitation,
    acceptInvitation,
    undeleteDocument,
    // Development
    populateDummyData,
    deleteAllCompanyData
} = safeService;
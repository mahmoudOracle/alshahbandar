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
export const setDataServiceImpl = (impl: ServiceModule, name: string) => {
    service = impl;
    dataSourceType = name;
};

/**
 * Returns the name of the currently configured data source.
 */
export const getDataSourceType = () => dataSourceType;

// This is a proxy that ensures the service implementation is set before being used.
// It throws a clear error if any service function is called prematurely.
const safeService = new Proxy({}, {
    get(target, prop) {
        return (...args: any[]) => {
            if (!service) {
                // This is a critical developer error, so we throw to stop execution.
                throw new Error(`Data service has not been initialized. Ensure setDataServiceImpl() is called at startup.`);
            }

            const svcAny = service as any;
            if (typeof svcAny[prop] !== 'function') {
                const errorMsg = `Service function "${String(prop)}" does not exist.`;
                console.error(errorMsg);
                return Promise.reject(new Error(errorMsg));
            }

            return svcAny[prop](...args);
        }
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
    deleteInvoice,
    getPayments,
    getPaymentsByCustomerId,
    savePayment,
    getExpenses,
    getExpenseById,
    saveExpense,
    deleteExpense,
    getExpenseCategories,
    saveExpenseCategory,
    getVendors,
    saveVendor,
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
    // Development
    populateDummyData,
    deleteAllCompanyData
} = safeService;
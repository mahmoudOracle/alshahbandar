
import * as firestoreService from './firestoreService';

type ServiceModule = typeof firestoreService;

let service: ServiceModule | null = null;

/**
 * Injects the concrete data service implementation (e.g., firestoreService or mockService).
 * This must be called at application startup after Firebase is initialized.
 * @param impl - The service module to use.
 */
export const setDataServiceImpl = (impl: ServiceModule) => {
    service = impl;
};

// This is a proxy that ensures the service implementation is set before being used.
// It throws a clear error if any service function is called prematurely.
const safeService = new Proxy({}, {
    get(target, prop) {
        return (...args: any[]) => {
            if (!service) {
                // This is a critical developer error, so we throw to stop execution.
                throw new Error(`Data service has not been initialized. Ensure setDataServiceImpl() is called at startup.`);
            }
            
            // @ts-ignore
            if (typeof service[prop] !== 'function') {
                const errorMsg = `Service function "${String(prop)}" does not exist.`;
                console.error(errorMsg);
                return Promise.reject(new Error(errorMsg));
            }

            // @ts-ignore
            return service[prop](...args);
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
    resolveFirstLogin,
    getCompanyUsers,
    getPendingInvitations,
    inviteUser,
    deleteInvitation,
    updateUserRole,
    removeUserFromCompany,
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
    // Development
    populateDummyData,
    deleteAllCompanyData
} = safeService;

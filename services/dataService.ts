import * as firestoreService from './firestoreService';
import { SanityError } from '../src/utils/sanityGate';

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
const readCache = new Map<string, { ts: number; data: unknown }>();

// Map of write operations to cache keys they invalidate
const CACHE_INVALIDATION_MAP: Record<string, string[]> = {
  'saveInvoice': ['getInvoices', 'getReports', 'getJournalEntries'],
  'deleteInvoice': ['getInvoices', 'getReports'],
  'savePayment': ['getPayments', 'getInvoices', 'getReports'],
  'saveCustomer': ['getCustomers'],
  'saveProduct': ['getProducts'],
  'saveExpense': ['getExpenses', 'getReports'],
  'saveQuote': ['getQuotes'],
  'createReturnAtomic': ['getReturns', 'getProducts', 'getInvoices', 'getReports'],
};

const cacheKey = (fn: string | symbol, args: unknown[]) => {
  try {
    return `${String(fn)}:${JSON.stringify(args)}`;
  } catch {
    return `${String(fn)}:${args.map((a) => String(a)).join('|')}`;
  }
};

/**
 * Clear read cache entries matching the specified cache keys
 */
export const clearReadCache = (keys?: string[]): void => {
  if (!keys || keys.length === 0) {
    readCache.clear();
    return;
  }
  for (const key of readCache.keys()) {
    if (keys.some((k) => key.startsWith(k))) {
      readCache.delete(key);
    }
  }
};

const READ_CACHE_FUNCS = new Set([
  'getProducts',
  'getCustomers',
  'getInvoices',
  'getSettings',
  'getQuotes',
  'getPayments',
  'getExpenses',
  'getJournalEntries',
]);
// Cache supplier reads as well
READ_CACHE_FUNCS.add('getSuppliers');
// Cache reports reads
READ_CACHE_FUNCS.add('getReports');
// Cache returns reads
READ_CACHE_FUNCS.add('getReturns');

const safeService = new Proxy(
  {},
  {
    get(_target, prop: string | symbol) {
      return async (...args: unknown[]) => {
        if (!service) {
          throw new Error(
            `Data service has not been initialized. Ensure setDataServiceImpl() is called at startup.`
          );
        }

        const svc = service as unknown as Record<string, (...args: unknown[]) => unknown>;
        if (typeof svc[String(prop)] !== 'function') {
          const errorMsg = `Service function "${String(prop)}" does not exist.`;
          console.error(errorMsg);
          return Promise.reject(new Error(errorMsg));
        }

        // Handle write operations (cache invalidation)
        const propStr = String(prop);
        if (CACHE_INVALIDATION_MAP[propStr]) {
          const result = await (svc[propStr](...args) as unknown);
          // Clear related caches after successful write
          if (import.meta.env.DEV) {
            console.log(`[CACHE INVALIDATE] Clearing caches for ${propStr}:`, CACHE_INVALIDATION_MAP[propStr]);
          }
          clearReadCache(CACHE_INVALIDATION_MAP[propStr]);
          return result;
        }

        // Serve from cache for some read-only functions
        if (READ_CACHE_FUNCS.has(propStr)) {
          const key = cacheKey(prop, args);
          const cached = readCache.get(key);
          const now = Date.now();
          if (cached && now - cached.ts < READ_CACHE_TTL) {
            if (import.meta.env.DEV) {
              console.log(`[CACHE HIT] ${propStr}`, { ttlMs: now - cached.ts });
            }
            return cached.data;
          }
          const res = await (svc[propStr](...args) as unknown);
          readCache.set(key, { ts: now, data: res });
          return res;
        }

        return svc[propStr](...args);
      };
    },
  }
) as ServiceModule;

// Export all functions through the safe proxy
export const {
  // Platform Admin
  getCompanies,
  createCompany,
  createPlatformCompanyWithManager,
  platformCreateCompany,
  platformListCompanies,
  getPlatformSummary,
  setCompanyActive,
  logAuditEvent,
  updateCompanyStatus,
  getCompanyCounts,
  getCompanyStatsSummary,
  listCompaniesForPlatformAdmin,
  // Auth & Users
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
  // Draft persistence
  saveDraft,
  getDraft,
  deleteDraft,
  duplicateLastInvoice,
  duplicateInvoice,
  deleteInvoice,
  getPayments,
  getPaymentsByCustomerId,
  getPaymentsByInvoiceId,
  savePayment,
  totalPaidForInvoice,
  customerBalance,
  getReturns,
  getReturnsByInvoiceId,
  createReturnAtomic,
  getJournalEntries,
  getExpenses,
  getExpenseById,
  saveExpense,
  deleteExpense,
  getPurchases,
  getSupplierPayments,
  getSupplierPaymentsBySupplierId,
  saveSupplierPayment,
  getExpenseCategories,
  saveExpenseCategory,
  getVendors,
  saveVendor,
  // Suppliers & Receiving
  getSuppliers,
  getSupplierById,
  saveSupplier,
  deleteSupplier,
  saveGoodsReceipt,
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
  getInventory,
  getStockLedger,
  getReports,
  // Reports
  getSalesSummary,
  exportSalesCsv,
  // Customer Invitations
  createCustomerInvitation,
  acceptInvitation,
  undeleteDocument,
  // Development
  populateDummyData,
  deleteAllCompanyData,
} = safeService;

// Export SanityError for use in components and error handling
export { SanityError };

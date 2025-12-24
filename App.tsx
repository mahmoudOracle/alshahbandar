
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Bars3Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import Sidebar from './components/Sidebar';
import { SettingsProvider } from './contexts/SettingsContext';
import ThemeToggle from './components/ThemeToggle';
import CommandBar from './components/CommandBar';
import { FullPageSpinner } from './components/Spinner';
import { useCanWrite } from './contexts/AuthContext';
import OfflineBanner from './components/OfflineBanner';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load page components for code splitting and faster initial load
const Dashboard = lazy(() => import('./pages/Dashboard'));
const InvoiceList = lazy(() => import('./pages/InvoiceList'));
const CustomerList = lazy(() => import('./pages/CustomerList'));
const ProductList = lazy(() => import('./pages/ProductList'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const InvoiceForm = lazy(() => import('./pages/InvoiceForm'));
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const CustomerForm = lazy(() => import('./pages/CustomerForm'));
const ProductForm = lazy(() => import('./pages/ProductForm'));
const QuoteList = lazy(() => import('./pages/QuoteList'));
const QuoteForm = lazy(() => import('./pages/QuoteForm'));
const QuoteDetail = lazy(() => import('./pages/QuoteDetail'));
const RecurringInvoiceList = lazy(() => import('./pages/RecurringInvoiceList'));
const RecurringInvoiceForm = lazy(() => import('./pages/RecurringInvoiceForm'));
const ExpenseList = lazy(() => import('./pages/ExpenseList'));
const ExpenseForm = lazy(() => import('./pages/ExpenseForm'));
const Reports = lazy(() => import('./pages/Reports'));
const NotAuthorizedPage = lazy(() => import('./pages/NotAuthorizedPage'));

interface PageTitlePermissions {
    invoices: boolean;
    quotes: boolean;
    recurring: boolean;
    customers: boolean;
    products: boolean;
    expenses: boolean;
}

const getPageTitle = (path: string, permissions: PageTitlePermissions): string => {
    // Invoices
    if (path.startsWith('/invoices/new')) return permissions.invoices ? 'فاتورة جديدة' : 'عرض فاتورة';
    if (path.startsWith('/invoices/edit/')) return permissions.invoices ? 'تعديل فاتورة' : 'عرض فاتورة';
    if (path.startsWith('/invoices/')) return 'تفاصيل الفاتورة';
    if (path === '/invoices') return 'كل الفواتير';
    // Quotes
    if (path.startsWith('/quotes/new')) return permissions.quotes ? 'عرض سعر جديد' : 'عرض سعر';
    if (path.startsWith('/quotes/edit/')) return permissions.quotes ? 'تعديل عرض سعر' : 'عرض سعر';
    if (path.startsWith('/quotes/')) return 'تفاصيل عرض السعر';
    if (path === '/quotes') return 'عروض الأسعار';
    // Recurring
    if (path.startsWith('/recurring/new')) return permissions.recurring ? 'فاتورة متكررة جديدة' : 'عرض فاتورة متكررة';
    if (path.startsWith('/recurring/edit/')) return permissions.recurring ? 'تعديل فاتورة متكررة' : 'عرض فاتورة متكررة';
    if (path === '/recurring') return 'الفواتير المتكررة';
    // Customers
    if (path.startsWith('/customers/new')) return permissions.customers ? 'إضافة عميل' : 'عرض عميل';
    if (path.startsWith('/customers/edit/')) return permissions.customers ? 'تعديل عميل' : 'عرض عميل';
    if (path.startsWith('/customers/')) return 'تفاصيل العميل';
    if (path === '/customers') return 'العملاء';
    // Products
    if (path.startsWith('/products/new')) return permissions.products ? 'إضافة منتج' : 'عرض منتج';
    if (path.startsWith('/products/edit/')) return permissions.products ? 'تعديل منتج' : 'عرض منتج';
    if (path === '/products') return 'المنتجات';
    // Expenses
    if (path.startsWith('/expenses/new')) return permissions.expenses ? 'مصروف جديد' : 'عرض مصروف';
    if (path.startsWith('/expenses/edit/')) return permissions.expenses ? 'تعديل مصروف' : 'عرض مصروف';
    if (path === '/expenses') return 'المصروفات';
    // Other
    if (path.startsWith('/reports')) return 'التقارير';
    if (path.startsWith('/settings')) return 'الإعدادات';
    if (path.startsWith('/admin')) return 'وصول غير مصرح به';
    return 'ملخص'; // Fallback
};

const AppRoutes: React.FC = () => (
    <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/invoices/new" element={<InvoiceForm />} />
        <Route path="/invoices/edit/:id" element={<InvoiceForm />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/customers" element={<CustomerList />} />
        <Route path="/customers/new" element={<CustomerForm />} />
        <Route path="/customers/edit/:id" element={<CustomerForm />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="/products/new" element={<ProductForm />} />
        <Route path="/products/edit/:id" element={<ProductForm />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/quotes" element={<QuoteList />} />
        <Route path="/quotes/new" element={<QuoteForm />} />
        <Route path="/quotes/edit/:id" element={<QuoteForm />} />
        <Route path="/quotes/:id" element={<QuoteDetail />} />
        <Route path="/recurring" element={<RecurringInvoiceList />} />
        <Route path="/recurring/new" element={<RecurringInvoiceForm />} />
        <Route path="/recurring/edit/:id" element={<RecurringInvoiceForm />} />
        <Route path="/expenses" element={<ExpenseList />} />
        <Route path="/expenses/new" element={<ExpenseForm />} />
        <Route path="/expenses/edit/:id" element={<ExpenseForm />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/admin/*" element={<NotAuthorizedPage />} />
    </Routes>
)

function App() {
    const location = useLocation();
    const [pageTitle, setPageTitle] = useState('ملخص');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
    
    const canWriteInvoices = useCanWrite('invoices');
    const canWriteQuotes = useCanWrite('quotes');
    const canWriteRecurring = useCanWrite('recurring');
    const canWriteCustomers = useCanWrite('customers');
    const canWriteProducts = useCanWrite('products');
    const canWriteExpenses = useCanWrite('expenses');

    useEffect(() => {
        const permissions: PageTitlePermissions = {
            invoices: canWriteInvoices,
            quotes: canWriteQuotes,
            recurring: canWriteRecurring,
            customers: canWriteCustomers,
            products: canWriteProducts,
            expenses: canWriteExpenses,
        };
        setPageTitle(getPageTitle(location.pathname, permissions));
    }, [location.pathname, canWriteInvoices, canWriteQuotes, canWriteRecurring, canWriteCustomers, canWriteProducts, canWriteExpenses]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                setIsCommandBarOpen(o => !o);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <CommandBar isOpen={isCommandBarOpen} onClose={() => setIsCommandBarOpen(false)} />
            <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                ></div>
            )}

            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-4 relative">
                    <OfflineBanner />
                    <div className="flex items-center w-full sm:w-auto">
                        <button 
                            onClick={() => setSidebarOpen(true)} 
                            className="md:hidden text-gray-500 dark:text-gray-400 focus:outline-none me-4"
                            aria-controls="sidebar"
                            aria-expanded={isSidebarOpen}
                            aria-label="Open sidebar"
                        >
                            <Bars3Icon className="h-6 w-6" />
                        </button>
                        <h1 className="text-2xl font-bold">{pageTitle}</h1>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setIsCommandBarOpen(true)}
                            className="flex items-center gap-2 w-full sm:w-auto text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/80 px-3 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Open command bar"
                        >
                           <MagnifyingGlassIcon className="h-5 w-5" />
                           <span className="hidden sm:inline">بحث وتنقل سريع...</span>
                           <kbd className="hidden sm:inline text-xs font-sans border dark:border-gray-500 rounded px-1.5 py-1">⌘K</kbd>
                        </button>
                        <ThemeToggle />
                    </div>
                </header>
                <div id="main-content" className="flex-1 p-4 md:p-6 overflow-auto">
                    <Suspense fallback={<FullPageSpinner />}>
                        <div key={location.pathname} className="page-transition">
                           <AppRoutes />
                        </div>
                    </Suspense>
                </div>
            </main>
        </div>
    )
}

const AppWrapper: React.FC = () => {
    return (
        <HashRouter>
            <SettingsProvider>
                <ErrorBoundary>
                    <App />
                </ErrorBoundary>
            </SettingsProvider>
        </HashRouter>
    )
}


export default AppWrapper;

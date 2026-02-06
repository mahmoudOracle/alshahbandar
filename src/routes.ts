import { lazy, ReactNode } from 'react';
import {
  HomeIcon,
  DocumentTextIcon,
  UsersIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  ChartPieIcon,
  WalletIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// UNIFIED ROUTING TYPES
// ============================================================================

export type RouteId =
  | 'dashboard'
  | 'invoices'
  | 'invoiceForm'
  | 'invoiceDetail'
  | 'customers'
  | 'customerForm'
  | 'customerDetail'
  | 'products'
  | 'productForm'
  | 'expenses'
  | 'expenseForm'
  | 'dailyCollection'
  | 'reports'
  | 'quotes'
  | 'quoteForm'
  | 'quoteDetail'
  | 'suppliers'
  | 'purchases'
  | 'settings'
  | 'profile'
  | 'cashFlow'
  | 'invite'
  | 'completeSetup'
  | 'unauthorized'
  | 'devDebug'
  | 'platformAdmin';

export interface AppRoute {
  id: RouteId;
  path: string;
  component: ReactNode;
  labelKey?: string;
  showInSidebar?: boolean;
  showInBottomNav?: boolean;
  sidebarGroup?: 'main' | 'admin' | 'hidden';
  order?: number;
}

// ============================================================================
// LAZY LOADED COMPONENTS
// ============================================================================

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const InvoiceList = lazy(() => import('@/pages/InvoiceList'));
const InvoiceForm = lazy(() => import('@/pages/InvoiceForm'));
const InvoiceDetail = lazy(() => import('@/pages/InvoiceDetail'));
const CashFlow = lazy(() => import('@/pages/CashFlow'));
const CustomerList = lazy(() => import('@/pages/CustomerList'));
const CustomerForm = lazy(() => import('@/pages/CustomerForm'));
const CustomerDetail = lazy(() => import('@/pages/CustomerDetail'));
const DailyCollection = lazy(() => import('@/pages/DailyCollection'));
const QuoteList = lazy(() => import('@/pages/QuoteList'));
const QuoteForm = lazy(() => import('@/pages/QuoteForm'));
const QuoteDetail = lazy(() => import('@/pages/QuoteDetail'));
const ProductList = lazy(() => import('@/pages/ProductList'));
const ProductForm = lazy(() => import('@/pages/ProductForm'));
const PurchasesPage = lazy(() => import('@/pages/PurchasesPage'));
const SuppliersPage = lazy(() => import('@/pages/SuppliersPage'));
const ProfilePage = lazy(() => import('@/pages/Profile'));
const AcceptInvitationPage = lazy(() => import('@/pages/AcceptInvitationPage'));
const CompleteCompanySetupPage = lazy(() => import('@/pages/CompleteCompanySetupPage'));
const ExpenseList = lazy(() => import('@/pages/ExpenseList'));
const ExpenseForm = lazy(() => import('@/pages/ExpenseForm'));
const Reports = lazy(() => import('@/pages/Reports'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const NotAuthorizedPage = lazy(() => import('@/pages/NotAuthorizedPage'));
const DevDebugPage = lazy(() => import('@/pages/DevDebugPage'));
const PlatformAdminPage = lazy(() => import('@/pages/PlatformAdminPage'));

// ============================================================================
// UNIFIED APP ROUTES - SINGLE SOURCE OF TRUTH
// ============================================================================

export const APP_ROUTES: AppRoute[] = [
  // Public/Auth Routes
  {
    id: 'invite',
    path: '/invite/accept',
    component: AcceptInvitationPage,
    labelKey: 'acceptInvitation',
    showInSidebar: false,
    showInBottomNav: false,
  },
  {
    id: 'completeSetup',
    path: '/complete-setup',
    component: CompleteCompanySetupPage,
    labelKey: 'completeSetup',
    showInSidebar: false,
    showInBottomNav: false,
  },
  {
    id: 'unauthorized',
    path: '/unauthorized',
    component: NotAuthorizedPage,
    labelKey: 'unauthorized',
    showInSidebar: false,
    showInBottomNav: false,
  },

  // Main App Routes (under /app)
  {
    id: 'dashboard',
    path: '/app/dashboard',
    component: Dashboard,
    labelKey: 'navDashboard',
    showInSidebar: true,
    showInBottomNav: true,
    sidebarGroup: 'main',
    order: 1,
  },
  {
    id: 'invoices',
    path: '/app/invoices',
    component: InvoiceList,
    labelKey: 'navInvoices',
    showInSidebar: true,
    showInBottomNav: true,
    sidebarGroup: 'main',
    order: 2,
  },
  {
    id: 'invoiceForm',
    path: '/app/invoices/new',
    component: InvoiceForm,
    labelKey: 'navNewInvoice',
    showInSidebar: false,
    showInBottomNav: false,
  },
  {
    id: 'invoiceDetail',
    path: '/app/invoices/:id',
    component: InvoiceDetail,
    labelKey: 'navInvoiceDetail',
    showInSidebar: false,
    showInBottomNav: false,
  },
  {
    id: 'products',
    path: '/app/products',
    component: ProductList,
    labelKey: 'navProducts',
    showInSidebar: true,
    showInBottomNav: true,
    sidebarGroup: 'main',
    order: 3,
  },
  {
    id: 'productForm',
    path: '/app/products/new',
    component: ProductForm,
    labelKey: 'navNewProduct',
    showInSidebar: false,
    showInBottomNav: false,
  },
  {
    id: 'expenses',
    path: '/app/expenses',
    component: ExpenseList,
    labelKey: 'navExpenses',
    showInSidebar: true,
    showInBottomNav: true,
    sidebarGroup: 'main',
    order: 4,
  },
  {
    id: 'expenseForm',
    path: '/app/expenses/new',
    component: ExpenseForm,
    labelKey: 'navNewExpense',
    showInSidebar: false,
    showInBottomNav: false,
  },
  // ✅ CRITICAL FIX: Daily Collection route aligned with sidebar navigation
  {
    id: 'dailyCollection',
    path: '/app/daily-collection',
    component: DailyCollection,
    labelKey: 'navDailyCollection',
    showInSidebar: true,
    showInBottomNav: false,
    sidebarGroup: 'main',
    order: 5,
  },
  {
    id: 'settings',
    path: '/app/settings',
    component: SettingsPage,
    labelKey: 'navSettings',
    showInSidebar: true,
    showInBottomNav: true,
    sidebarGroup: 'main',
    order: 6,
  },

  // Admin/Secondary Routes
  {
    id: 'customers',
    path: '/app/customers',
    component: CustomerList,
    labelKey: 'navCustomers',
    showInSidebar: true,
    showInBottomNav: false,
    sidebarGroup: 'admin',
    order: 10,
  },
  {
    id: 'customerForm',
    path: '/app/customers/new',
    component: CustomerForm,
    labelKey: 'navNewCustomer',
    showInSidebar: false,
    showInBottomNav: false,
  },
  {
    id: 'customerDetail',
    path: '/app/customers/:id',
    component: CustomerDetail,
    labelKey: 'navCustomerDetail',
    showInSidebar: false,
    showInBottomNav: false,
  },
  {
    id: 'purchases',
    path: '/app/purchases',
    component: PurchasesPage,
    labelKey: 'navPurchases',
    showInSidebar: true,
    showInBottomNav: false,
    sidebarGroup: 'admin',
    order: 11,
  },
  {
    id: 'suppliers',
    path: '/app/suppliers',
    component: SuppliersPage,
    labelKey: 'navSuppliers',
    showInSidebar: true,
    showInBottomNav: false,
    sidebarGroup: 'admin',
    order: 12,
  },
  {
    id: 'reports',
    path: '/app/reports',
    component: Reports,
    labelKey: 'navReports',
    showInSidebar: true,
    showInBottomNav: false,
    sidebarGroup: 'admin',
    order: 13,
  },

  // Other Routes
  {
    id: 'quotes',
    path: '/app/quotes',
    component: QuoteList,
    labelKey: 'navQuotes',
    showInSidebar: false,
    showInBottomNav: false,
  },
  {
    id: 'quoteForm',
    path: '/app/quotes/new',
    component: QuoteForm,
    labelKey: 'navNewQuote',
    showInSidebar: false,
    showInBottomNav: false,
  },
  {
    id: 'quoteDetail',
    path: '/app/quotes/:id',
    component: QuoteDetail,
    labelKey: 'navQuoteDetail',
    showInSidebar: false,
    showInBottomNav: false,
  },
  {
    id: 'profile',
    path: '/app/profile',
    component: ProfilePage,
    labelKey: 'navProfile',
    showInSidebar: false,
    showInBottomNav: false,
  },
  {
    id: 'cashFlow',
    path: '/app/cash-flow',
    component: CashFlow,
    labelKey: 'navCashFlow',
    showInSidebar: false,
    showInBottomNav: false,
  },
  ...(import.meta.env.DEV
    ? [
        {
          id: 'devDebug' as RouteId,
          path: '/dev/debug',
          component: DevDebugPage,
          labelKey: 'devDebug',
          showInSidebar: false,
          showInBottomNav: false,
        },
      ]
    : []),
  {
    id: 'platformAdmin',
    path: '/app/platform',
    component: PlatformAdminPage,
    labelKey: 'navPlatformAdmin',
    showInSidebar: false,
    showInBottomNav: false,
  },
];

// ============================================================================
// FILTERED ROUTE COLLECTIONS FOR NAVIGATION
// ============================================================================

export const NAV_ROUTES_SIDEBAR = APP_ROUTES.filter((r) => r.showInSidebar).sort(
  (a, b) => (a.order ?? 999) - (b.order ?? 999),
);

export const NAV_ROUTES_BOTTOM = APP_ROUTES.filter((r) => r.showInBottomNav).sort(
  (a, b) => (a.order ?? 999) - (b.order ?? 999),
);

export const SIDEBAR_GROUPS = {
  main: NAV_ROUTES_SIDEBAR.filter((r) => r.sidebarGroup === 'main'),
  admin: NAV_ROUTES_SIDEBAR.filter((r) => r.sidebarGroup === 'admin'),
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getRoutePath = (id: RouteId, params?: Record<string, string>): string => {
  const route = APP_ROUTES.find((r) => r.id === id);
  if (!route) {
    console.warn(`Route with id "${id}" not found`);
    return '/app/dashboard';
  }

  let path = route.path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`:${key}`, value);
    });
  }
  return path;
};

export const getRouteById = (id: RouteId): AppRoute | undefined => {
  return APP_ROUTES.find((r) => r.id === id);
};

// ============================================================================
// LEGACY EXPORTS (For backwards compatibility)
// ============================================================================

const devRoutes = import.meta.env.DEV
  ? [{ path: '/dev/debug', component: DevDebugPage, title: 'Dev Debug' }]
  : [];

export const routes = [
  { path: '/invite/accept', component: AcceptInvitationPage, title: 'قبول الدعوة' },
  {
    path: '/invite/accept/:companyId/:inviteId/:token',
    component: AcceptInvitationPage,
    title: 'قبول الدعوة',
  },
  { path: '/complete-setup', component: CompleteCompanySetupPage, title: 'إكمال الإعداد' },
  { path: '/dashboard', component: Dashboard, title: 'ملخّص' },
  { path: '/invoices', component: InvoiceList, title: 'الفواتير' },
  { path: '/invoices/new', component: InvoiceForm, title: 'فاتورة جديدة' },
  { path: '/invoices/edit/:id', component: InvoiceForm, title: 'تعديل فاتورة' },
  { path: '/invoices/:id', component: InvoiceDetail, title: 'تفاصيل الفاتورة' },
  { path: '/customers', component: CustomerList, title: 'العملاء' },
  { path: '/customers/new', component: CustomerForm, title: 'عميل جديد' },
  { path: '/customers/edit/:id', component: CustomerForm, title: 'تعديل عميل' },
  { path: '/customers/:id', component: CustomerDetail, title: 'تفاصيل العميل' },
  { path: '/daily-collection', component: DailyCollection, title: 'التحصيل اليومي' },
  { path: '/products', component: ProductList, title: 'المنتجات والمخزون' },
  { path: '/products/new', component: ProductForm, title: 'منتج جديد' },
  { path: '/products/edit/:id', component: ProductForm, title: 'تعديل منتج' },
  { path: '/profile', component: ProfilePage, title: 'ملف الشركة' },
  { path: '/quotes', component: QuoteList, title: 'عروض الأسعار' },
  { path: '/quotes/new', component: QuoteForm, title: 'إنشاء عرض سعر' },
  { path: '/quotes/edit/:id', component: QuoteForm, title: 'تعديل عرض سعر' },
  { path: '/quotes/:id', component: QuoteDetail, title: 'تفاصيل عرض السعر' },
  { path: '/expenses', component: ExpenseList, title: 'المصروفات' },
  { path: '/expenses/new', component: ExpenseForm, title: 'مصروف جديد' },
  { path: '/expenses/edit/:id', component: ExpenseForm, title: 'تعديل مصروف' },
  { path: '/reports', component: Reports, title: 'التقارير' },
  { path: '/cash-flow', component: CashFlow, title: 'تدفق نقدي' },
  { path: '/purchases', component: PurchasesPage, title: 'المشتريات' },
  { path: '/suppliers', component: SuppliersPage, title: 'الموردون' },
  { path: '/admin/*', component: NotAuthorizedPage, title: 'غير مصرح' },
  { path: '/settings', component: SettingsPage, title: 'الإعدادات' },
  { path: '/settings/*', component: SettingsPage, title: 'الإعدادات' },
  { path: '/platform', component: PlatformAdminPage, title: 'شركات المنصة' },
  ...devRoutes,
  { path: '*', component: NotAuthorizedPage, title: 'غير مصرح' },
];

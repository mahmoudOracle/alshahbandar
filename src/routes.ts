import { lazy } from 'react';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const InvoiceList = lazy(() => import('@/pages/InvoiceList'));
const InvoiceForm = lazy(() => import('@/pages/InvoiceForm'));
const InvoiceDetail = lazy(() => import('@/pages/InvoiceDetail'));
const CashFlow = lazy(() => import('@/pages/CashFlow'));
const CustomerList = lazy(() => import('@/pages/CustomerList'));
const CustomerForm = lazy(() => import('@/pages/CustomerForm'));
const CustomerDetail = lazy(() => import('@/pages/CustomerDetail'));
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
  { path: '/', component: Dashboard, title: 'ملخّص' },
  { path: '/invoices', component: InvoiceList, title: 'الفواتير' },
  { path: '/invoices/new', component: InvoiceForm, title: 'فاتورة جديدة' },
  { path: '/invoices/edit/:id', component: InvoiceForm, title: 'تعديل فاتورة' },
  { path: '/invoices/:id', component: InvoiceDetail, title: 'تفاصيل الفاتورة' },
  { path: '/customers', component: CustomerList, title: 'العملاء' },
  { path: '/customers/new', component: CustomerForm, title: 'عميل جديد' },
  { path: '/customers/edit/:id', component: CustomerForm, title: 'تعديل عميل' },
  { path: '/customers/:id', component: CustomerDetail, title: 'تفاصيل العميل' },
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

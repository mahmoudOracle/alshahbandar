import { lazy } from 'react';

// Feature-based lazy imports (keeps original pages but groups them by domain)
const Dashboard = lazy(
  () => import('@/features/reports').then((m) => ({ default: m.Dashboard })) as any
);
const InvoiceList = lazy(
  () => import('@/features/accounting').then((m) => ({ default: m.InvoiceList })) as any
);
const InvoiceForm = lazy(
  () => import('@/features/accounting').then((m) => ({ default: m.InvoiceForm })) as any
);
const InvoiceDetail = lazy(
  () => import('@/features/accounting').then((m) => ({ default: m.InvoiceDetail })) as any
);
const AccountingCashFlow = lazy(
  () => import('@/features/accounting').then((m) => ({ default: m.CashFlow })) as any
);
const CashFlow = AccountingCashFlow;
const CustomerList = lazy(
  () => import('@/features/sales').then((m) => ({ default: m.CustomerList })) as any
);
const CustomerForm = lazy(
  () => import('@/features/sales').then((m) => ({ default: m.CustomerForm })) as any
);
const CustomerDetail = lazy(
  () => import('@/features/sales').then((m) => ({ default: m.CustomerDetail })) as any
);
const QuoteList = lazy(
  () => import('@/features/sales').then((m) => ({ default: m.QuoteList })) as any
);
const QuoteForm = lazy(
  () => import('@/features/sales').then((m) => ({ default: m.QuoteForm })) as any
);
const QuoteDetail = lazy(
  () => import('@/features/sales').then((m) => ({ default: m.QuoteDetail })) as any
);
const ProductList = lazy(
  () => import('@/features/inventory').then((m) => ({ default: m.ProductList })) as any
);
const ProductForm = lazy(
  () => import('@/features/inventory').then((m) => ({ default: m.ProductForm })) as any
);
const PurchasesPage = lazy(
  () => import('@/features/inventory').then((m) => ({ default: m.PurchasesPage })) as any
);
const SuppliersPage = lazy(
  () => import('@/features/inventory').then((m) => ({ default: m.SuppliersPage })) as any
);
const WarehousePage = lazy(
  () => import('@/features/inventory').then((m) => ({ default: m.WarehousePage })) as any
);
const InventoryAudit = lazy(
  () => import('@/features/inventory').then((m) => ({ default: m.InventoryAudit })) as any
);
const IncomingReceiptsList = lazy(
  () => import('@/features/inventory').then((m) => ({ default: m.IncomingReceiptsList })) as any
);
const ReceiptDetailPage = lazy(
  () => import('@/features/inventory').then((m) => ({ default: m.ReceiptDetailPage })) as any
);
const ProfilePage = lazy(() => import('@/pages/Profile'));
const AcceptInvitationPage = lazy(() => import('@/pages/AcceptInvitationPage'));
const CompleteCompanySetupPage = lazy(() => import('@/pages/CompleteCompanySetupPage'));
const RecurringInvoiceList = lazy(() => import('@/pages/RecurringInvoiceList'));
const RecurringInvoiceForm = lazy(() => import('@/pages/RecurringInvoiceForm'));
const ExpenseList = lazy(() => import('@/pages/ExpenseList'));
const ExpenseForm = lazy(() => import('@/pages/ExpenseForm'));
const Reports = lazy(() => import('@/pages/Reports'));
const NotAuthorizedPage = lazy(() => import('@/pages/NotAuthorizedPage'));
const DevDebugPage = lazy(() => import('@/pages/DevDebugPage'));

export const routes = [
  { path: '/invite/accept', component: AcceptInvitationPage, title: 'Accept Invitation' },
  {
    path: '/invite/accept/:companyId/:inviteId/:token',
    component: AcceptInvitationPage,
    title: 'Accept Invitation',
  },
  { path: '/complete-setup', component: CompleteCompanySetupPage, title: 'Complete Setup' },
  { path: '/', component: Dashboard, title: 'ملخص' },
  { path: '/invoices', component: InvoiceList, title: 'الفواتير' },
  { path: '/invoices/new', component: InvoiceForm, title: 'فاتورة جديدة' },
  { path: '/invoices/edit/:id', component: InvoiceForm, title: 'تعديل الفاتورة' },
  { path: '/invoices/:id', component: InvoiceDetail, title: 'تفاصيل الفاتورة' },
  { path: '/customers', component: CustomerList, title: 'العملاء' },
  { path: '/customers/new', component: CustomerForm, title: 'عميل جديد' },
  { path: '/customers/edit/:id', component: CustomerForm, title: 'تحرير العميل' },
  { path: '/customers/:id', component: CustomerDetail, title: 'تفاصيل العميل' },
  { path: '/products', component: ProductList, title: 'المنتجات' },
  { path: '/products/new', component: ProductForm, title: 'منتج جديد' },
  { path: '/products/edit/:id', component: ProductForm, title: 'تحرير المنتج' },
  { path: '/profile', component: ProfilePage, title: 'الإعدادات' },
  { path: '/quotes', component: QuoteList, title: 'عروض الأسعار' },
  { path: '/quotes/new', component: QuoteForm, title: 'عرض سعر جديد' },
  { path: '/quotes/edit/:id', component: QuoteForm, title: 'تعديل عرض السعر' },
  { path: '/quotes/:id', component: QuoteDetail, title: 'تفاصيل عرض السعر' },
  { path: '/recurring', component: RecurringInvoiceList, title: 'الفواتير المتكررة' },
  { path: '/recurring/new', component: RecurringInvoiceForm, title: 'فاتورة متكررة جديدة' },
  { path: '/recurring/edit/:id', component: RecurringInvoiceForm, title: 'تعديل فاتورة متكررة' },
  { path: '/expenses', component: ExpenseList, title: 'المصروفات' },
  { path: '/expenses/new', component: ExpenseForm, title: 'مصروف جديد' },
  { path: '/expenses/edit/:id', component: ExpenseForm, title: 'تعديل المصروف' },
  { path: '/reports', component: Reports, title: 'التقارير' },
  { path: '/cash-flow', component: CashFlow, title: 'قائمة التدفقات النقدية' },
  { path: '/purchases', component: PurchasesPage, title: 'المشتريات' },
  { path: '/suppliers', component: SuppliersPage, title: 'الموردون' },
  // Receipt creation removed — use suppliers and receipts list instead
  { path: '/receipts', component: IncomingReceiptsList, title: 'سندات الاستلام' },
  { path: '/receipts/:id', component: ReceiptDetailPage, title: 'تفاصيل السند' },
  { path: '/warehouse', component: WarehousePage, title: 'المخزن' },
  { path: '/inventory-audit', component: InventoryAudit, title: 'سجل المخزون' },
  { path: '/admin/*', component: NotAuthorizedPage, title: 'وصول غير مصرح به' },
  { path: '/dev/debug', component: DevDebugPage, title: 'Dev Debug' },
];

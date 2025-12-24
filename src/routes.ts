import { lazy } from 'react';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const InvoiceList = lazy(() => import('@/pages/InvoiceList'));
const CustomerList = lazy(() => import('@/pages/CustomerList'));
const ProductList = lazy(() => import('@/pages/ProductList'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const InvoiceForm = lazy(() => import('@/pages/InvoiceForm'));
const InvoiceDetail = lazy(() => import('@/pages/InvoiceDetail'));
const AcceptInvitationPage = lazy(() => import('@/pages/AcceptInvitationPage'));
const CompleteCompanySetupPage = lazy(() => import('@/pages/CompleteCompanySetupPage'));
const CustomerDetail = lazy(() => import('@/pages/CustomerDetail'));
const CustomerForm = lazy(() => import('@/pages/CustomerForm'));
const ProductForm = lazy(() => import('@/pages/ProductForm'));
const QuoteList = lazy(() => import('@/pages/QuoteList'));
const QuoteForm = lazy(() => import('@/pages/QuoteForm'));
const QuoteDetail = lazy(() => import('@/pages/QuoteDetail'));
const RecurringInvoiceList = lazy(() => import('@/pages/RecurringInvoiceList'));
const RecurringInvoiceForm = lazy(() => import('@/pages/RecurringInvoiceForm'));
const ExpenseList = lazy(() => import('@/pages/ExpenseList'));
const ExpenseForm = lazy(() => import('@/pages/ExpenseForm'));
const Reports = lazy(() => import('@/pages/Reports'));
const NotAuthorizedPage = lazy(() => import('@/pages/NotAuthorizedPage'));
const DevDebugPage = lazy(() => import('@/pages/DevDebugPage'));
const SuppliersPage = lazy(() => import('@/pages/SuppliersPage'));
const PurchasesPage = lazy(() => import('@/pages/PurchasesPage'));
const WarehousePage = lazy(() => import('@/pages/WarehousePage'));
const IncomingReceiptsList = lazy(() => import('@/pages/IncomingReceiptsList'));
const ReceiptDetailPage = lazy(() => import('@/pages/ReceiptDetailPage'));

export const routes = [
  { path: "/invite/accept", component: AcceptInvitationPage, title: "Accept Invitation" },
  { path: "/invite/accept/:companyId/:inviteId/:token", component: AcceptInvitationPage, title: "Accept Invitation" },
  { path: "/complete-setup", component: CompleteCompanySetupPage, title: "Complete Setup" },
  { path: "/", component: Dashboard, title: "ملخص" },
  { path: "/invoices", component: InvoiceList, title: "الفواتير" },
  { path: "/invoices/new", component: InvoiceForm, title: "فاتورة جديدة" },
  { path: "/invoices/edit/:id", component: InvoiceForm, title: "تعديل الفاتورة" },
  { path: "/invoices/:id", component: InvoiceDetail, title: "تفاصيل الفاتورة" },
  { path: "/customers", component: CustomerList, title: "العملاء" },
  { path: "/customers/new", component: CustomerForm, title: "عميل جديد" },
  { path: "/customers/edit/:id", component: CustomerForm, title: "تحرير العميل" },
  { path: "/customers/:id", component: CustomerDetail, title: "تفاصيل العميل" },
  { path: "/products", component: ProductList, title: "المنتجات" },
  { path: "/products/new", component: ProductForm, title: "منتج جديد" },
  { path: "/products/edit/:id", component: ProductForm, title: "تحرير المنتج" },
  { path: "/settings", component: SettingsPage, title: "الإعدادات" },
  { path: "/quotes", component: QuoteList, title: "عروض الأسعار" },
  { path: "/quotes/new", component: QuoteForm, title: "عرض سعر جديد" },
  { path: "/quotes/edit/:id", component: QuoteForm, title: "تعديل عرض السعر" },
  { path: "/quotes/:id", component: QuoteDetail, title: "تفاصيل عرض السعر" },
  { path: "/recurring", component: RecurringInvoiceList, title: "الفواتير المتكررة" },
  { path: "/recurring/new", component: RecurringInvoiceForm, title: "فاتورة متكررة جديدة" },
  { path: "/recurring/edit/:id", component: RecurringInvoiceForm, title: "تعديل فاتورة متكررة" },
  { path: "/expenses", component: ExpenseList, title: "المصروفات" },
  { path: "/expenses/new", component: ExpenseForm, title: "مصروف جديد" },
  { path: "/expenses/edit/:id", component: ExpenseForm, title: "تعديل المصروف" },
  { path: "/reports", component: Reports, title: "التقارير" },
  { path: "/purchases", component: PurchasesPage, title: "المشتريات" },
  { path: "/suppliers", component: SuppliersPage, title: "الموردون" },
  // Receipt creation removed — use suppliers and receipts list instead
  { path: "/receipts", component: IncomingReceiptsList, title: "سندات الاستلام" },
  { path: "/receipts/:id", component: ReceiptDetailPage, title: "تفاصيل السند" },
  { path: "/warehouse", component: WarehousePage, title: "المخزن" },
  { path: "/admin/*", component: NotAuthorizedPage, title: "وصول غير مصرح به" },
  { path: "/dev/debug", component: DevDebugPage, title: "Dev Debug" },
];

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, getCustomers, getExpenses, getProducts } from '../services/dataService';
import { Invoice, Customer, Expense, Product } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import {
  UsersIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  DocumentPlusIcon,
  UserPlusIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import { useNotification } from '../contexts/NotificationContext';
import { getErrorMessage } from '../src/utils/errorMessage';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { CardSkeleton } from '../components/ui/CardSkeleton';

const SALES_PERIOD_DAYS = 30;

const getInvoiceTotal = (inv: Invoice) => {
  const maybe = inv as unknown as {
    total?: number;
    grandTotal?: number;
    amount?: number;
    net?: number;
    totalAmount?: number;
  };
  if (typeof maybe.total === 'number') return maybe.total;
  if (typeof maybe.grandTotal === 'number') return maybe.grandTotal;
  if (typeof maybe.totalAmount === 'number') return maybe.totalAmount;
  if (typeof maybe.amount === 'number') return maybe.amount;
  if (typeof maybe.net === 'number') return maybe.net;
  return 0;
};

const toDateValue = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const maybe = value as { toDate?: () => Date };
  if (typeof maybe.toDate === 'function') return maybe.toDate();
  return null;
};

const statusToLabel = (status: string) => {
  if (status === 'approved') return 'مفعّلة';
  if (status === 'pending') return 'بانتظار الموافقة';
  if (status === 'blocked') return 'موقوفة';
  return status || 'غير معروف';
};

const Dashboard: React.FC = () => {
  const { activeCompanyId, activeCompany, companyMemberships, onboardingError, firebaseUser, signOutUser } =
    useAuth();
  const canWrite = useCanWrite('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings, loading: settingsLoading } = useSettings();
  const { addNotification } = useNotification();

  const fetchData = useCallback(async () => {
    if (!activeCompanyId) {
      setInvoices([]);
      setCustomers([]);
      setExpenses([]);
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [invoicesRes, customersRes, expensesRes, productsRes] = await Promise.all([
        getInvoices(activeCompanyId),
        getCustomers(activeCompanyId),
        getExpenses(activeCompanyId),
        getProducts(activeCompanyId),
      ]);
      setInvoices(invoicesRes.data || []);
      setCustomers(customersRes.data || []);
      setExpenses(expensesRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error: unknown) {
      const msg = getErrorMessage(error, 'تعذر تحميل بيانات الملخّص. حاول مرة أخرى.');
      console.error('Failed to fetch dashboard data:', { message: msg });
      addNotification(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, addNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const {
    totalInvoices,
    totalCustomers,
    totalSalesPeriod,
    totalExpenses,
    lowStockCount,
    recentInvoices,
    hasProducts,
  } = useMemo(() => {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - SALES_PERIOD_DAYS);
    periodStart.setHours(0, 0, 0, 0);

    const totalInvoices = invoices.length;
    const totalCustomers = customers.length;
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const hasProducts = products.length > 0;
    const lowStockCount = products.filter(
      (p) => Number(p.reorderLevel || 0) > 0 && Number(p.stock || 0) <= Number(p.reorderLevel)
    ).length;

    const invoicesWithDate = invoices
      .map((inv) => ({ inv, date: toDateValue(inv.date) }))
      .filter((item) => item.date);

    const totalSalesPeriod = invoicesWithDate.reduce((sum, item) => {
      if (!item.date) return sum;
      return item.date >= periodStart ? sum + getInvoiceTotal(item.inv) : sum;
    }, 0);

    const recentInvoices = invoicesWithDate
      .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))
      .slice(0, 5)
      .map((item) => item.inv);

    return {
      totalInvoices,
      totalCustomers,
      totalSalesPeriod,
      totalExpenses,
      lowStockCount,
      recentInvoices,
      hasProducts,
    };
  }, [invoices, customers, expenses, products]);

  const companyName = useMemo(() => {
    const membershipName =
      companyMemberships.find((m) => m.companyId === activeCompanyId)?.companyName || '';
    const companyDoc = activeCompany as { companyName?: string } | null;
    return settings?.businessName || companyDoc?.companyName || membershipName || 'بدون اسم';
  }, [settings?.businessName, activeCompany, companyMemberships, activeCompanyId]);

  const companyStatus = (activeCompany as { status?: string } | null)?.status || 'unknown';

  if (loading || settingsLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!activeCompanyId) {
    const email = firebaseUser?.email || '';
    return (
      <Card header={<h2 className="text-xl font-bold">لا توجد شركة مرتبطة</h2>}>
        <div className="space-y-3">
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
            {`الحساب: ${email || ''}\nلا توجد شركة مرتبطة بهذا الحساب.`}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
            يرجى التواصل مع مدير الشركة لإضافتك أو التأكد من بياناتك.
          </p>
          {onboardingError && <p className="text-sm text-danger-600">{onboardingError}</p>}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={signOutUser}
              className="inline-flex items-center rounded-md bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card header={<h2 className="text-xl font-bold">ملخّص</h2>}>
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">الشركة</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{companyName}</p>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            الحالة: {statusToLabel(String(companyStatus))}
          </div>
        </div>
      </Card>

      {canWrite && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/invoices/new"
            className="bg-primary-600 text-white rounded-lg shadow hover:bg-primary-700 transition-colors p-5 flex items-center justify-center"
          >
            <DocumentPlusIcon className="h-7 w-7 me-3" />
            <span className="text-lg font-semibold">فاتورة جديدة</span>
          </Link>
          <Link
            to="/customers/new"
            className="bg-success-600 text-white rounded-lg shadow hover:bg-success-700 transition-colors p-5 flex items-center justify-center"
          >
            <UserPlusIcon className="h-7 w-7 me-3" />
            <span className="text-lg font-semibold">عميل جديد</span>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          title="الفواتير"
          value={String(totalInvoices)}
          icon={<BanknotesIcon className="h-6 w-6 text-primary-600" />}
        />
        <StatCard
          title="العملاء"
          value={String(totalCustomers)}
          icon={<UsersIcon className="h-6 w-6 text-primary-600" />}
        />
        <StatCard
          title={`مبيعات ${SALES_PERIOD_DAYS} يوم`}
          value={`${totalSalesPeriod.toFixed(2)} ${settings?.currency || ''}`.trim()}
          icon={<BanknotesIcon className="h-6 w-6 text-primary-600" />}
        />
        <StatCard
          title="المصروفات"
          value={`${totalExpenses.toFixed(2)} ${settings?.currency || ''}`.trim()}
          icon={<CurrencyDollarIcon className="h-6 w-6 text-primary-600" />}
        />
        <Link to="/products?filter=low">
          <StatCard
            title="تنبيه مخزون منخفض"
            value={
              !hasProducts
                ? 'لا توجد منتجات'
                : lowStockCount > 0
                  ? `منخفض: ${lowStockCount}`
                  : 'لا توجد أصناف منخفضة حالياً'
            }
            icon={<ArchiveBoxIcon className="h-6 w-6 text-primary-600" />}
          />
        </Link>
      </div>

      <Card header={<h3 className="text-lg font-bold">أحدث الفواتير</h3>}>
        {recentInvoices.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">لا توجد فواتير بعد.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {inv.customerName || 'عميل'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {toDateValue(inv.date)?.toLocaleDateString('ar-EG') || '-'}
                  </p>
                </div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {getInvoiceTotal(inv).toFixed(2)} {settings?.currency || ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {totalInvoices === 0 && totalCustomers === 0 && totalExpenses === 0 && (
        <Card>
          <p className="text-gray-600 dark:text-gray-400">
            ابدأ بإضافة عميل أو فاتورة لتظهر مؤشرات الأداء هنا.
          </p>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;

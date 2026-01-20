import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getInvoices, getExpenses, getReturns, getPayments } from '../services/dataService';
import { Expense, Invoice, ReturnDoc } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { mapFirestoreError } from '../services/firebaseErrors';
import { useNotification } from '../contexts/NotificationContext';
import { isSafeToAccessCompanyData, logDataAccessEvent } from '../services/dataTenantUtils';
import PrintableReport from '../components/PrintableReport';
import { exportElementAs } from '../services/exportUtils';

type DateRangePreset = 'today' | '7' | '30' | 'custom';

const toIsoDate = (date: Date) => date.toISOString().split('T')[0];

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

/**
 * Verify report calculations for data integrity
 */
const verifyReportCalculations = async (
  companyId: string,
  invoices: Invoice[],
  expenses: Expense[]
): Promise<void> => {
  if (!import.meta.env.DEV) return; // Only in dev mode
  
  try {
    const invoiceTotal = invoices.reduce((sum, inv) => sum + (getInvoiceTotal(inv) || 0), 0);
    const expenseTotal = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    
    console.log('[REPORTS AUDIT]', {
      companyId,
      invoiceCount: invoices.length,
      invoiceTotal: invoiceTotal.toFixed(2),
      expenseCount: expenses.length,
      expenseTotal: expenseTotal.toFixed(2),
      netRevenue: (invoiceTotal - expenseTotal).toFixed(2),
    });
  } catch (err) {
    console.warn('[REPORTS AUDIT] Verification check failed:', err);
  }
};

const Reports: React.FC = () => {
  const { companyId, user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [returns, setReturns] = useState<ReturnDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings, loading: settingsLoading } = useSettings();
  const { addNotification } = useNotification();
  const [dateRange, setDateRange] = useState(() => ({
    start: toIsoDate(new Date(new Date().setDate(new Date().getDate() - 30))),
    end: toIsoDate(new Date()),
  }));
  const [preset, setPreset] = useState<DateRangePreset>('30');
  const [showDetails, setShowDetails] = useState(false);
  const printableRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }
      if (!user || !isSafeToAccessCompanyData(user.uid, companyId)) {
        addNotification('لا تملك صلاحية الوصول لبيانات هذه الشركة.', 'error');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [invoicesData, expensesData, returnsData] = await Promise.all([
          getInvoices(companyId),
          getExpenses(companyId),
          getReturns(companyId),
        ]);
        const invoicesArray = (invoicesData as unknown as { data?: Invoice[] }).data || [];
        const expensesArray = (expensesData as unknown as { data?: Expense[] }).data || [];
        const returnsArray = (returnsData as unknown as { data?: ReturnDoc[] }).data || [];
        
        setInvoices(invoicesArray);
        setExpenses(expensesArray);
        setReturns(returnsArray);
        
        // Verify calculations for data integrity
        await verifyReportCalculations(companyId, invoicesArray, expensesArray);
        
        logDataAccessEvent('read', 'reports', user.uid, companyId, {
          scope: ['invoices', 'expenses', 'returns'],
        });
      } catch (error: unknown) {
        addNotification(mapFirestoreError(error), 'error');
      }
      setLoading(false);
    };
    fetchData();
  }, [companyId, addNotification, user]);

  useEffect(() => {
    if (preset === 'custom') return;
    const end = new Date();
    const start = new Date();
    if (preset === 'today') {
      start.setHours(0, 0, 0, 0);
    } else {
      const days = Number(preset);
      start.setDate(end.getDate() - (Number.isNaN(days) ? 30 : days));
    }
    setDateRange({ start: toIsoDate(start), end: toIsoDate(end) });
  }, [preset]);

  const summary = useMemo(() => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59, 999);

    const filteredInvoices = invoices
      .map((inv) => ({ inv, date: toDateValue(inv.date) }))
      .filter((item) => item.date && item.date >= start && item.date <= end)
      .map((item) => item.inv);

    const filteredExpenses = expenses
      .map((exp) => ({ exp, date: toDateValue(exp.date) }))
      .filter((item) => item.date && item.date >= start && item.date <= end)
      .map((item) => item.exp);

    const filteredReturns = returns
      .map((ret) => ({ ret, date: toDateValue(ret.date) }))
      .filter((item) => item.date && item.date >= start && item.date <= end)
      .map((item) => item.ret);

    const totalSales = filteredInvoices.reduce((sum, inv) => sum + getInvoiceTotal(inv), 0);
    const totalReturns = filteredReturns.reduce(
      (sum, ret) => sum + (Number(ret.totalReturnAmount) || 0),
      0
    );
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netSales = totalSales - totalReturns;
    const net = netSales - totalExpenses;

    const sortedInvoices = [...filteredInvoices].sort((a, b) => {
      const aDate = toDateValue(a.date)?.getTime() || 0;
      const bDate = toDateValue(b.date)?.getTime() || 0;
      return bDate - aDate;
    });

    const sortedExpenses = [...filteredExpenses].sort((a, b) => {
      const aDate = toDateValue(a.date)?.getTime() || 0;
      const bDate = toDateValue(b.date)?.getTime() || 0;
      return bDate - aDate;
    });

    return {
      totalSales,
      totalReturns,
      netSales,
      totalExpenses,
      net,
      invoices: sortedInvoices,
      expenses: sortedExpenses,
    };
  }, [invoices, expenses, returns, dateRange]);

  const exportReport = async (format: 'pdf' | 'png') => {
    if (!printableRef.current) return;
    try {
      await exportElementAs(
        printableRef.current,
        `report-${dateRange.start}-${dateRange.end}`,
        format
      );
    } catch (e: unknown) {
      addNotification(mapFirestoreError(e), 'error');
    }
  };

  if (loading || settingsLoading) return <div>جاري تحميل التقارير...</div>;

  if (!companyId) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-2">لا توجد شركة نشطة</h2>
        <p className="text-gray-600 dark:text-gray-400">
          يرجى اختيار شركة أولًا لعرض التقارير.
        </p>
      </div>
    );
  }

  const dateRangeLabel = `الفترة من ${dateRange.start} إلى ${dateRange.end}`;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">التقارير</h2>
          <div className="flex gap-2">
            <button
              onClick={() => exportReport('pdf')}
              className="px-3 py-2 bg-red-600 text-white rounded-md"
            >
              تصدير PDF
            </button>
            <button
              onClick={() => exportReport('png')}
              className="px-3 py-2 bg-green-600 text-white rounded-md"
            >
              تصدير PNG
            </button>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center mt-4">
          <div>
            <label htmlFor="preset" className="block text-sm font-medium">
              الفترة
            </label>
            <select
              id="preset"
              value={preset}
              onChange={(e) => setPreset(e.target.value as DateRangePreset)}
              className="mt-1 block px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="today">اليوم</option>
              <option value="7">آخر 7 أيام</option>
              <option value="30">آخر 30 يومًا</option>
              <option value="custom">مخصص</option>
            </select>
          </div>
          <div>
            <label htmlFor="start" className="block text-sm font-medium">
              من
            </label>
            <input
              type="date"
              name="start"
              id="start"
              value={dateRange.start}
              onChange={(e) => {
                setPreset('custom');
                setDateRange((prev) => ({ ...prev, start: e.target.value }));
              }}
              className="mt-1 block px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label htmlFor="end" className="block text-sm font-medium">
              إلى
            </label>
            <input
              type="date"
              name="end"
              id="end"
              value={dateRange.end}
              onChange={(e) => {
                setPreset('custom');
                setDateRange((prev) => ({ ...prev, end: e.target.value }));
              }}
              className="mt-1 block px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
              إجمالي المبيعات
            </h3>
            <p className="text-3xl font-bold mt-2 text-blue-600">
              {summary.totalSales.toFixed(2)} {settings?.currency}
            </p>
          </div>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/50 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
              المرتجعات
            </h3>
            <p className="text-3xl font-bold mt-2 text-yellow-600">
              {summary.totalReturns.toFixed(2)} {settings?.currency}
            </p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/50 rounded-lg">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
              المصروفات
            </h3>
            <p className="text-3xl font-bold mt-2 text-red-600">
              {summary.totalExpenses.toFixed(2)} {settings?.currency}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/50">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
              صافي المبيعات
            </h3>
            <p className="text-3xl font-bold mt-2 text-blue-600">
              {summary.netSales.toFixed(2)} {settings?.currency}
            </p>
          </div>
        </div>

        {summary.invoices.length === 0 && summary.expenses.length === 0 && summary.totalReturns === 0 && (
          <p className="text-center text-gray-500 mt-6">
            لا توجد حركات خلال هذه الفترة.
          </p>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">تفاصيل الفترة</h3>
          <button
            onClick={() => setShowDetails((s) => !s)}
            className="text-primary-600 hover:underline"
          >
            {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
          </button>
        </div>
        {showDetails && (
          <div className="mt-6 space-y-6">
            <div>
              <h4 className="text-lg font-semibold mb-3">المبيعات</h4>
              {summary.invoices.length === 0 ? (
                <p className="text-gray-500">لا توجد مبيعات خلال هذه الفترة.</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {summary.invoices.map((inv) => (
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
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-3">المصروفات</h4>
              {summary.expenses.length === 0 ? (
                <p className="text-gray-500">لا توجد مصروفات خلال هذه الفترة.</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {summary.expenses.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {exp.description || exp.vendor || exp.category || 'مصروف'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {toDateValue(exp.date)?.toLocaleDateString('ar-EG') || '-'}
                        </p>
                      </div>
                      <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {exp.amount.toFixed(2)} {settings?.currency || ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', left: '-10000px', top: 0 }}>
        <div ref={printableRef}>
          <PrintableReport
            reportTitle="تقرير الفترة"
            companyName={settings?.businessName || 'الشركة'}
            logoUrl={settings?.logo}
            address={settings?.address}
            phone={settings?.contactInfo}
            dateRangeLabel={dateRangeLabel}
            summaryItems={[
              { label: 'إجمالي المبيعات', value: `${summary.totalSales.toFixed(2)} ${settings?.currency}` },
              { label: 'المرتجعات', value: `${summary.totalReturns.toFixed(2)} ${settings?.currency}` },
              { label: 'صافي المبيعات', value: `${summary.netSales.toFixed(2)} ${settings?.currency}` },
            ]}
          >
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">المبيعات</h4>
                {summary.invoices.length === 0 ? (
                  <p className="text-gray-500">لا توجد مبيعات خلال هذه الفترة.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {summary.invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between py-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {inv.customerName || 'عميل'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {toDateValue(inv.date)?.toLocaleDateString('ar-EG') || '-'}
                          </p>
                        </div>
                        <div className="text-sm font-semibold">
                          {getInvoiceTotal(inv).toFixed(2)} {settings?.currency || ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">المصروفات</h4>
                {summary.expenses.length === 0 ? (
                  <p className="text-gray-500">لا توجد مصروفات خلال هذه الفترة.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {summary.expenses.map((exp) => (
                      <div key={exp.id} className="flex items-center justify-between py-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {exp.description || exp.vendor || exp.category || 'مصروف'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {toDateValue(exp.date)?.toLocaleDateString('ar-EG') || '-'}
                          </p>
                        </div>
                        <div className="text-sm font-semibold">
                          {exp.amount.toFixed(2)} {settings?.currency || ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </PrintableReport>
        </div>
      </div>
    </div>
  );
};

export default Reports;



import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, getExpenses } from '../services/dataService';
import { Expense, Invoice } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { CardSkeleton } from '../components/ui/CardSkeleton';
import { BanknotesIcon, CurrencyDollarIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { getErrorMessage } from '../src/utils/errorMessage';

const DAILY_LIMIT = 500;

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

const toDateObject = (value: unknown): Date | null => {
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

const toISODate = (date: Date) => date.toISOString().split('T')[0];

const Dashboard: React.FC = () => {
  const { companyId } = useAuth();
  const canWriteInvoices = useCanWrite('invoices');
  const canWriteExpenses = useCanWrite('expenses');
  const { settings, loading: settingsLoading } = useSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todaySales, setTodaySales] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [yesterdaySales, setYesterdaySales] = useState(0);
  const [yesterdayExpenses, setYesterdayExpenses] = useState(0);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);

  const fetchRangeInvoices = useCallback(
    async (startISO: string, endISO: string) => {
      if (!companyId) return [];
      const stringRes = await getInvoices(companyId, {
        filters: ([['date', '>=', startISO], ['date', '<=', endISO]] as unknown) as any,
        orderBy: 'date',
        orderDirection: 'asc',
        limit: DAILY_LIMIT,
      });
      if (stringRes.data?.length) return stringRes.data as Invoice[];
      const tsRes = await getInvoices(companyId, {
        dateStart: startISO,
        dateEnd: endISO,
        orderDirection: 'asc',
        limit: DAILY_LIMIT,
      });
      return (tsRes.data || []) as Invoice[];
    },
    [companyId]
  );

  const fetchRangeExpenses = useCallback(
    async (startISO: string, endISO: string) => {
      if (!companyId) return [];
      const stringRes = await getExpenses(companyId, {
        filters: ([['date', '>=', startISO], ['date', '<=', endISO]] as unknown) as any,
        orderBy: 'date',
        orderDirection: 'asc',
        limit: DAILY_LIMIT,
      });
      if (stringRes.data?.length) return stringRes.data as Expense[];
      const tsRes = await getExpenses(companyId, {
        dateStart: startISO,
        dateEnd: endISO,
        orderDirection: 'asc',
        limit: DAILY_LIMIT,
      });
      return (tsRes.data || []) as Expense[];
    },
    [companyId]
  );

  const fetchSummary = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const todayISO = toISODate(today);
      const yesterdayISO = toISODate(yesterday);

      const [
        todayInvoices,
        todayExpenses,
        yesterdayInvoices,
        yesterdayExpenses,
        recentInvoicesRes,
        recentExpensesRes,
      ] = await Promise.all([
        fetchRangeInvoices(todayISO, todayISO),
        fetchRangeExpenses(todayISO, todayISO),
        fetchRangeInvoices(yesterdayISO, yesterdayISO),
        fetchRangeExpenses(yesterdayISO, yesterdayISO),
        getInvoices(companyId, { orderBy: 'date', orderDirection: 'desc', limit: 3 }),
        getExpenses(companyId, { orderBy: 'date', orderDirection: 'desc', limit: 3 }),
      ]);

      const salesTotal = todayInvoices.reduce((sum, inv) => sum + getInvoiceTotal(inv), 0);
      const expensesTotal = todayExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const yesterdaySalesTotal = yesterdayInvoices.reduce((sum, inv) => sum + getInvoiceTotal(inv), 0);
      const yesterdayExpensesTotal = yesterdayExpenses.reduce(
        (sum, exp) => sum + (exp.amount || 0),
        0
      );

      setTodaySales(salesTotal);
      setTodayExpenses(expensesTotal);
      setYesterdaySales(yesterdaySalesTotal);
      setYesterdayExpenses(yesterdayExpensesTotal);
      setRecentInvoices(recentInvoicesRes.data || []);
      setRecentExpenses(recentExpensesRes.data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'تعذر تحميل ملخص اليوم. حاول مرة أخرى.'));
      setTodaySales(0);
      setTodayExpenses(0);
      setYesterdaySales(0);
      setYesterdayExpenses(0);
      setRecentInvoices([]);
      setRecentExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, fetchRangeInvoices, fetchRangeExpenses]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const currency = settings?.currency || '';
  const profitToday = todaySales - todayExpenses;
  const profitYesterday = yesterdaySales - yesterdayExpenses;
  const hasYesterday = yesterdaySales > 0 || yesterdayExpenses > 0;
  const deltaPercent =
    hasYesterday && Math.abs(profitYesterday) > 0
      ? ((profitToday - profitYesterday) / Math.abs(profitYesterday)) * 100
      : null;

  const formatMoney = useCallback(
    (value: number) => `${value.toFixed(2)} ${currency}`.trim(),
    [currency]
  );

  const recentInvoicesView = useMemo(
    () =>
      recentInvoices.map((inv) => ({
        id: inv.id,
        title: inv.customerName || 'عميل',
        date: toDateObject(inv.date)?.toLocaleDateString('ar-EG') || '-',
        total: formatMoney(getInvoiceTotal(inv)),
      })),
    [recentInvoices, formatMoney]
  );

  const recentExpensesView = useMemo(
    () =>
      recentExpenses.map((exp) => ({
        id: exp.id,
        title: exp.category || 'مصروف',
        date: toDateObject(exp.date)?.toLocaleDateString('ar-EG') || '-',
        total: formatMoney(exp.amount || 0),
      })),
    [recentExpenses, formatMoney]
  );

  if (loading || settingsLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card header={<h2 className="text-xl font-bold">ملخص اليوم</h2>}>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          الحساب بناءً على البيانات المسجلة داخل التطبيق
        </p>
      </Card>

      {error && (
        <Card>
          <p className="text-sm text-danger-600">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="المبيعات اليوم"
          value={formatMoney(todaySales)}
          icon={<BanknotesIcon className="h-6 w-6 text-primary-600" />}
        />
        <StatCard
          title="المصروفات اليوم"
          value={formatMoney(todayExpenses)}
          icon={<CurrencyDollarIcon className="h-6 w-6 text-primary-600" />}
        />
        <StatCard
          title="صافي الربح اليوم"
          value={formatMoney(profitToday)}
          icon={<ChartBarIcon className="h-6 w-6 text-primary-600" />}
          trend={deltaPercent !== null ? `${Math.abs(deltaPercent).toFixed(1)}%` : undefined}
          trendDirection={deltaPercent !== null && deltaPercent >= 0 ? 'up' : 'down'}
        />
      </div>

      {deltaPercent !== null && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          اليوم {deltaPercent >= 0 ? 'أفضل' : 'أسوأ'} من أمس بنسبة {Math.abs(deltaPercent).toFixed(1)}%
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {canWriteInvoices && (
          <Link
            to="/app/invoices/new"
            className="inline-flex items-center justify-center rounded-md bg-primary-600 text-white px-4 py-3 text-base font-semibold hover:bg-primary-700"
          >
            فاتورة جديدة
          </Link>
        )}
        {canWriteExpenses && (
          <Link
            to="/app/expenses/new"
            className="inline-flex items-center justify-center rounded-md bg-success-600 text-white px-4 py-3 text-base font-semibold hover:bg-success-700"
          >
            مصروف جديد
          </Link>
        )}
      </div>

      <Card header={<h3 className="text-lg font-bold">آخر الفواتير</h3>}>
        {recentInvoicesView.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            لا توجد مبيعات مسجلة اليوم
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentInvoicesView.map((inv) => (
              <Link
                key={inv.id}
                to={`/app/invoices/${inv.id}`}
                className="flex items-center justify-between py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{inv.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{inv.date}</p>
                </div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {inv.total}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card header={<h3 className="text-lg font-bold">آخر المصروفات</h3>}>
        {recentExpensesView.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            لا توجد مصروفات مسجلة اليوم
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentExpensesView.map((exp) => (
              <Link
                key={exp.id}
                to={`/app/expenses/edit/${exp.id}`}
                className="flex items-center justify-between py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{exp.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{exp.date}</p>
                </div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {exp.total}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;

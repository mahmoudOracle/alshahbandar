import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, getExpenses } from '../services/dataService';
import { Expense, Invoice } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { formatDate } from '../src/utils/date';
import { Card } from '../src/ui/Card';
import { StatCard } from '../src/ui/StatCard';
import { CardSkeleton } from '../components/ui/CardSkeleton';
import { SectionHeader } from '../src/ui/SectionHeader';
import { ListRow } from '../src/ui/ListRow';
import { BanknotesIcon, CurrencyDollarIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { getErrorMessage } from '../src/utils/errorMessage';
import { getRoutePath } from '../src/routes';
import { t } from '../src/i18n/t';

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

const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
      setError(getErrorMessage(err, t('dashboardLoadError')));
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

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: currency || 'EGP',
        maximumFractionDigits: 2,
      }),
    [currency]
  );

  const formatMoney = useCallback((value: number) => formatter.format(value), [formatter]);

  const recentInvoicesView = useMemo(
    () =>
      recentInvoices.map((inv) => ({
        id: inv.id,
        title: inv.customerName || t('commonCustomer'),
        date: formatDate(inv.date, 'ar'),
        total: formatMoney(getInvoiceTotal(inv)),
      })),
    [recentInvoices, formatMoney]
  );

  const recentExpensesView = useMemo(
    () =>
      recentExpenses.map((exp) => ({
        id: exp.id,
        title: exp.category || t('commonExpense'),
        date: formatDate(exp.date, 'ar'),
        total: formatMoney(exp.amount || 0),
      })),
    [recentExpenses, formatMoney]
  );

  if (loading || settingsLoading) {
    return (
      <div className="page-container">
        <div className="space-y-6">
          <CardSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container lg">
      {/* Page Header */}
      <div className="page-section">
        <SectionHeader
          title={t('dashboardTitle')}
          subtitle={t('dashboardHelper')}
          action={
            <div className="flex gap-2 flex-wrap">
              {canWriteInvoices && (
                <Link to={getRoutePath('invoices-new')} className="ui-button primary">
                  {t('dashboardNewInvoice')}
                </Link>
              )}
              {canWriteExpenses && (
                <Link to={getRoutePath('expenses-new')} className="ui-button secondary">
                  {t('dashboardNewExpense')}
                </Link>
              )}
            </div>
          }
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="page-section">
          <Card>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </Card>
        </div>
      )}

      {/* Summary Stats */}
      <div className="page-section">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title={t('dashboardSalesToday')}
            value={formatMoney(todaySales)}
            icon={<BanknotesIcon className="h-6 w-6 text-blue-600" />}
          />
          <StatCard
            title={t('dashboardExpensesToday')}
            value={formatMoney(todayExpenses)}
            icon={<CurrencyDollarIcon className="h-6 w-6 text-orange-600" />}
          />
          <StatCard
            title={t('dashboardProfitToday')}
            value={formatMoney(profitToday)}
            icon={<ChartBarIcon className="h-6 w-6 text-green-600" />}
            trend={deltaPercent !== null ? `${Math.abs(deltaPercent).toFixed(1)}%` : undefined}
            trendDirection={deltaPercent !== null && deltaPercent >= 0 ? 'up' : 'down'}
          />
        </div>
      </div>

      {/* Performance Text */}
      {deltaPercent !== null && (
        <div className="page-section">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {deltaPercent >= 0
              ? t('dashboardBetter', { percent: Math.abs(deltaPercent).toFixed(1) })
              : t('dashboardWorse', { percent: Math.abs(deltaPercent).toFixed(1) })}
          </p>
        </div>
      )}

      {/* Recent Invoices */}
      <div className="page-section">
        <Card>
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h3>{t('dashboardLatestInvoices')}</h3>
              <Link to={getRoutePath('invoices')} className="text-primary-600 hover:text-primary-700 text-sm font-semibold">
                {t('commonViewAll')} →
              </Link>
            </div>
          </div>

          {recentInvoicesView.length === 0 ? (
            <div className="card-body">
              <p className="text-sm text-gray-600">{t('dashboardNoInvoices')}</p>
              {canWriteInvoices && (
                <div className="mt-4">
                  <Link to={getRoutePath('invoices-new')} className="ui-button primary">
                    {t('dashboardAddInvoice')}
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="list-container">
              {recentInvoicesView.map((inv) => (
                <Link key={inv.id} to={`/app/invoices/${inv.id}`} className="list-row">
                  <div className="list-row-left">
                    <div className="list-row-title">{inv.title}</div>
                    <div className="list-row-subtitle">{inv.date}</div>
                  </div>
                  <div className="list-row-right">
                    <div className="list-row-amount">{inv.total}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Expenses */}
      <div className="page-section">
        <Card>
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h3>{t('dashboardLatestExpenses')}</h3>
              <Link to={getRoutePath('expenses')} className="text-primary-600 hover:text-primary-700 text-sm font-semibold">
                {t('commonViewAll')} →
              </Link>
            </div>
          </div>

          {recentExpensesView.length === 0 ? (
            <div className="card-body">
              <p className="text-sm text-gray-600">{t('dashboardNoExpenses')}</p>
              {canWriteExpenses && (
                <div className="mt-4">
                  <Link to={getRoutePath('expenses-new')} className="ui-button secondary">
                    {t('dashboardAddExpense')}
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="list-container">
              {recentExpensesView.map((exp) => (
                <Link key={exp.id} to={`/app/expenses/edit/${exp.id}`} className="list-row">
                  <div className="list-row-left">
                    <div className="list-row-title">{exp.title}</div>
                    <div className="list-row-subtitle">{exp.date}</div>
                  </div>
                  <div className="list-row-right">
                    <div className="list-row-amount">{exp.total}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

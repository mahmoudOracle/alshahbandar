import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getInvoices, getExpenses, getReturns } from '../services/dataService';
import { Expense, Invoice, ReturnDoc } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { mapFirestoreError } from '../services/firebaseErrors';
import { useNotification } from '../contexts/NotificationContext';
import { isSafeToAccessCompanyData, logDataAccessEvent } from '../services/dataTenantUtils';
import PrintableReport from '../components/PrintableReport';
import { exportElementAs } from '../services/exportUtils';
import { Card } from '../src/ui/Card';
import { StatCard } from '../src/ui/StatCard';
import { SectionHeader } from '../src/ui/SectionHeader';
import { ListRow } from '../src/ui/ListRow';
import { Select } from '../src/ui/Select';
import { Input } from '../src/ui/Input';
import { Button } from '../src/ui/Button';
import { BanknotesIcon, CurrencyDollarIcon, ArrowTrendingDownIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { t } from '../src/i18n/t';

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

const verifyReportCalculations = async (
  companyId: string,
  invoices: Invoice[],
  expenses: Expense[]
): Promise<void> => {
  if (!import.meta.env.DEV) return;
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
        addNotification(t('reportsNoAccess'), 'error');
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

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: settings?.currency || 'EGP',
        maximumFractionDigits: 2,
      }),
    [settings?.currency]
  );

  const formatMoney = (value: number) => formatter.format(value || 0);

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

  if (loading || settingsLoading) return <div className="page-container">{t('commonLoading')}</div>;

  if (!companyId) {
    return (
      <div className="page-container">
        <Card>
          <div className="card-body">
            <h2>{t('reportsNoCompanyTitle')}</h2>
            <p>{t('reportsNoCompanyMessage')}</p>
          </div>
        </Card>
      </div>
    );
  }

  const dateRangeLabel = t('reportsRangeLabel', {
    start: dateRange.start,
    end: dateRange.end,
  });

  return (
    <div className="page-container lg">
      {/* Page Header */}
      <div className="page-section">
        <SectionHeader 
          title={t('reportsTitle')} 
          subtitle={t('reportsSubtitle')}
        />
      </div>

      {/* Date Range & Export Controls */}
      <div className="page-section">
        <Card>
          <div className="card-body gap-4">
            <div className="flex justify-between items-start gap-4 flex-col md:flex-row">
              <h3 className="font-semibold">{t('reportsSummary')}</h3>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => exportReport('pdf')}>
                  {t('reportsExportPdf')}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => exportReport('png')}>
                  {t('reportsExportPng')}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label={t('reportsPeriod')}
                value={preset}
                onChange={(e) => setPreset(e.target.value as DateRangePreset)}
                options={[
                  { value: 'today', label: t('reportsToday') },
                  { value: '7', label: t('reportsLast7') },
                  { value: '30', label: t('reportsLast30') },
                  { value: 'custom', label: t('reportsCustom') },
                ]}
              />
            </div>

            {preset === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={t('reportsFrom')}
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => {
                    setDateRange((prev) => ({ ...prev, start: e.target.value }));
                  }}
                />
                <Input
                  label={t('reportsTo')}
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => {
                    setDateRange((prev) => ({ ...prev, end: e.target.value }));
                  }}
                />
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="page-section">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            title={t('reportsTotalSales')}
            value={formatMoney(summary.totalSales)}
            icon={<BanknotesIcon className="h-6 w-6 text-blue-600" />}
          />
          <StatCard
            title={t('reportsNetSales')}
            value={formatMoney(summary.netSales)}
            icon={<ArrowTrendingUpIcon className="h-6 w-6 text-green-600" />}
          />
          <StatCard
            title={t('reportsReturns')}
            value={formatMoney(summary.totalReturns)}
            icon={<ArrowTrendingDownIcon className="h-6 w-6 text-red-600" />}
          />
          <StatCard
            title={t('reportsExpenses')}
            value={formatMoney(summary.totalExpenses)}
            icon={<CurrencyDollarIcon className="h-6 w-6 text-orange-600" />}
          />
        </div>
      </div>

      {/* Details Section */}
      {(summary.invoices.length > 0 || summary.expenses.length > 0) && (
        <div className="page-section">
          <Card>
            <div className="card-header">
              <div className="flex justify-between items-center">
                <h3>{t('reportsDetails')}</h3>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDetails((s) => !s)}
                >
                  {showDetails ? t('reportsHideDetails') : t('reportsShowDetails')}
                </Button>
              </div>
            </div>

            {showDetails && (
              <div className="card-body space-y-8">
                {/* Sales Section */}
                {summary.invoices.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold mb-4">{t('reportsSales')}</h4>
                    <div className="list-container">
                      {summary.invoices.slice(0, 10).map((inv) => (
                        <div key={inv.id} className="list-row">
                          <div className="list-row-left">
                            <div className="list-row-title">{inv.customerName || t('commonCustomer')}</div>
                            <div className="list-row-subtitle">
                              {toDateValue(inv.date)?.toLocaleDateString('ar-EG') || '-'}
                            </div>
                          </div>
                          <div className="list-row-right">
                            <div className="list-row-amount">{formatMoney(getInvoiceTotal(inv))}</div>
                          </div>
                        </div>
                      ))}
                      {summary.invoices.length > 10 && (
                        <div className="text-sm text-gray-500 text-center py-4">
                          {t('commonMore', { count: summary.invoices.length - 10 })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Expenses Section */}
                {summary.expenses.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold mb-4">{t('reportsExpensesLabel')}</h4>
                    <div className="list-container">
                      {summary.expenses.slice(0, 10).map((exp) => (
                        <div key={exp.id} className="list-row">
                          <div className="list-row-left">
                            <div className="list-row-title">
                              {exp.description || exp.vendor || exp.category || t('commonExpense')}
                            </div>
                            <div className="list-row-subtitle">
                              {toDateValue(exp.date)?.toLocaleDateString('ar-EG') || '-'}
                            </div>
                          </div>
                          <div className="list-row-right">
                            <div className="list-row-amount">{formatMoney(exp.amount)}</div>
                          </div>
                        </div>
                      ))}
                      {summary.expenses.length > 10 && (
                        <div className="text-sm text-gray-500 text-center py-4">
                          {t('commonMore', { count: summary.expenses.length - 10 })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {summary.invoices.length === 0 && summary.expenses.length === 0 && summary.totalReturns === 0 && (
        <div className="page-section">
          <Card>
            <div className="card-body">
              <p className="text-center text-gray-500">{t('reportsNoActivity')}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Printable Report (hidden) */}
      <div style={{ position: 'absolute', left: '-10000px', top: 0 }}>
        <div ref={printableRef}>
          <PrintableReport
            reportTitle={t('reportsPeriodReport')}
            companyName={settings?.businessName || t('reportsCompanyDefault')}
            logoUrl={settings?.logo}
            address={settings?.address}
            phone={settings?.contactInfo}
            dateRangeLabel={dateRangeLabel}
            summaryItems={[
              {
                label: t('reportsTotalSales'),
                value: `${summary.totalSales.toFixed(2)} ${settings?.currency}`,
              },
              {
                label: t('reportsReturns'),
                value: `${summary.totalReturns.toFixed(2)} ${settings?.currency}`,
              },
              {
                label: t('reportsNetSales'),
                value: `${summary.netSales.toFixed(2)} ${settings?.currency}`,
              },
            ]}
          >
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">{t('reportsSales')}</h4>
                {summary.invoices.length === 0 ? (
                  <p className="text-gray-500">{t('reportsNoSales')}</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {summary.invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between py-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {inv.customerName || t('commonCustomer')}
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
                <h4 className="text-sm font-semibold mb-2">{t('reportsExpensesLabel')}</h4>
                {summary.expenses.length === 0 ? (
                  <p className="text-gray-500">{t('reportsNoExpenses')}</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {summary.expenses.map((exp) => (
                      <div key={exp.id} className="flex items-center justify-between py-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {exp.description || exp.vendor || exp.category || t('commonExpense')}
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

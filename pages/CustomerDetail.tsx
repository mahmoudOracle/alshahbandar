import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PencilIcon, WalletIcon } from '@heroicons/react/24/outline';
import { getCustomerById, getInvoices, getPaymentsByCustomerId } from '../services/dataService';
import { getReceiptsByCustomerId } from '../services/receiptsService';
import { Customer, Invoice, Payment, Receipt } from '../types';
import PaymentForm from './PaymentForm';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { mapFirestoreError } from '../services/firebaseErrors';
import { useNotification } from '../contexts/NotificationContext';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import PrintableReport from '../components/PrintableReport';
import { exportElementAs } from '../services/exportUtils';
import { t } from '../src/i18n/t';

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

const StatCard: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm text-center">
    <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
  </div>
);

type StatementRow = {
  date: Date;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companyId, role } = useAuth();
  const canWrite = useCanWrite('customers');
  const canCreateInvoices = useCanWrite('invoices');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'statement'>('invoices');
  const { settings, loading: settingsLoading } = useSettings();
  const { addNotification } = useNotification();
  const printableRef = useRef<HTMLDivElement | null>(null);
  const [dateRange, setDateRange] = useState(() => ({
    start: toIsoDate(new Date(new Date().setDate(new Date().getDate() - 90))),
    end: toIsoDate(new Date()),
  }));
  const [includeOpeningBalance, setIncludeOpeningBalance] = useState(true);

  const fetchData = async () => {
    if (!id || !companyId) return;
    setLoading(true);
    try {
      const [customerResult, allInvoicesResult, paymentsResult, receiptsResult] = await Promise.all([
        getCustomerById(companyId, id),
        getInvoices(companyId, { filters: [['customerId', '==', id]] }),
        getPaymentsByCustomerId(companyId, id),
        getReceiptsByCustomerId(companyId, id),
      ]);
      setCustomer(customerResult || null);
      setInvoices(allInvoicesResult.data || []);
      setPayments(paymentsResult.data || []);
      setReceipts(receiptsResult || []);
    } catch (error: unknown) {
      addNotification(mapFirestoreError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, companyId]);

  const handlePaymentSaved = () => {
    setIsPaymentModalOpen(false);
    fetchData();
  };

  const canCreatePayments = role === 'owner' || role === 'manager' || role === 'employee';

  // Calculate current balance from all invoices, payments, and receipts
  const { totalInvoiced, totalPaid, balance } = useMemo(() => {
    const totalInv = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPayments = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
    const totalReceipts = receipts.reduce((sum, rec) => sum + (rec.amount || 0), 0);
    const totalPay = totalPayments + totalReceipts;
    return {
      totalInvoiced: totalInv,
      totalPaid: totalPay,
      balance: totalInv - totalPay,
    };
  }, [invoices, payments, receipts]);

  const statement = useMemo(() => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59, 999);

    const openingInvoices = invoices
      .map((inv) => ({ inv, date: toDateValue(inv.date) }))
      .filter((item) => item.date && item.date < start)
      .map((item) => item.inv);

    const openingPayments = payments
      .map((pay) => ({ pay, date: toDateValue(pay.date) }))
      .filter((item) => item.date && item.date < start)
      .map((item) => item.pay);

    const openingBalance =
      openingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0) -
      openingPayments.reduce((sum, pay) => sum + (pay.amount || 0), 0);

    const filteredInvoices = invoices
      .map((inv) => ({ inv, date: toDateValue(inv.date) }))
      .filter((item) => item.date && item.date >= start && item.date <= end)
      .map((item) => item.inv);

    const filteredPayments = payments
      .map((pay) => ({ pay, date: toDateValue(pay.date) }))
      .filter((item) => item.date && item.date >= start && item.date <= end)
      .map((item) => item.pay);

    const filteredReceipts = receipts
      .map((rec) => ({ rec, date: toDateValue(rec.date) || new Date() }))
      .filter((item) => item.date && item.date >= start && item.date <= end)
      .map((item) => item.rec);

    const rows = [
      ...filteredInvoices.map((inv) => ({
        date: toDateValue(inv.date) || new Date(),
        description: t('customerStatementInvoice', { number: inv.invoiceNumber }),
        debit: Number(inv.total || 0),
        credit: 0,
      })),
      ...filteredPayments.map((pay) => ({
        date: toDateValue(pay.date) || new Date(),
        description: t('customerStatementPayment', {
          method: pay.method || t('paymentMethodOther'),
          notes: pay.notes ? ` - ${pay.notes}` : '',
        }),
        debit: 0,
        credit: Number(pay.amount || 0),
      })),
      ...filteredReceipts.map((rec) => ({
        date: toDateValue(rec.date) || new Date(),
        description: t('customerStatementReceipt', {
          method: rec.method || t('paymentMethodOther'),
          note: rec.note ? ` - ${rec.note}` : '',
        }),
        debit: 0,
        credit: Number(rec.amount || 0),
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    let running = includeOpeningBalance ? openingBalance : 0;
    const withBalance: StatementRow[] = rows.map((row) => {
      running += row.debit - row.credit;
      return { ...row, balance: running };
    });

    const totalInvoices = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPayments = filteredPayments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
    const totalReceipts = filteredReceipts.reduce((sum, rec) => sum + (rec.amount || 0), 0);

    return {
      rows: withBalance,
      totalInvoices,
      totalPayments,
      totalReceipts,
      remaining: totalInvoices - totalPayments - totalReceipts,
      openingBalance,
    };
  }, [invoices, payments, receipts, dateRange, includeOpeningBalance]);

  if (loading || settingsLoading) return <div>{t('customerLoading')}</div>;
  if (!customer) return <div>{t('customerNotFound')}</div>;

  const exportStatement = async (format: 'pdf' | 'png') => {
    if (!printableRef.current) return;
    try {
      await exportElementAs(
        printableRef.current,
        `statement-${customer.id}-${dateRange.start}-${dateRange.end}`,
        format
      );
    } catch (e: unknown) {
      addNotification(mapFirestoreError(e), 'error');
    }
  };

  const dateRangeLabel = t('statementRangeLabel', {
    start: dateRange.start,
    end: dateRange.end,
  });

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            <p className="text-gray-500 dark:text-gray-400">
              {customer.email || '-'} | {customer.mobilePhone || '-'}
            </p>
            <p className="text-gray-500 dark:text-gray-400">{customer.address || '-'}</p>
          </div>
          {canWrite && (
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/app/customers/edit/${customer.id}`}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                <PencilIcon className="h-4 w-4 me-2" /> {t('commonEdit')}
              </Link>
              {canCreateInvoices && (
                <Link
                  to="/app/invoices/new"
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                >
                  {t('customerNewInvoice')}
                </Link>
              )}
              {canCreatePayments && (
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  <WalletIcon className="h-4 w-4 me-2" /> {t('customerAddPayment')}
                </button>
              )}
            </div>
          )}
        </div>
        {!canCreatePayments && (
          <div className="mt-4 text-sm text-warning-700 bg-warning-50 border border-warning-200 rounded p-3">
            {t('customersNoPaymentPermission')}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <StatCard
            title={t('customerTotalInvoiced')}
            value={`${totalInvoiced.toFixed(2)} ${settings?.currency}`}
          />
          <StatCard
            title={t('customerTotalPaid')}
            value={`${totalPaid.toFixed(2)} ${settings?.currency}`}
          />
          <StatCard
            title={t('customerBalance')}
            value={`${balance.toFixed(2)} ${settings?.currency}`}
          />
          <StatCard
            title={t('statementTitle')}
            value={`${statement.remaining.toFixed(2)} ${settings?.currency}`}
          />
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-4 -mb-px">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'invoices'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              {t('customerTabInvoices')}
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'payments'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              {t('customerTabPayments')}
            </button>
            <button
              onClick={() => setActiveTab('statement')}
              className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'statement'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              {t('statementTab')}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'invoices' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('customerTabInvoices')}</h3>
              {invoices.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">{t('customerNoInvoices')}</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                    >
                      <div>
                        <p className="font-medium">Invoice #{invoice.number}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(invoice.date).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="font-bold text-lg">
                        {(invoice.total || 0).toFixed(2)} {settings?.currency}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('customerTabPayments')}</h3>
              {receipts.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">{t('customerNoPayments')}</p>
              ) : (
                <div className="space-y-2">
                  {receipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                    >
                      <div>
                        <p className="font-medium">{receipt.method}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(receipt.date).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="font-bold text-lg">
                        {receipt.amount.toFixed(2)} {settings?.currency}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'statement' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('statementTab')}</h3>
              {/* Statement content will be shown below */}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">{t('statementTitle')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{dateRangeLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportStatement('pdf')}
              className="px-3 py-2 bg-red-600 text-white rounded-md"
            >
              {t('reportsExportPdf')}
            </button>
            <button
              onClick={() => exportStatement('png')}
              className="px-3 py-2 bg-green-600 text-white rounded-md"
            >
              {t('reportsExportPng')}
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div>
            <label htmlFor="start" className="block text-sm font-medium">
              {t('reportsFrom')}
            </label>
            <input
              type="date"
              id="start"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              className="mt-1 block px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div>
            <label htmlFor="end" className="block text-sm font-medium">
              {t('reportsTo')}
            </label>
            <input
              type="date"
              id="end"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              className="mt-1 block px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="openingBalance"
              checked={!includeOpeningBalance}
              onChange={() => setIncludeOpeningBalance(false)}
            />
            {t('statementPeriodOnly')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="openingBalance"
              checked={includeOpeningBalance}
              onChange={() => setIncludeOpeningBalance(true)}
            />
            {t('statementWithOpening')}
          </label>
        </div>

        <div ref={printableRef}>
          <PrintableReport
            reportTitle={t('statementReportTitle')}
            companyName={settings?.businessName || t('reportsCompanyDefault')}
            logoUrl={settings?.logo}
            address={settings?.address}
            phone={settings?.contactInfo}
            dateRangeLabel={dateRangeLabel}
            summaryItems={[
              {
                label: t('statementTotalInvoices'),
                value: `${statement.totalInvoices.toFixed(2)} ${settings?.currency}`,
              },
              {
                label: t('statementTotalPaid'),
                value: `${statement.totalPayments.toFixed(2)} ${settings?.currency}`,
              },
              {
                label: t('statementRemaining'),
                value: `${statement.remaining.toFixed(2)} ${settings?.currency}`,
              },
            ]}
          >
            <div className="mb-4 text-sm font-semibold">
              {t('statementOpeningBalance')}:{' '}
              {statement.openingBalance.toFixed(2)} {settings?.currency}
            </div>
            {statement.rows.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400 text-center py-6">
                {t('statementNoActivity')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                        {t('statementTableDate')}
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                        {t('statementTableDesc')}
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                        {t('statementTableDebit')}
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                        {t('statementTableCredit')}
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                        {t('statementTableBalance')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {statement.rows.map((row, idx) => (
                      <tr key={`${row.description}-${idx}`}>
                        <td className="px-4 py-2 text-right">
                          {row.date.toLocaleDateString('ar-EG')}
                        </td>
                        <td className="px-4 py-2 text-right">{row.description}</td>
                        <td className="px-4 py-2 text-right">
                          {row.debit ? row.debit.toFixed(2) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {row.credit ? row.credit.toFixed(2) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right">{row.balance.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PrintableReport>
        </div>
      </Card>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={t('paymentModalTitle', { name: customer?.name || '' })}
      >
        {customer && (
          <PaymentForm
            customer={customer}
            onPaymentSaved={handlePaymentSaved}
            onClose={() => setIsPaymentModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
};

export default CustomerDetail;

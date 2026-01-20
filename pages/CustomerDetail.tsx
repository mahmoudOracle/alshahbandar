import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCustomerById, getInvoices, getPaymentsByCustomerId } from '../services/dataService';
import { Customer, Invoice, Payment } from '../types';
import { PencilIcon, WalletIcon } from '@heroicons/react/24/outline';
import PaymentForm from './PaymentForm';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { mapFirestoreError } from '../services/firebaseErrors';
import { useNotification } from '../contexts/NotificationContext';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import PrintableReport from '../components/PrintableReport';
import { exportElementAs } from '../services/exportUtils';

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
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
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
      const [customerResult, allInvoicesResult, paymentsResult] = await Promise.all([
        getCustomerById(companyId, id),
        getInvoices(companyId, { filters: [['customerId', '==', id]] }),
        getPaymentsByCustomerId(companyId, id),
      ]);
      setCustomer(customerResult || null);
      setInvoices(allInvoicesResult.data || []);
      setPayments(paymentsResult.data || []);
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

  const canCreatePayments =
    role === 'owner' || role === 'manager' || role === 'employee';

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

    const rows = [
      ...filteredInvoices.map((inv) => ({
        date: toDateValue(inv.date) || new Date(),
        description: `فاتورة رقم ${inv.invoiceNumber}`,
        debit: Number(inv.total || 0),
        credit: 0,
      })),
      ...filteredPayments.map((pay) => ({
        date: toDateValue(pay.date) || new Date(),
        description: `دفعة (${pay.method || 'أخرى'})${pay.notes ? ` - ${pay.notes}` : ''}`,
        debit: 0,
        credit: Number(pay.amount || 0),
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    let running = includeOpeningBalance ? openingBalance : 0;
    const withBalance: StatementRow[] = rows.map((row) => {
      running += row.debit - row.credit;
      return { ...row, balance: running };
    });

    const totalInvoices = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPayments = filteredPayments.reduce((sum, pay) => sum + (pay.amount || 0), 0);

    return {
      rows: withBalance,
      totalInvoices,
      totalPayments,
      remaining: totalInvoices - totalPayments,
      openingBalance,
    };
  }, [invoices, payments, dateRange, includeOpeningBalance]);

  if (loading || settingsLoading) return <div>جاري تحميل بيانات العميل...</div>;
  if (!customer) return <div>لا يمكن العثور على العميل.</div>;

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

  const dateRangeLabel = `الفترة من ${dateRange.start} إلى ${dateRange.end}`;

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
                <PencilIcon className="h-4 w-4 me-2" /> تعديل
              </Link>
              {canCreateInvoices && (
                <Link
                  to="/app/invoices/new"
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                >
                  فاتورة جديدة
                </Link>
              )}
              {canCreatePayments && (
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  <WalletIcon className="h-4 w-4 me-2" /> تسجيل دفعة
                </button>
              )}
            </div>
          )}
        </div>
        {!canCreatePayments && (
          <div className="mt-4 text-sm text-warning-700 bg-warning-50 border border-warning-200 rounded p-3">
            لا تملك صلاحية تسجيل الدفعات.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <StatCard
            title="إجمالي الفواتير"
            value={`${statement.totalInvoices.toFixed(2)} ${settings?.currency}`}
          />
          <StatCard
            title="إجمالي المدفوع"
            value={`${statement.totalPayments.toFixed(2)} ${settings?.currency}`}
          />
          <StatCard
            title="المتبقي"
            value={`${statement.remaining.toFixed(2)} ${settings?.currency}`}
          />
        </div>
      </Card>

      <Card>
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">كشف حساب العميل</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{dateRangeLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportStatement('pdf')}
              className="px-3 py-2 bg-red-600 text-white rounded-md"
            >
              تصدير PDF
            </button>
            <button
              onClick={() => exportStatement('png')}
              className="px-3 py-2 bg-green-600 text-white rounded-md"
            >
              تصدير PNG
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div>
            <label htmlFor="start" className="block text-sm font-medium">
              من
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
              إلى
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
            حركات الفترة فقط
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="openingBalance"
              checked={includeOpeningBalance}
              onChange={() => setIncludeOpeningBalance(true)}
            />
            مع رصيد افتتاحي
          </label>
        </div>

        <div ref={printableRef}>
          <PrintableReport
            reportTitle="كشف حساب العميل"
            companyName={settings?.businessName || 'الشركة'}
            logoUrl={settings?.logo}
            address={settings?.address}
            phone={settings?.contactInfo}
            dateRangeLabel={dateRangeLabel}
            summaryItems={[
              { label: 'إجمالي الفواتير', value: `${statement.totalInvoices.toFixed(2)} ${settings?.currency}` },
              { label: 'إجمالي المدفوع', value: `${statement.totalPayments.toFixed(2)} ${settings?.currency}` },
              { label: 'المتبقي', value: `${statement.remaining.toFixed(2)} ${settings?.currency}` },
            ]}
          >
            <div className="mb-4 text-sm font-semibold">
              الرصيد الافتتاحي: {statement.openingBalance.toFixed(2)} {settings?.currency}
            </div>
            {statement.rows.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400 text-center py-6">
                لا توجد حركات خلال هذه الفترة.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                        التاريخ
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                        البيان
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                        مدين
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                        دائن
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                        الرصيد
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
        title={`تسجيل دفعة - ${customer?.name}`}
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



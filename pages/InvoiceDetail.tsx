import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getInvoiceById,
  getCustomerById,
  deleteInvoice,
  undeleteDocument,
  getReturnsByInvoiceId,
} from '../services/dataService';
import PaymentForm from './PaymentForm';
import { Invoice, InvoiceStatus, Customer, ReturnDoc } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { mapFirestoreError } from '../services/firebaseErrors';
import { exportElementAs } from '../services/exportUtils';
import { Modal } from '../components/ui/Modal';
import ReturnForm from './ReturnForm';

const formatDate = (value?: string) => {
  try {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ar-EG');
  } catch {
    return '—';
  }
};

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { activeCompanyId, activeRole } = useAuth();
  const canWrite = useCanWrite('invoices');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returns, setReturns] = useState<ReturnDoc[]>([]);
  const { settings, loading: settingsLoading } = useSettings();
  const [loading, setLoading] = useState(true);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !activeCompanyId) return;
      setLoading(true);
      try {
        const invoiceData = await getInvoiceById(activeCompanyId, id);
        setInvoice(invoiceData || null);
        if (invoiceData) {
          const customerData = await getCustomerById(activeCompanyId, invoiceData.customerId);
          setCustomer(customerData || null);
          const returnsRes = await getReturnsByInvoiceId(activeCompanyId, invoiceData.id);
          setReturns(returnsRes.data || []);
        }
      } catch (error) {
        addNotification(mapFirestoreError(error), 'error');
      }
      setLoading(false);
    };
    fetchData();
  }, [id, activeCompanyId, addNotification]);

  const handleExport = async (format: 'pdf' | 'png') => {
    if (!invoiceRef.current || !invoice) return;
    await exportElementAs(invoiceRef.current, `invoice-${invoice.invoiceNumber}`, format);
  };

  const handleSendEmail = () => {
    if (!customer || !invoice || !settings) return;
    const subject = `فاتورة ${invoice.invoiceNumber} من ${settings.businessName}`;
    const body = `
مرحبًا ${customer.name}

مرفق تفاصيل الفاتورة رقم ${invoice.invoiceNumber}.

الإجمالي: ${invoice.total.toFixed(2)} ${settings.currency}
تاريخ الاستحقاق: ${formatDate(invoice.dueDate)}

${settings.businessName}
    `;
    const mailtoLink = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.trim())}`;
    window.location.href = mailtoLink;
  };

  const handleDelete = async () => {
    if (!invoice || !activeCompanyId) return;
    const ok = window.confirm('هل أنت متأكد من حذف الفاتورة؟ يمكن التراجع فورًا.');
    if (!ok) return;
    try {
      const res = await deleteInvoice(activeCompanyId, invoice.id);
      if (res) {
        addNotification('تم حذف الفاتورة.', 'success', {
          label: 'تراجع',
          onClick: async () => {
            try {
              const ok = await undeleteDocument(activeCompanyId, 'invoices', invoice.id);
              if (ok) {
                navigate(`/invoices/${invoice.id}`);
              }
            } catch (e) {
              console.error(e);
            }
          },
        });
        navigate('/invoices');
      } else {
        addNotification('تعذر حذف الفاتورة.', 'error');
      }
    } catch (err: unknown) {
      addNotification(mapFirestoreError(err) || 'تعذر حذف الفاتورة.', 'error');
    }
  };

  if (loading || settingsLoading) return <div>جاري تحميل الفاتورة...</div>;
  if (!invoice || !settings) return <div>لم يتم العثور على الفاتورة.</div>;

  const statusLabel = () => {
    const isOverdue = invoice.status === InvoiceStatus.Due && new Date(invoice.dueDate) < new Date();
    if (invoice.status === InvoiceStatus.Paid) return 'مدفوعة';
    if (invoice.status === InvoiceStatus.Cancelled) return 'ملغاة';
    return isOverdue ? 'متأخرة' : 'مستحقة';
  };

  const canCreatePayments =
    activeRole === 'owner' || activeRole === 'manager' || activeRole === 'employee';

  return (
    <>
      <div
        id="printable-invoice"
        ref={invoiceRef}
        className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-4xl mx-auto"
      >
        <header className="flex justify-between items-start pb-6 border-b">
          <div>
            {settings.logo ? (
              <img
                src={settings.logo}
                alt={settings.businessName}
                className="h-20 object-contain mb-4"
              />
            ) : (
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {settings.businessName}
              </h1>
            )}
            <p className="text-gray-500 dark:text-gray-400">{settings.slogan}</p>
            <p className="text-gray-500 dark:text-gray-400 mt-2">{settings.address}</p>
            <p className="text-gray-500 dark:text-gray-400">{settings.contactInfo}</p>
          </div>
          <div className="text-left">
            <h2 className="text-3xl font-bold uppercase text-gray-400 dark:text-gray-500">
              فاتورة
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mt-2"># {invoice.invoiceNumber}</p>
          </div>
        </header>

        <section className="flex justify-between items-start mt-8">
          <div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">العميل:</h3>
            <p className="font-bold text-lg text-gray-900 dark:text-white">
              {invoice.customerName}
            </p>
            {customer && <p className="text-gray-500 dark:text-gray-400">{customer.address}</p>}
          </div>
          <div className="text-left">
            <p>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                تاريخ الفاتورة:
              </span>{' '}
              {formatDate(invoice.date)}
            </p>
            <p>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                تاريخ الاستحقاق:
              </span>{' '}
              {formatDate(invoice.dueDate)}
            </p>
            <p>
              <span className="font-semibold text-gray-700 dark:text-gray-300">طريقة الدفع:</span>{' '}
              {invoice.paymentType}
            </p>
            <div className="mt-4 text-lg font-bold">{statusLabel()}</div>
          </div>
        </section>

        <section className="mt-8">
          <table className="min-w-full">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">
                  الصنف
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                  الكمية
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                  السعر
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                  الإجمالي
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b dark:border-gray-700">
                  <td className="px-6 py-4">{item.productName}</td>
                  <td className="px-6 py-4 text-center">{item.quantity}</td>
                  <td className="px-6 py-4 text-center">
                    {item.price.toFixed(2)} {settings.currency}
                  </td>
                  <td className="px-6 py-4 text-left">
                    {(item.quantity * item.price).toFixed(2)} {settings.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="flex justify-end mt-8">
          <div className="w-full md:w-1/2 lg:w-1/3 space-y-2">
            <div className="flex justify-between py-2">
              <span className="font-semibold text-gray-700 dark:text-gray-300">الإجمالي الفرعي:</span>
              <span>
                {invoice.subtotal.toFixed(2)} {settings.currency}
              </span>
            </div>
            {invoice.paymentsSummary && (
              <div className="flex justify-between py-2">
                <span className="font-semibold text-gray-700 dark:text-gray-300">المدفوع:</span>
                <span>
                  {(invoice.paymentsSummary.paid || 0).toFixed(2)} {settings.currency}
                </span>
              </div>
            )}
            {invoice.taxAmount !== undefined && invoice.taxAmount > 0 && (
              <div className="flex justify-between py-2">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  الضريبة ({invoice.taxRate || 0}%):
                </span>
                <span>
                  {invoice.taxAmount.toFixed(2)} {settings.currency}
                </span>
              </div>
            )}
            <div className="flex justify-between py-3 bg-gray-100 dark:bg-gray-700 px-4 rounded-md mt-2">
              <span className="font-bold text-xl text-gray-900 dark:text-white">الإجمالي:</span>
              <span className="font-bold text-xl text-gray-900 dark:text-white">
                {invoice.total.toFixed(2)} {settings.currency}
              </span>
            </div>
          </div>
        </section>
      </div>
      <div className="mt-8 text-center max-w-4xl mx-auto flex flex-wrap justify-center gap-2">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          طباعة
        </button>
        <button
          onClick={handleSendEmail}
          disabled={!customer?.email}
          className="px-4 py-2 text-white bg-teal-500 rounded-md hover:bg-teal-600 disabled:bg-gray-400"
        >
          إرسال بالبريد
        </button>
        {canWrite && (
          <Link
            to={`/invoices/edit/${id}`}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
          >
            تعديل
          </Link>
        )}
        {canWrite && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            حذف
          </button>
        )}
        {canWrite && canCreatePayments && (
          <button
            onClick={() => setShowPaymentForm(true)}
            className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
            disabled={Number(invoice.paymentsSummary?.due ?? Math.max(0, invoice.total - (invoice.paymentsSummary?.paid || 0))) <= 0}
          >
            تسجيل دفعة
          </button>
        )}
        {canWrite && (
          <button
            onClick={() => setShowReturnForm(true)}
            className="px-4 py-2 text-white bg-amber-600 rounded-md hover:bg-amber-700"
          >
            مرتجع
          </button>
        )}
        <button
          onClick={() => handleExport('pdf')}
          className="px-4 py-2 text-white bg-red-500 rounded-md hover:bg-red-600"
        >
          تصدير PDF
        </button>
        <button
          onClick={() => handleExport('png')}
          className="px-4 py-2 text-white bg-green-500 rounded-md hover:bg-green-600"
        >
          تصدير PNG
        </button>
      </div>
      {canWrite && !canCreatePayments && (
        <div className="mt-4 text-sm text-warning-700 bg-warning-50 border border-warning-200 rounded p-3 text-center">
          لا تملك صلاحية تسجيل الدفعات.
        </div>
      )}

      {showPaymentForm && customer && canCreatePayments && (
        <div className="max-w-2xl mx-auto mt-6 p-4 border rounded bg-white dark:bg-gray-800">
          <h3 className="font-semibold mb-3">تسجيل دفعة</h3>
          <PaymentForm
            customer={customer}
            invoice={invoice}
            onPaymentSaved={async () => {
              if (activeCompanyId && id) {
                const inv = await getInvoiceById(activeCompanyId, id);
                setInvoice(inv || null);
                const returnsRes = await getReturnsByInvoiceId(activeCompanyId, id);
                setReturns(returnsRes.data || []);
              }
              setShowPaymentForm(false);
            }}
            onClose={() => setShowPaymentForm(false)}
          />
        </div>
      )}

      <Modal
        isOpen={showReturnForm}
        onClose={() => setShowReturnForm(false)}
        title="مرتجع للفاتورة"
      >
        {invoice && (
          <ReturnForm
            invoice={invoice}
            onSaved={async () => {
              if (activeCompanyId && id) {
                const inv = await getInvoiceById(activeCompanyId, id);
                setInvoice(inv || null);
                const returnsRes = await getReturnsByInvoiceId(activeCompanyId, id);
                setReturns(returnsRes.data || []);
              }
              setShowReturnForm(false);
            }}
            onClose={() => setShowReturnForm(false)}
          />
        )}
      </Modal>

      <div className="max-w-4xl mx-auto mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-3">مرتجعات هذه الفاتورة</h3>
        {returns.length === 0 ? (
          <p className="text-sm text-gray-500">لا توجد مرتجعات لهذه الفاتورة.</p>
        ) : (
          <div className="space-y-3">
            {returns.map((ret) => (
              <div key={ret.id} className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <div className="flex justify-between text-sm">
                  <span>{(ret.date as any)?.toDate ? (ret.date as any).toDate().toLocaleDateString('ar-EG') : formatDate(String(ret.date))}</span>
                  <span>الإجمالي: {Number(ret.totalReturnAmount || 0).toFixed(2)}</span>
                </div>
                {ret.reason && <div className="text-xs text-gray-500 mt-1">{ret.reason}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default InvoiceDetail;

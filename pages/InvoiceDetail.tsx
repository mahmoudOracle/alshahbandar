import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getRoutePath } from '../src/routes';
import {
  getInvoiceById,
  getCustomerById,
  deleteInvoice,
  undeleteDocument,
  getReturnsByInvoiceId,
  getProducts,
} from '../services/dataService';
import PaymentForm from './PaymentForm';
import { Invoice, InvoiceStatus, Customer, ReturnDoc, Product } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { mapFirestoreError } from '../services/firebaseErrors';
import { buildWhatsAppUrl, exportElementAs } from '../services/exportUtils';
import { Modal } from '../components/ui/Modal';
import ReturnForm from './ReturnForm';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { t } from '../src/i18n/t';

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

const formatDate = (value?: unknown) => {
  const date = toDateValue(value);
  return date ? date.toLocaleDateString('ar-EG') : '-';
};

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { companyId, role, company } = useAuth();
  const canWrite = useCanWrite('invoices');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState('');
  const [returns, setReturns] = useState<ReturnDoc[]>([]);
  const { settings, loading: settingsLoading } = useSettings();
  const [loading, setLoading] = useState(true);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !companyId) return;
      setLoading(true);
      try {
        const [invoiceData, productsRes] = await Promise.all([
          getInvoiceById(companyId, id),
          getProducts(companyId),
        ]);
        setProducts(productsRes.data || []);
        setInvoice(invoiceData || null);
        if (invoiceData) {
          const customerData = await getCustomerById(companyId, invoiceData.customerId);
          setCustomer(customerData || null);
          const returnsRes = await getReturnsByInvoiceId(companyId, invoiceData.id);
          setReturns(returnsRes.data || []);
        }
      } catch (error) {
        addNotification(mapFirestoreError(error), 'error');
      }
      setLoading(false);
    };
    fetchData();
  }, [id, companyId, addNotification]);

  const handleExport = async (format: 'pdf' | 'png') => {
    if (!invoiceRef.current || !invoice) return;
    await exportElementAs(invoiceRef.current, `invoice-${invoice.invoiceNumber}`, format);
  };

  const handleSendEmail = () => {
    if (!customer || !invoice || !settings) return;
    const subject = t('invoiceDetailEmailSubject', {
      invoiceNumber: invoice.invoiceNumber,
      businessName: settings.businessName
    });
    const body = t('invoiceDetailEmailBody', {
      customerName: customer.name,
      invoiceNumber: invoice.invoiceNumber,
      total: Number(invoice.total || 0).toFixed(2),
      currency: settings.currency,
      dueDate: formatDate(invoice.dueDate),
      businessName: settings.businessName
    });
    const mailtoLink = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.trim())}`;
    window.location.href = mailtoLink;
  };

  const handleDelete = async () => {
    if (!invoice || !companyId) return;
    const ok = window.confirm(t('invoiceDetailDeleteConfirmMessage'));
    if (!ok) return;
    try {
      const res = await deleteInvoice(companyId, invoice.id);
      if (res) {
        addNotification(t('invoiceDetailDeleteSuccess'), 'success', {
          label: t('invoiceDetailDeleteUndo'),
          onClick: async () => {
            try {
              const restored = await undeleteDocument(companyId, 'invoices', invoice.id);
              if (restored) {
                navigate(`/app/invoices/${invoice.id}`);
              }
            } catch (e) {
              console.error(e);
            }
          },
        });
        navigate(getRoutePath('invoices'));
      } else {
        addNotification(t('invoiceDetailDeleteFailed'), 'error');
      }
    } catch (err: unknown) {
      addNotification(mapFirestoreError(err) || t('invoiceDetailDeleteFailed'), 'error');
    }
  };

  if (loading || settingsLoading) return <div>{t('invoiceDetailLoadingMessage')}</div>;
  if (!invoice || !settings) return <div>{t('invoiceDetailNotFound')}</div>;

  const statusLabel = () => {
    const isOverdue =
      invoice.status === InvoiceStatus.Due && toDateValue(invoice.dueDate) && toDateValue(invoice.dueDate)! < new Date();
    if (invoice.status === InvoiceStatus.Paid) return t('invoiceDetailStatusPaid');
    if (invoice.status === InvoiceStatus.Cancelled) return t('invoiceDetailStatusCancelled');
    return isOverdue ? t('invoiceDetailStatusOverdue') : t('invoiceDetailStatusUnpaid');
  };

  const canCreatePayments =
    role === 'owner' || role === 'manager' || role === 'employee';

  const remainingAmount = Math.max(
    0,
    Number(invoice.paymentsSummary?.due ?? Number(invoice.total || 0) - (invoice.paymentsSummary?.paid || 0))
  );

  const companyName =
    (company as { companyName?: string } | null)?.companyName ||
    settings?.businessName ||
    'الشركة';

  const invoiceUrl = (() => {
    const origin = window.location.origin;
    if (invoice?.id) return `${origin}/#/app/invoices/${invoice.id}`;
    return `${origin}${window.location.hash || ''}`;
  })();

  const whatsappMessage = [
    `فاتورة من ${companyName}`,
    `رقم الفاتورة: ${invoice.invoiceNumber}`,
    `الإجمالي: ${Number(invoice.total || 0).toFixed(2)} ${settings.currency}`,
    `المتبقي: ${remainingAmount.toFixed(2)} ${settings.currency}`,
    `الرابط: ${invoiceUrl}`,
  ].join('\n');

  const customerPhone =
    (customer as unknown as { mobilePhone?: string; phone?: string })?.mobilePhone ||
    (customer as unknown as { phone?: string })?.phone ||
    '';

  const openWhatsApp = (phone?: string) => {
    const url = buildWhatsAppUrl(phone, whatsappMessage);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

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
              {t('invoiceDetailTitle')}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mt-2"># {invoice.invoiceNumber}</p>
          </div>
        </header>

        <section className="flex justify-between items-start mt-8">
          <div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">{t('invoiceDetailCustomerLabel')}</h3>
            <p className="font-bold text-lg text-gray-900 dark:text-white">
              {invoice.customerName}
            </p>
            {customer && <p className="text-gray-500 dark:text-gray-400">{customer.address}</p>}
          </div>
          <div className="text-left">
            <p>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {t('invoiceDetailDateLabel')}
              </span>{' '}
              {formatDate(invoice.date)}
            </p>
            <p>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {t('invoiceDetailDueDateLabel')}
              </span>{' '}
              {formatDate(invoice.dueDate)}
            </p>
            <p>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {t('invoiceDetailPaymentTypeLabel')}
              </span>{' '}
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
                  {t('invoiceDetailItemsTableHeader')}
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                  {t('invoiceDetailQuantityHeader')}
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                  {t('invoiceDetailPriceHeader')}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                  {t('invoiceDetailTotalHeader')}
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => {
                const unitPrice = Number(item.price ?? item.unitPrice ?? 0);
                const lineTotal = Number(item.quantity || 0) * unitPrice;
                const displayProductName = item.productName || products.find(p => p.id === item.productId)?.name || t('invoiceDetailUnknownProduct');
                return (
                  <tr key={item.id} className="border-b dark:border-gray-700">
                    <td className="px-6 py-4">{displayProductName}</td>
                    <td className="px-6 py-4 text-center">{item.quantity}</td>
                    <td className="px-6 py-4 text-center">
                      {unitPrice.toFixed(2)} {settings.currency}
                    </td>
                    <td className="px-6 py-4 text-left">
                      {lineTotal.toFixed(2)} {settings.currency}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="flex justify-end mt-8">
          <div className="w-full md:w-1/2 lg:w-1/3 space-y-2">
            <div className="flex justify-between py-2">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{t('invoiceDetailSubtotal')}</span>
              <span>
                {Number(invoice.subtotal || 0).toFixed(2)} {settings.currency}
              </span>
            </div>
            {invoice.paymentsSummary && (
              <div className="flex justify-between py-2">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{t('invoiceDetailPaid')}</span>
                <span>
                  {Number(invoice.paymentsSummary.paid || 0).toFixed(2)} {settings.currency}
                </span>
              </div>
            )}
            {invoice.taxAmount !== undefined && invoice.taxAmount > 0 && (
              <div className="flex justify-between py-2">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {t('invoiceDetailTax', { rate: invoice.taxRate || 0 })}
                </span>
                <span>
                  {Number(invoice.taxAmount || 0).toFixed(2)} {settings.currency}
                </span>
              </div>
            )}
            <div className="flex justify-between py-3 bg-gray-100 dark:bg-gray-700 px-4 rounded-md mt-2">
              <span className="font-bold text-xl text-gray-900 dark:text-white">{t('invoiceDetailGrandTotal')}</span>
              <span className="font-bold text-xl text-gray-900 dark:text-white">
                {Number(invoice.total || 0).toFixed(2)} {settings.currency}
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
          {t('invoiceDetailPrint')}
        </button>
        <button
          onClick={handleSendEmail}
          disabled={!customer?.email}
          className="px-4 py-2 text-white bg-teal-500 rounded-md hover:bg-teal-600 disabled:bg-gray-400"
        >
          {t('invoiceDetailSendEmail')}
        </button>
        {canWrite && (
          <Link
            to={`/app/invoices/edit/${id}`}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
          >
            {t('invoiceDetailEdit')}
          </Link>
        )}
        {canWrite && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            {t('invoiceDetailDelete')}
          </button>
        )}
        {canWrite && canCreatePayments && (
          <button
            onClick={() => setShowPaymentForm(true)}
            className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
            disabled={remainingAmount <= 0}
          >
            تسجيل دفعة
          </button>
        )}
        {canWrite && (
          <button
            onClick={() => setShowReturnForm(true)}
            className="px-4 py-2 text-white bg-amber-600 rounded-md hover:bg-amber-700"
          >
            إنشاء مرتجع
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
        <button
          onClick={() => {
            if (customerPhone) {
              openWhatsApp(customerPhone);
            } else {
              setShowWhatsAppModal(true);
            }
          }}
          className="px-4 py-2 text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
        >
          مشاركة عبر واتساب
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
              if (companyId && id) {
                const inv = await getInvoiceById(companyId, id);
                setInvoice(inv || null);
                const returnsRes = await getReturnsByInvoiceId(companyId, id);
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
        title="إنشاء مرتجع للفاتورة"
      >
        {invoice && (
          <ReturnForm
            invoice={invoice}
            onSaved={async () => {
              if (companyId && id) {
                const inv = await getInvoiceById(companyId, id);
                setInvoice(inv || null);
                const returnsRes = await getReturnsByInvoiceId(companyId, id);
                setReturns(returnsRes.data || []);
              }
              setShowReturnForm(false);
            }}
            onClose={() => setShowReturnForm(false)}
          />
        )}
      </Modal>

      <Modal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        title="مشاركة عبر واتساب"
      >
        <div className="space-y-4">
          <Input
            label="رقم الهاتف"
            value={whatsAppPhone}
            onChange={(e) => setWhatsAppPhone(e.target.value)}
            placeholder="01xxxxxxxxx"
          />
          <div className="text-sm text-gray-500">سيتم فتح واتساب برسالة جاهزة.</div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowWhatsAppModal(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (!whatsAppPhone.trim()) {
                  addNotification('أدخل رقم الهاتف أولًا.', 'error');
                  return;
                }
                openWhatsApp(whatsAppPhone);
                setShowWhatsAppModal(false);
                setWhatsAppPhone('');
              }}
            >
              فتح واتساب
            </Button>
          </div>
        </div>
      </Modal>

      <div className="max-w-4xl mx-auto mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-3">QR الفاتورة</h3>
        <div className="flex flex-col items-center gap-3">
          <QRCodeCanvas value={invoiceUrl} size={160} />
          <p className="text-sm text-gray-500">امسح الكود لفتح الفاتورة</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-3">مرتجعات هذه الفاتورة</h3>
        {returns.length === 0 ? (
          <p className="text-sm text-gray-500">لا توجد مرتجعات لهذه الفاتورة.</p>
        ) : (
          <div className="space-y-3">
            {returns.map((ret) => (
              <div key={ret.id} className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <div className="flex justify-between text-sm">
                  <span>{formatDate(ret.date)}</span>
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



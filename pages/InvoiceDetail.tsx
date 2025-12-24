
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getInvoiceById, getCustomerById, deleteInvoice, undeleteDocument } from '../services/dataService';
import { Invoice, InvoiceStatus, Customer } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { mapFirestoreError } from '../services/firebaseErrors';

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { activeCompanyId } = useAuth();
  const canWrite = useCanWrite('invoices');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
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

    // Dynamically import heavy libs only when needed to reduce initial bundle size
    const [html2canvasMod, jspdfMod] = await Promise.all([
      import('html2canvas'),
      import('jspdf').catch(() => ({})),
    ]);
    const html2canvas = (html2canvasMod && (html2canvasMod.default || html2canvasMod));
    const jsPDF = jspdfMod && (jspdfMod.jsPDF || jspdfMod.default);

    const canvas = await html2canvas(invoiceRef.current, { scale: 2 });

    if (format === 'png') {
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `invoice-${invoice.invoiceNumber}.png`;
      link.click();
    } else if (format === 'pdf') {
      const imgData = canvas.toDataURL('image/png');
      if (jsPDF) {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
      } else {
        // Fallback: download PNG if jsPDF not available
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `invoice-${invoice.invoiceNumber}.png`;
        link.click();
      }
    }
  };
  
   const handleSendEmail = () => {
    if (!customer || !invoice || !settings) return;
    const subject = `فاتورة ${invoice.invoiceNumber} من ${settings.businessName}`;
    const fmt = (d?: string) => {
      try {
        if (!d) return '-';
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return '-';
        return dt.toLocaleDateString('ar-EG');
      } catch {
        return '-';
      }
    };

    const body = `
عزيزي ${customer.name}،

تحية طيبة وبعد،

يرجى الاطلاع على الفاتورة رقم ${invoice.invoiceNumber}.

إجمالي المبلغ: ${invoice.total.toFixed(2)} ${settings.currency}
تاريخ الاستحقاق: ${fmt(invoice.dueDate)}

شكراً لتعاملكم معنا.

مع أطيب التحيات،
${settings.businessName}
    `;
    const mailtoLink = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.trim())}`;
    window.location.href = mailtoLink;
  };

  const handleDelete = async () => {
    if (!invoice || !activeCompanyId) return;
    const ok = window.confirm('هل أنت متأكد أنك تريد حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.');
    if (!ok) return;
    try {
      const res = await deleteInvoice(activeCompanyId, invoice.id);
      if (res) {
        addNotification('تم حذف الفاتورة بنجاح.', 'success', {
          label: 'تراجع',
          onClick: async () => {
            try {
              const ok = await undeleteDocument(activeCompanyId, 'invoices', invoice.id);
              if (ok) {
                navigate(`/invoices/${invoice.id}`);
              }
            } catch (e) { console.error(e); }
          }
        });
        navigate('/invoices');
      } else {
        addNotification('فشل حذف الفاتورة.', 'error');
      }
    } catch (err: any) {
      addNotification(err.message || 'خطأ أثناء حذف الفاتورة.', 'error');
    }
  };

  if (loading || settingsLoading) return <div>جاري تحميل الفاتورة...</div>;
  if (!invoice || !settings) return <div>لم يتم العثور على الفاتورة.</div>;

  const getStatusChip = (status: InvoiceStatus) => {
    const isOverdue = status === InvoiceStatus.Due && new Date(invoice.dueDate) < new Date();
    switch (status) {
      case InvoiceStatus.Paid:
        return <div className="text-3xl font-bold text-green-500">مدفوعة</div>;
      case InvoiceStatus.Due:
        return <div className={`text-3xl font-bold ${isOverdue ? 'text-red-500' : 'text-yellow-500'}`}>مستحقة</div>;
      case InvoiceStatus.Cancelled:
        return <div className="text-3xl font-bold text-gray-500">ملغاة</div>;
    }
  };

  return (
    <>
      <div id="printable-invoice" ref={invoiceRef} className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
        <header className="flex justify-between items-start pb-6 border-b">
          <div>
            {settings.logo ? (
                <img src={settings.logo} alt={settings.businessName} className="h-20 object-contain mb-4" />
            ) : (
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{settings.businessName}</h1>
            )}
            <p className="text-gray-500 dark:text-gray-400">{settings.slogan}</p>
            <p className="text-gray-500 dark:text-gray-400 mt-2">{settings.address}</p>
            <p className="text-gray-500 dark:text-gray-400">{settings.contactInfo}</p>
          </div>
          <div className="text-left">
            <h2 className="text-4xl font-bold uppercase text-gray-400 dark:text-gray-500">فاتورة</h2>
            <p className="text-gray-700 dark:text-gray-300 mt-2"># {invoice.invoiceNumber}</p>
          </div>
        </header>

        <section className="flex justify-between items-start mt-8">
          <div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">فاتورة إلى:</h3>
            <p className="font-bold text-lg text-gray-900 dark:text-white">{invoice.customerName}</p>
            {customer && <p className="text-gray-500 dark:text-gray-400">{customer.address}</p>}
          </div>
          <div className="text-left">
              <p><span className="font-semibold text-gray-700 dark:text-gray-300">تاريخ الفاتورة:</span> {(() => { try { const d=new Date(invoice.date); return isNaN(d.getTime())? '-' : d.toLocaleDateString('ar-EG'); } catch { return '-'; } })()}</p>
              <p><span className="font-semibold text-gray-700 dark:text-gray-300">تاريخ الاستحقاق:</span> {(() => { try { const d=new Date(invoice.dueDate); return isNaN(d.getTime())? '-' : d.toLocaleDateString('ar-EG'); } catch { return '-'; } })()}</p>
              <p><span className="font-semibold text-gray-700 dark:text-gray-300">نوع الدفع:</span> {invoice.paymentType}</p>
              <div className="mt-4">{getStatusChip(invoice.status)}</div>
          </div>
        </section>

        <section className="mt-8">
          <table className="min-w-full">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">البند</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">الكمية</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">السعر</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map(item => (
                <tr key={item.id} className="border-b dark:border-gray-700">
                  <td className="px-6 py-4">{item.productName}</td>
                  <td className="px-6 py-4 text-center">{item.quantity}</td>
                  <td className="px-6 py-4 text-center">{item.price.toFixed(2)} {settings.currency}</td>
                  <td className="px-6 py-4 text-left">{(item.quantity * item.price).toFixed(2)} {settings.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="flex justify-end mt-8">
          <div className="w-full md:w-1/2 lg:w-1/3 space-y-2">
            <div className="flex justify-between py-2">
              <span className="font-semibold text-gray-700 dark:text-gray-300">المجموع الفرعي:</span>
              <span>{invoice.subtotal.toFixed(2)} {settings.currency}</span>
            </div>
             {invoice.taxAmount !== undefined && invoice.taxAmount > 0 && (
                <div className="flex justify-between py-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">الضريبة ({invoice.taxRate || 0}%):</span>
                    <span>{invoice.taxAmount.toFixed(2)} {settings.currency}</span>
                </div>
            )}
            <div className="flex justify-between py-3 bg-gray-100 dark:bg-gray-700 px-4 rounded-md mt-2">
              <span className="font-bold text-xl text-gray-900 dark:text-white">الإجمالي:</span>
              <span className="font-bold text-xl text-gray-900 dark:text-white">{invoice.total.toFixed(2)} {settings.currency}</span>
            </div>
          </div>
        </section>
      </div>
      <div className="mt-8 text-center max-w-4xl mx-auto flex flex-wrap justify-center gap-2">
        <button onClick={() => window.print()} className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">طباعة</button>
        <button onClick={handleSendEmail} disabled={!customer?.email} className="px-4 py-2 text-white bg-teal-500 rounded-md hover:bg-teal-600 disabled:bg-gray-400">إرسال عبر الإيميل</button>
        {canWrite && <Link to={`/invoices/edit/${id}`} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">تعديل</Link>}
        {canWrite && <button onClick={handleDelete} className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700">حذف</button>}
        <button onClick={() => handleExport('pdf')} className="px-4 py-2 text-white bg-red-500 rounded-md hover:bg-red-600">تصدير PDF</button>
        <button onClick={() => handleExport('png')} className="px-4 py-2 text-white bg-green-500 rounded-md hover:bg-green-600">تصدير صورة</button>
      </div>
    </>
  );
};

export default InvoiceDetail;

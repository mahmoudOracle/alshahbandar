
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getQuoteById, createInvoiceFromQuote } from '../services/dataService';
import { Quote, QuoteStatus, Invoice } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useSettings } from '../contexts/SettingsContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { mapFirestoreError } from '../services/firebaseErrors';

const QuoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCompanyId } = useAuth();
  const canWrite = useCanWrite('quotes');
  const [quote, setQuote] = useState<Quote | null>(null);
  const { settings, loading: settingsLoading } = useSettings();
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const quoteRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotification();

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !activeCompanyId) return;
      setLoading(true);
      const quoteData = await getQuoteById(activeCompanyId, id);
      setQuote(quoteData || null);
      setLoading(false);
    };
    fetchData();
  }, [id, activeCompanyId]);

  const handleConvertToInvoice = async () => {
    if (!quote || !activeCompanyId || !canWrite) return;
    setConverting(true);
    try {
        const newInvoice: Invoice = await createInvoiceFromQuote(activeCompanyId, quote.id);
        addNotification(`تم تحويل عرض السعر إلى الفاتورة ${newInvoice.invoiceNumber} بنجاح!`, 'success');
        navigate(`/invoices/edit/${newInvoice.id}`);
    } catch(error) {
        addNotification(mapFirestoreError(error), 'error');
        setConverting(false);
    }
  }

  if (loading || settingsLoading) return <div>جاري تحميل عرض السعر...</div>;
  if (!quote || !settings) return <div>لم يتم العثور على عرض السعر.</div>;

  const getStatusChip = (status: QuoteStatus) => {
    switch (status) {
      case QuoteStatus.Draft:
        return <div className="text-3xl font-bold text-gray-500">مسودة</div>;
      case QuoteStatus.Sent:
        return <div className="text-3xl font-bold text-blue-500">مرسل</div>;
      case QuoteStatus.Accepted:
        return <div className="text-3xl font-bold text-green-500">مقبول</div>;
      case QuoteStatus.Declined:
        return <div className="text-3xl font-bold text-red-500">مرفوض</div>;
    }
  };

  return (
    <>
      <div id="printable-quote" ref={quoteRef} className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
        <header className="flex justify-between items-start pb-6 border-b">
          <div>
            {settings.logo ? (
                <img src={settings.logo} alt={settings.businessName} className="h-20 object-contain mb-4" />
            ) : (
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{settings.businessName}</h1>
            )}
            <p className="text-gray-500 dark:text-gray-400">{settings.slogan}</p>
          </div>
          <div className="text-left">
            <h2 className="text-4xl font-bold uppercase text-gray-400 dark:text-gray-500">عرض سعر</h2>
            <p className="text-gray-700 dark:text-gray-300 mt-2"># {quote.quoteNumber}</p>
          </div>
        </header>

        <section className="flex justify-between items-start mt-8">
          <div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">مقدم إلى:</h3>
            <p className="font-bold text-lg text-gray-900 dark:text-white">{quote.customerName}</p>
          </div>
          <div className="text-left">
              <p><span className="font-semibold text-gray-700 dark:text-gray-300">تاريخ العرض:</span> {new Date(quote.date).toLocaleDateString('ar-EG')}</p>
              <p><span className="font-semibold text-gray-700 dark:text-gray-300">صالح حتى:</span> {new Date(quote.expiryDate).toLocaleDateString('ar-EG')}</p>
              <div className="mt-4">{getStatusChip(quote.status)}</div>
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
              {quote.items.map(item => (
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
              <span>{quote.subtotal.toFixed(2)} {settings.currency}</span>
            </div>
             {quote.taxAmount !== undefined && quote.taxAmount > 0 && (
                <div className="flex justify-between py-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">الضريبة ({quote.taxRate || 0}%):</span>
                    <span>{quote.taxAmount.toFixed(2)} {settings.currency}</span>
                </div>
            )}
            <div className="flex justify-between py-3 bg-gray-100 dark:bg-gray-700 px-4 rounded-md mt-2">
              <span className="font-bold text-xl text-gray-900 dark:text-white">الإجمالي:</span>
              <span className="font-bold text-xl text-gray-900 dark:text-white">{quote.total.toFixed(2)} {settings.currency}</span>
            </div>
          </div>
        </section>
      </div>
      <div className="mt-8 text-center max-w-4xl mx-auto flex justify-center gap-2">
        {canWrite && (
            <>
                <button 
                    onClick={handleConvertToInvoice} 
                    disabled={converting || quote.status === QuoteStatus.Accepted}
                    className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400">
                    {converting ? 'جاري التحويل...' : 'تحويل إلى فاتورة'}
                </button>
                <Link to={`/quotes/edit/${id}`} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">تعديل</Link>
            </>
        )}
      </div>
    </>
  );
};

export default QuoteDetail;

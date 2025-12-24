
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getQuotes } from '../services/dataService';
import { Quote, QuoteStatus } from '../types';
import { PencilIcon, EyeIcon, PlusIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { useSettings } from '../contexts/SettingsContext';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import { useAuth, useCanWrite } from '../contexts/AuthContext';

const getStatusChip = (status: QuoteStatus) => {
    switch (status) {
      case QuoteStatus.Draft:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:text-gray-200 dark:bg-gray-600">مسودة</span>;
      case QuoteStatus.Sent:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:text-blue-200 dark:bg-blue-700">مرسل</span>;
      case QuoteStatus.Accepted:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:text-green-200 dark:bg-green-700">مقبول</span>;
      case QuoteStatus.Declined:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:text-red-200 dark:bg-red-700">مرفوض</span>;
    }
};
  
const QuoteList: React.FC = () => {
  const { activeCompanyId } = useAuth();
  const canWrite = useCanWrite('quotes');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'All'>('All');
  const { settings, loading: settingsLoading } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuotes = async () => {
      if (!activeCompanyId) return;
      setLoading(true);
      const result = await getQuotes(activeCompanyId);
      setQuotes(result.data || []);
      setLoading(false);
    };
    fetchQuotes();
  }, [activeCompanyId]);

  const filteredQuotes = useMemo(() => {
    return quotes
      .filter(quote => {
        if (statusFilter !== 'All' && quote.status !== statusFilter) {
          return false;
        }
        if (searchTerm && !quote.customerName.toLowerCase().includes(searchTerm.toLowerCase()) && !quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [quotes, searchTerm, statusFilter]);

  if (loading || settingsLoading) return <TableSkeleton cols={7} />;

  if (quotes.length === 0 && !loading) {
    return (
        <EmptyState 
            icon={<DocumentDuplicateIcon className="h-8 w-8 text-slate-400" />}
            title="لا يوجد عروض أسعار بعد"
            message="ابدأ بإنشاء عرض سعرك الأول."
            action={canWrite ? { text: 'إنشاء عرض سعر', onClick: () => navigate('/quotes/new')} : undefined}
        />
    )
  }

  const statusMap: Record<QuoteStatus, string> = {
    [QuoteStatus.Draft]: 'مسودة',
    [QuoteStatus.Sent]: 'مرسل',
    [QuoteStatus.Accepted]: 'مقبول',
    [QuoteStatus.Declined]: 'مرفوض',
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 rtl:space-x-reverse w-full md:w-auto">
          <input
            type="text"
            placeholder="ابحث بالعميل أو رقم العرض..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value as QuoteStatus | 'All')}
            className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
          >
              <option value="All">كل الحالات</option>
              {Object.entries(statusMap).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
              ))}
          </select>
        </div>
        {canWrite && (
            <Link to="/quotes/new" className="w-full md:w-auto flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                <PlusIcon className="h-5 w-5 me-2" />
                عرض سعر جديد
            </Link>
        )}
      </div>

      {filteredQuotes.length > 0 ? (
        <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">رقم العرض</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">العميل</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">التاريخ</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">تاريخ الانتهاء</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">الإجمالي</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">الحالة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredQuotes.map(quote => (
                    <tr key={quote.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">{quote.quoteNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{quote.customerName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(quote.date).toLocaleDateString('ar-EG')}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(quote.expiryDate).toLocaleDateString('ar-EG')}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{quote.total.toFixed(2)} {settings?.currency}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusChip(quote.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <Link to={`/quotes/${quote.id}`} className="text-blue-600 hover:text-blue-900"><EyeIcon className="h-5 w-5" /></Link>
                          {canWrite && <Link to={`/quotes/edit/${quote.id}`} className="text-slate-600 hover:text-slate-900"><PencilIcon className="h-5 w-5" /></Link>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {filteredQuotes.map(quote => (
                    <div key={quote.id} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg shadow-md hover:shadow-lg">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-lg">{quote.customerName}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{quote.quoteNumber}</p>
                            </div>
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                <Link to={`/quotes/${quote.id}`} className="text-blue-600 hover:text-blue-900 p-1"><EyeIcon className="h-5 w-5" /></Link>
                                {canWrite && <Link to={`/quotes/edit/${quote.id}`} className="text-slate-600 hover:text-slate-900 p-1"><PencilIcon className="h-5 w-5" /></Link>}
                            </div>
                        </div>
                        <div className="mt-4 flex justify-between items-center">
                             <div>
                                <p className="text-sm font-semibold">{quote.total.toFixed(2)} {settings?.currency}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    ينتهي في: {new Date(quote.expiryDate).toLocaleDateString('ar-EG')}
                                </p>
                            </div>
                            {getStatusChip(quote.status)}
                        </div>
                    </div>
                ))}
            </div>
        </>
      ) : (
          <div className="text-center py-10">
              <p>لا توجد عروض أسعار تطابق بحثك.</p>
          </div>
      )}
    </div>
  );
};

export default QuoteList;

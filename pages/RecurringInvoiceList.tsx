
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRecurringInvoices, deleteRecurringInvoice } from '../services/dataService';
import { RecurringInvoice, Frequency } from '../types';
import { PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { mapFirestoreError } from '../services/firebaseErrors';

const RecurringInvoiceList: React.FC = () => {
  const { activeCompanyId } = useAuth();
  const canWrite = useCanWrite('recurring');
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const fetchRecurringInvoices = async () => {
      if (!activeCompanyId) return;
      setLoading(true);
      const result = await getRecurringInvoices(activeCompanyId);
      setRecurringInvoices(result.data || []);
      setLoading(false);
  };

  useEffect(() => {
    fetchRecurringInvoices();
  }, [activeCompanyId]);

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا الجدول؟') && activeCompanyId) {
        try {
            await deleteRecurringInvoice(activeCompanyId, id);
            addNotification('تم حذف الفاتورة المتكررة بنجاح!', 'success');
            fetchRecurringInvoices();
        } catch (error) {
            addNotification(mapFirestoreError(error), 'error');
        }
    }
  }

  const sortedInvoices = useMemo(() => {
    return [...recurringInvoices].sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
  }, [recurringInvoices]);

  if (loading) return <TableSkeleton cols={5} />;

  if (recurringInvoices.length === 0 && !loading) {
    return (
      <EmptyState
        icon={<ArrowPathIcon className="h-8 w-8 text-slate-400" />}
        title="لا توجد فواتير متكررة"
        message="قم بأتمتة عملية الفوترة للعملاء المنتظمين."
        action={canWrite ? {
          text: 'إنشاء فاتورة متكررة',
          onClick: () => navigate('/recurring/new'),
        } : undefined}
      />
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      {canWrite && (
        <div className="flex justify-end items-center mb-4">
            <Link
            to="/recurring/new"
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
            <PlusIcon className="h-5 w-5 me-2" />
            جدول جديد
            </Link>
        </div>
      )}
      
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">العميل</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">التكرار</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">تاريخ الاستحقاق القادم</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">تاريخ الانتهاء</th>
              {canWrite && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">إجراءات</th>}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedInvoices.map(rec => (
              <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{rec.customerName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{rec.frequency}</td>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(rec.nextDueDate).toLocaleDateString('ar-EG')}</td>
                <td className="px-6 py-4 whitespace-nowrap">{rec.endDate ? new Date(rec.endDate).toLocaleDateString('ar-EG') : 'لا يوجد'}</td>
                {canWrite && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Link to={`/recurring/edit/${rec.id}`} className="text-gray-600 hover:text-gray-900"><PencilIcon className="h-5 w-5" /></Link>
                        <button onClick={() => handleDelete(rec.id)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>
                    </div>
                    </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

       {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {sortedInvoices.map(rec => (
          <div key={rec.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-lg">{rec.customerName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{rec.frequency}</p>
              </div>
              {canWrite && (
                <div className="flex space-x-2 rtl:space-x-reverse">
                    <Link to={`/recurring/edit/${rec.id}`} className="p-2 text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"><PencilIcon className="h-5 w-5" /></Link>
                    <button onClick={() => handleDelete(rec.id)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><TrashIcon className="h-5 w-5" /></button>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">الاستحقاق القادم:</span>
                    <span className="font-semibold">{new Date(rec.nextDueDate).toLocaleDateString('ar-EG')}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">تاريخ الانتهاء:</span>
                    <span className="font-semibold">{rec.endDate ? new Date(rec.endDate).toLocaleDateString('ar-EG') : 'لا يوجد'}</span>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecurringInvoiceList;

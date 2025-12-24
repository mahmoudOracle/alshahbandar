
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getInvoices, deleteInvoice, undeleteDocument } from '../services/dataService';
import { Invoice, InvoiceStatus } from '../types';
import { PencilIcon, EyeIcon, PlusIcon, DocumentTextIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useSettings } from '../contexts/SettingsContext';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

const getStatusBadge = (status: InvoiceStatus, dueDate: string): React.ReactNode => {
    const isOverdue = status === InvoiceStatus.Due && new Date(dueDate) < new Date();
    switch (status) {
      case InvoiceStatus.Paid:
        return <Badge variant="success">مدفوعة</Badge>;
      case InvoiceStatus.Due:
        return <Badge variant={isOverdue ? 'danger' : 'warning'}>مستحقة</Badge>;
      case InvoiceStatus.Cancelled:
        return <Badge variant="default">ملغاة</Badge>;
    }
};

const PAGE_SIZE = 15;

const InvoiceCard: React.FC<{ invoice: Invoice, currency?: string, canWrite: boolean, onDelete?: (id: string) => void }> = ({ invoice, currency, canWrite, onDelete }) => (
    <Card padding="sm" className="md:hidden">
        <div className="flex justify-between items-start mb-2">
            <div>
                <h3 className="font-bold text-lg">{invoice.invoiceNumber}</h3>
                <p className="text-sm text-gray-500">{invoice.customerName}</p>
            </div>
            {getStatusBadge(invoice.status, invoice.dueDate)}
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm mt-2">
            <div>
                <span className="text-gray-500">التاريخ:</span>
                <span className="ms-2">{new Date(invoice.date).toLocaleDateString('ar-EG')}</span>
            </div>
            <div>
                <span className="text-gray-500">الإجمالي:</span>
                <span className="ms-2 font-bold">{invoice.total.toFixed(2)} {currency}</span>
            </div>
        </div>
        <div className="flex gap-2 mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
            <Link to={`/invoices/${invoice.id}`} className="flex-1">
                <Button variant="secondary" size="sm" className="w-full">
                    <EyeIcon className="h-4 w-4 me-2" />
                    عرض
                </Button>
            </Link>
            {canWrite && (
                <Link to={`/invoices/edit/${invoice.id}`} className="flex-1">
                    <Button variant="ghost" size="sm" className="w-full">
                        <PencilIcon className="h-4 w-4 me-2" />
                        تعديل
                    </Button>
                </Link>
            )}
            {canWrite && (
              <div className="flex-1">
                <Button type="button" variant="danger" size="sm" className="w-full" onClick={() => { if (window.confirm('هل أنت متأكد أنك تريد حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.')) { onDelete && onDelete(invoice.id); } }}>
                  <TrashIcon className="h-4 w-4 me-2" />
                  حذف
                </Button>
              </div>
            )}
        </div>
    </Card>
);

const InvoiceList: React.FC = () => {
  const { activeCompanyId } = useAuth();
  const canWrite = useCanWrite('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'All'>('All');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'total_desc' | 'total_asc'>('date_desc');
  
  const [nextCursor, setNextCursor] = useState<any | null>(null);
  const [prevCursors, setPrevCursors] = useState<any[]>([]);
  const [isLastPage, setIsLastPage] = useState(false);

  const { settings, loading: settingsLoading } = useSettings();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  
  const fetchInvoices = useCallback(async (cursor?: any, direction: 'next' | 'prev' = 'next') => {
    if (!activeCompanyId) return;
    setLoading(true);

    try {
        const result = await getInvoices(activeCompanyId, {
            limit: PAGE_SIZE,
            startAfter: cursor,
            orderBy: 'date',
            orderDirection: 'desc',
        });
        
        setInvoices(result.data);
        setNextCursor(result.nextCursor);
        setIsLastPage(!result.nextCursor || result.data.length < PAGE_SIZE);

        if (direction === 'next') {
            if (cursor) setPrevCursors(prev => [...prev, cursor]);
        } else {
            setPrevCursors(prev => prev.slice(0, prev.length - 1));
        }
    } catch (error: any) {
        addNotification(error.message || "Failed to load invoices.", "error");
        setInvoices([]);
    }
    setLoading(false);
  }, [activeCompanyId, addNotification]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleNextPage = () => {
    if (nextCursor) {
      fetchInvoices(nextCursor, 'next');
    }
  };

  const handlePrevPage = () => {
    if (prevCursors.length > 0) {
      const prevCursor = prevCursors[prevCursors.length - 2];
      fetchInvoices(prevCursor, 'prev');
    } else {
      fetchInvoices(undefined, 'prev');
    }
  };
  
  const handleDelete = async (invoiceId: string) => {
    if (!activeCompanyId) return;
    const ok = window.confirm('هل أنت متأكد أنك تريد حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.');
    if (!ok) return;
    try {
      const res = await deleteInvoice(activeCompanyId, invoiceId);
      if (res) {
        setInvoices(prev => prev.filter(i => i.id !== invoiceId));
        addNotification('تم حذف الفاتورة بنجاح.', 'success', {
          label: 'تراجع',
          onClick: async () => {
            try {
              const ok = await undeleteDocument(activeCompanyId, 'invoices', invoiceId);
              if (ok) {
                await fetchInvoices();
                return;
              }
              throw new Error('فشل استرجاع الفاتورة');
            } catch (e) {
              console.error(e);
            }
          }
        });
        fetchInvoices();
      } else {
        addNotification('فشل حذف الفاتورة.', 'error');
      }
    } catch (err: any) {
      addNotification(err.message || 'خطأ أثناء حذف الفاتورة.', 'error');
    }
  };
  
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      if (statusFilter !== 'All' && invoice.status !== statusFilter) return false;
      if (searchTerm && !((invoice.customerName || '').toLowerCase().includes((searchTerm || '').toLowerCase())) && !((invoice.invoiceNumber || '').toLowerCase().includes((searchTerm || '').toLowerCase()))) return false;
      if (dateFilter.start && invoice.date < dateFilter.start) return false;
      if (dateFilter.end && invoice.date > dateFilter.end) return false;
      return true;
    });
  }, [invoices, searchTerm, statusFilter, dateFilter]);

  const sortedInvoices = useMemo(() => {
    const list = [...filteredInvoices];
    if (sortBy === 'date_desc') return list.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (sortBy === 'date_asc') return list.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (sortBy === 'total_desc') return list.sort((a,b) => (b.total || 0) - (a.total || 0));
    if (sortBy === 'total_asc') return list.sort((a,b) => (a.total || 0) - (b.total || 0));
    return list;
  }, [filteredInvoices, sortBy]);

  if (loading || settingsLoading) return <TableSkeleton cols={7} rows={PAGE_SIZE} />;

  if (invoices.length === 0 && !loading) {
    return ( <EmptyState icon={<DocumentTextIcon className="h-8 w-8" />} title="لا يوجد فواتير بعد" message="ابدأ بإنشاء فاتورتك الأولى لتظهر هنا." action={canWrite ? { text: 'إنشاء فاتورة جديدة', onClick: () => navigate('/invoices/new')} : undefined} /> )
  }

  return (
    <Card>
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 flex-wrap">
            <Input type="text" placeholder="ابحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full md:w-auto"/>
            <Select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                options={[
                    { value: 'All', label: 'كل الحالات' },
                    { value: InvoiceStatus.Paid, label: 'مدفوعة' },
                    { value: InvoiceStatus.Due, label: 'مستحقة' },
                    { value: InvoiceStatus.Cancelled, label: 'ملغاة' },
                ]}
                className="w-full md:w-auto"
            />
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input type="text" value={dateFilter.start.split('-').reverse().join('/')} onChange={e => {
                const val = e.target.value;
                const s = val.includes('/') ? '/' : val.includes('-') ? '-' : '/';
                const parts = val.split(s).map(p=>p.trim());
                const iso = parts.length===3 ? `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}` : val;
                setDateFilter(p => ({...p, start: iso}));
              }} className="w-full px-3 py-2 border rounded-md" />
              <span className="text-sm text-gray-500">إلى</span>
              <input type="text" value={dateFilter.end.split('-').reverse().join('/')} onChange={e => {
                const val = e.target.value;
                const s = val.includes('/') ? '/' : val.includes('-') ? '-' : '/';
                const parts = val.split(s).map(p=>p.trim());
                const iso = parts.length===3 ? `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}` : val;
                setDateFilter(p => ({...p, end: iso}));
              }} className="w-full px-3 py-2 border rounded-md" />
            </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-2 border rounded-md bg-white dark:bg-gray-700">
                <option value="date_desc">الأحدث</option>
                <option value="date_asc">الأقدم</option>
                <option value="total_desc">الأعلى قيمة</option>
                <option value="total_asc">الأدنى قيمة</option>
              </select>
            {canWrite && (
                <Link to="/invoices/new" className="w-full md:w-auto">
                    <Button variant="primary" className="w-full">
                        <PlusIcon className="h-5 w-5 me-2" /> فاتورة جديدة
                    </Button>
                </Link>
            )}
        </div>
      
      {sortedInvoices.length > 0 ? (
        <>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">رقم الفاتورة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">العميل</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">التاريخ</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الإجمالي</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الحالة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedInvoices.map(invoice => (
                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">{invoice.invoiceNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{invoice.customerName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(invoice.date).toLocaleDateString('ar-EG')}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{invoice.total.toFixed(2)} {settings?.currency}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(invoice.status, invoice.dueDate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Link to={`/invoices/${invoice.id}`} className="text-primary-600 hover:text-primary-700 p-2" aria-label="عرض التفاصيل"><EyeIcon className="h-5 w-5" /></Link>
                          {canWrite && <Link to={`/invoices/edit/${invoice.id}`} className="text-gray-600 hover:text-gray-900 p-2" aria-label="تعديل الفاتورة"><PencilIcon className="h-5 w-5" /></Link>}
                          {canWrite && <button onClick={() => handleDelete(invoice.id)} className="text-red-600 hover:text-red-900 p-2" aria-label="حذف الفاتورة"><TrashIcon className="h-5 w-5" /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4 mt-4">
                {sortedInvoices.map(invoice => (
                  <InvoiceCard key={invoice.id} invoice={invoice} currency={settings?.currency} canWrite={canWrite} onDelete={handleDelete} />
                ))}
            </div>
            
            <div className="flex justify-center items-center mt-6 gap-2">
                <Button onClick={handlePrevPage} disabled={prevCursors.length === 0} variant="secondary" size="sm" aria-label="الصفحة السابقة">
                    <ChevronRightIcon className="h-5 w-5" />
                </Button>
                <Button onClick={handleNextPage} disabled={isLastPage} variant="secondary" size="sm" aria-label="الصفحة التالية">
                    <ChevronLeftIcon className="h-5 w-5" />
                </Button>
            </div>
        </>
      ) : (
          <div className="text-center py-10">
              <p>لا توجد فواتير تطابق بحثك.</p>
          </div>
      )}
    </Card>
  );
};

export default InvoiceList;

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getInvoices,
  deleteInvoice,
  undeleteDocument,
  duplicateLastInvoice,
  duplicateInvoice,
} from '../services/dataService';
import { Invoice, InvoiceStatus } from '../types';
import {
  PencilIcon,
  EyeIcon,
  PlusIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
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

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

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

const InvoiceCard: React.FC<{
  invoice: Invoice;
  currency?: string;
  canWrite: boolean;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}> = ({ invoice, currency, canWrite, onDelete, onDuplicate }) => (
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
        <span className="ms-2 font-bold">
          {invoice.total.toFixed(2)} {currency}
        </span>
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
          <Button
            type="button"
            variant="danger"
            size="sm"
            className="w-full"
            onClick={() => {
              if (
                window.confirm(
                  'هل أنت متأكد أنك تريد حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.'
                )
              ) {
                onDelete && onDelete(invoice.id);
              }
            }}
          >
            <TrashIcon className="h-4 w-4 me-2" />
            حذف
          </Button>
        </div>
      )}
      {canWrite && (
        <div className="flex-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => {
              onDuplicate && onDuplicate(invoice.id);
            }}
          >
            <DocumentTextIcon className="h-4 w-4 me-2" />
            نسخ
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
  const [dateRange, setDateRange] = useState<{
    type: 'all' | 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'custom';
    startDate?: string;
    endDate?: string;
    customStart?: string;
    customEnd?: string;
  }>({ type: 'all' });
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'total_desc' | 'total_asc'>(
    'date_desc'
  );

  
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const calculateDateRange = useCallback((type: string, date = new Date()) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const formatISO = (d: Date) => d.toISOString().split('T')[0];

    let startDate: string | undefined = undefined;
    let endDate: string | undefined = undefined;

    switch (type) {
      case 'today':
        startDate = formatISO(start);
        endDate = formatISO(end);
        break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
        startDate = formatISO(start);
        endDate = formatISO(end);
        break;
      case 'thisWeek':
        start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
        end.setDate(start.getDate() + 6); // End of week (Saturday)
        endDate.setHours(23, 59, 59, 999);
        startDate = formatISO(start);
        endDate = formatISO(end);
        break;
      case 'thisMonth':
        start.setDate(1); // Start of month
        end.setMonth(start.getMonth() + 1);
        end.setDate(0); // Last day of month
        endDate.setHours(23, 59, 59, 999);
        startDate = formatISO(start);
        endDate = formatISO(end);
        break;
      case 'all':
      default:
        break;
    }
    return { startDate, endDate };
  }, []);


  const [nextCursor, setNextCursor] = useState<unknown | null>(null);
  const [prevCursors, setPrevCursors] = useState<unknown[]>([]);
  const [isLastPage, setIsLastPage] = useState(false);
  const [dupLoading, setDupLoading] = useState(false);

  const { settings, loading: settingsLoading } = useSettings();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const fetchInvoices = useCallback(
    async (
      cursor?: unknown,
      direction: 'next' | 'prev' = 'next',
    ) => {
      if (!activeCompanyId) return;
      setLoading(true);

      const [orderByField, orderDirection] = sortBy.split('_') as [string, 'asc' | 'desc'];
      
      const filters: [string, '==', unknown][] = [];
      if (statusFilter !== 'All') {
        filters.push(['status', '==', statusFilter]);
      }

      try {
        const result = await getInvoices(activeCompanyId, {
          limit: PAGE_SIZE,
          startAfter: cursor as any,
          orderBy: orderByField,
          orderDirection: orderDirection,
          dateStart: dateRange.startDate,
          dateEnd: dateRange.endDate,
          searchField: debouncedSearchTerm ? 'customerName' : undefined, // Assuming search by customer name
          searchTerm: debouncedSearchTerm || undefined,
          filters: filters.length > 0 ? filters : undefined,
        });

        setInvoices(result.data);
        setNextCursor(result.nextCursor);
        setIsLastPage(!result.nextCursor || result.data.length < PAGE_SIZE);

        if (direction === 'next') {
          if (cursor) setPrevCursors((prev) => [...prev, cursor]);
        } else {
          setPrevCursors((prev) => prev.slice(0, prev.length - 1));
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error || '');
        addNotification(msg || 'Failed to load invoices.', 'error');
        setInvoices([]);
      }
      setLoading(false);
    },
    [activeCompanyId, addNotification, sortBy, statusFilter, dateRange.startDate, dateRange.endDate, debouncedSearchTerm]
  );

  useEffect(() => {
    setPrevCursors([]); // Reset pagination when filters change
    fetchInvoices(undefined, 'next');
  }, [fetchInvoices, sortBy, statusFilter, dateRange.startDate, dateRange.endDate, debouncedSearchTerm]);

  const handleNextPage = () => {
    if (nextCursor) {
      fetchInvoices(nextCursor, 'next');
    }
  };

  const handlePrevPage = () => {
    if (prevCursors.length > 0) {
      const prevCursorToUse = prevCursors.length > 1 ? prevCursors[prevCursors.length - 2] : undefined;
      fetchInvoices(prevCursorToUse, 'prev');
    }
  };

  const handleChangeDateRange = (type: typeof dateRange.type, date?: Date) => {
    const { startDate, endDate } = calculateDateRange(type, date);
    setDateRange({ type, startDate, endDate });
  };

  const handlePeriodNavigation = (direction: 'prev' | 'next') => {
    const currentStartDate = dateRange.startDate ? new Date(dateRange.startDate) : new Date();
    const currentEndDate = dateRange.endDate ? new Date(dateRange.endDate) : new Date();
    const newStartDate = new Date(currentStartDate);
    const newEndDate = new Date(currentEndDate);

    if (dateRange.type === 'today' || dateRange.type === 'yesterday') {
      const dayOffset = direction === 'prev' ? -1 : 1;
      newStartDate.setDate(currentStartDate.getDate() + dayOffset);
      newEndDate.setDate(currentEndDate.getDate() + dayOffset);
    } else if (dateRange.type === 'thisWeek') {
      const weekOffset = direction === 'prev' ? -7 : 7;
      newStartDate.setDate(currentStartDate.getDate() + weekOffset);
      newEndDate.setDate(currentEndDate.getDate() + weekOffset);
    } else if (dateRange.type === 'thisMonth') {
      const monthOffset = direction === 'prev' ? -1 : 1;
      newStartDate.setMonth(currentStartDate.getMonth() + monthOffset);
      newEndDate.setMonth(currentEndDate.getMonth() + monthOffset);
      newEndDate.setDate(0); // Last day of new month
      newStartDate.setDate(1); // First day of new month
    } else {
      // For 'all' or 'custom' types, navigation might not make sense or require specific logic
      return;
    }
    setDateRange({
      type: dateRange.type,
      startDate: newStartDate.toISOString().split('T')[0],
      endDate: newEndDate.toISOString().split('T')[0],
    });
  };

  const handleDelete = async (invoiceId: string) => {
    if (!activeCompanyId) return;
    const ok = window.confirm(
      'هل أنت متأكد أنك تريد حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.'
    );
    if (!ok) return;
    try {
      const res = await deleteInvoice(activeCompanyId, invoiceId);
      if (res) {
        // No need to filter client-side, just re-fetch
        addNotification('تم حذف الفاتورة بنجاح.', 'success', {
          label: 'تراجع',
          onClick: async () => {
            try {
              const ok = await undeleteDocument(activeCompanyId, 'invoices', invoiceId);
              if (ok) {
                await fetchInvoices(); // Re-fetch on undo
                return;
              }
              throw new Error('فشل استرجاع الفاتورة');
            } catch (e) {
              console.error(e);
            }
          },
        });
        fetchInvoices(); // Re-fetch all invoices after delete
      } else {
        addNotification('فشل حذف الفاتورة.', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err || 'خطأ أثناء حذف الفاتورة.');
      addNotification(msg || 'خطأ أثناء حذف الفاتورة.', 'error');
    }
  };

  const handleDuplicateLast = async () => {
    if (!activeCompanyId) return;
    setDupLoading(true);
    try {
      const newInv = await duplicateLastInvoice(activeCompanyId);
      addNotification('تم تكرار آخر فاتورة بنجاح.', 'success', {
        label: 'عرض',
        onClick: () => navigate(`/invoices/edit/${newInv.id}`),
      });
      await fetchInvoices();
      navigate(`/invoices/edit/${newInv.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err || 'فشل تكرار الفاتورة.');
      addNotification(msg || 'فشل تكرار الفاتورة.', 'error');
    } finally {
      setDupLoading(false);
    }
  };

  const handleDuplicateInvoice = async (invoiceId: string) => {
    if (!activeCompanyId) return;
    setDupLoading(true);
    try {
      const newInv = await duplicateInvoice(activeCompanyId, invoiceId);
      addNotification('تم تكرار الفاتورة بنجاح.', 'success', {
        label: 'عرض',
        onClick: () => navigate(`/invoices/edit/${newInv.id}`),
      });
      await fetchInvoices();
      navigate(`/invoices/edit/${newInv.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err || 'فشل تكرار الفاتورة.');
      addNotification(msg || 'فشل تكرار الفاتورة.', 'error');
    } finally {
      setDupLoading(false);
    }
  };

  // No longer need client-side filtering/sorting, as it's done server-side
  const displayedInvoices = invoices;

  if (loading || settingsLoading) return <TableSkeleton cols={7} rows={PAGE_SIZE} />;

  if (invoices.length === 0 && !loading && debouncedSearchTerm === '' && statusFilter === 'All' && !dateRange.startDate) {
    return (
      <EmptyState
        icon={<DocumentTextIcon className="h-8 w-8" />}
        title="لا يوجد فواتير بعد"
        message="ابدأ بإنشاء فاتورتك الأولى لتظهر هنا."
        action={
          canWrite
            ? { text: 'إنشاء فاتورة جديدة', onClick: () => navigate('/invoices/new') }
            : undefined
        }
      />
    );
  }

  return (
    <Card>
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 flex-wrap">
        <Input
          type="text"
          placeholder="ابحث..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-auto"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'All')}
          options={[
            { value: 'All', label: 'كل الحالات' },
            { value: InvoiceStatus.Paid, label: 'مدفوعة' },
            { value: InvoiceStatus.Due, label: 'مستحقة' },
            { value: InvoiceStatus.Cancelled, label: 'ملغاة' },
          ]}
          className="w-full md:w-auto"
        />
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="date" // Changed to date type for better UX
            value={dateRange.customStart || dateRange.startDate || ''}
            onChange={(e) => {
              const val = e.target.value;
              setDateRange((prev) => ({ ...prev, type: 'custom', customStart: val, startDate: val }));
            }}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="تاريخ البدء"
          />
          <span className="text-sm text-gray-500">إلى</span>
          <input
            type="date" // Changed to date type for better UX
            value={dateRange.customEnd || dateRange.endDate || ''}
            onChange={(e) => {
              const val = e.target.value;
              setDateRange((prev) => ({ ...prev, type: 'custom', customEnd: val, endDate: val }));
            }}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="تاريخ الانتهاء"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <Button
            variant={dateRange.type === 'today' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => handleChangeDateRange('today')}
          >
            اليوم
          </Button>
          <Button
            variant={dateRange.type === 'yesterday' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => handleChangeDateRange('yesterday')}
          >
            أمس
          </Button>
          <Button
            variant={dateRange.type === 'thisWeek' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => handleChangeDateRange('thisWeek')}
          >
            هذا الأسبوع
          </Button>
          <Button
            variant={dateRange.type === 'thisMonth' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => handleChangeDateRange('thisMonth')}
          >
            هذا الشهر
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePeriodNavigation('prev')}
          >
            <ChevronRightIcon className="h-4 w-4" /> {/* Right for previous */}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePeriodNavigation('next')}
          >
            <ChevronLeftIcon className="h-4 w-4" /> {/* Left for next */}
          </Button>
        </div>
        <select
          value={sortBy}
          onChange={(e) => {
            const v = e.target.value as 'date_desc' | 'date_asc' | 'total_desc' | 'total_asc';
            setSortBy(v);
          }}
          className="px-3 py-2 border rounded-md bg-white dark:bg-gray-700"
        >
          <option value="date_desc">الأحدث</option>
          <option value="date_asc">الأقدم</option>
          <option value="total_desc">الأعلى قيمة</option>
          <option value="total_asc">الأدنى قيمة</option>
        </select>
        {canWrite && (
          <>
            <Link to="/invoices/new" className="w-full md:w-auto">
              <Button variant="primary" className="w-full">
                <PlusIcon className="h-5 w-5 me-2" /> فاتورة جديدة
              </Button>
            </Link>
            <div className="w-full md:w-auto">
              <Button
                onClick={handleDuplicateLast}
                variant="secondary"
                className="w-full mt-2 md:mt-0"
                disabled={dupLoading}
              >
                <DocumentTextIcon className="h-5 w-5 me-2" /> نسخ آخر فاتورة
              </Button>
            </div>
          </>
        )}
      </div>

      {displayedInvoices.length > 0 ? (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    رقم الفاتورة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    العميل
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    التاريخ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    الإجمالي
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {displayedInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{invoice.customerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(invoice.date).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invoice.total.toFixed(2)} {settings?.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invoice.status, invoice.dueDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/invoices/${invoice.id}`}
                          className="text-primary-600 hover:text-primary-700 p-2"
                          aria-label="عرض التفاصيل"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                        {canWrite && (
                          <Link
                            to={`/invoices/edit/${invoice.id}`}
                            className="text-gray-600 hover:text-gray-900 p-2"
                            aria-label="تعديل الفاتورة"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </Link>
                        )}
                        {canWrite && (
                          <button
                            onClick={() => handleDelete(invoice.id)}
                            className="text-red-600 hover:text-red-900 p-2"
                            aria-label="حذف الفاتورة"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                        {canWrite && (
                          <button
                            onClick={() => handleDuplicateInvoice(invoice.id)}
                            className="text-gray-600 hover:text-gray-900 p-2"
                            aria-label="نسخ الفاتورة"
                          >
                            <DocumentTextIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-4 mt-4">
            {displayedInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                currency={settings?.currency}
                canWrite={canWrite}
                onDelete={handleDelete}
                onDuplicate={handleDuplicateInvoice}
              />
            ))}
          </div>

          <div className="flex justify-center items-center mt-6 gap-2">
            <Button
              onClick={handlePrevPage}
              disabled={prevCursors.length === 0}
              variant="secondary"
              size="sm"
              aria-label="الصفحة السابقة"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </Button>
            <Button
              onClick={handleNextPage}
              disabled={isLastPage}
              variant="secondary"
              size="sm"
              aria-label="الصفحة التالية"
            >
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

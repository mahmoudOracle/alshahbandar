import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRoutePath } from '../src/routes';
import {
  getInvoices,
  deleteInvoice,
  undeleteDocument,
  duplicateInvoice,
} from '../services/dataService';
import { Invoice, InvoiceStatus } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { toISODateCairo } from '../src/utils/date';
import { Button } from '../src/ui/Button';
import { Input } from '../src/ui/Input';
import { Select } from '../src/ui/Select';
import { Card } from '../src/ui/Card';
import { ListRow } from '../src/ui/ListRow';
import { SectionHeader } from '../src/ui/SectionHeader';
import { ActionMenu } from '../src/ui/ActionMenu';
import { t } from '../src/i18n/t';
import { PencilIcon, DocumentDuplicateIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const getStatusText = (status: InvoiceStatus) => {
  switch (status) {
    case InvoiceStatus.Paid:
      return { label: t('invoicesPaid'), tone: 'success' };
    case InvoiceStatus.Due:
      return { label: t('invoicesDue'), tone: 'warning' };
    case InvoiceStatus.Cancelled:
      return { label: t('invoicesCancelled'), tone: 'muted' };
    default:
      return { label: t('commonUnknown'), tone: 'muted' };
  }
};

const PAGE_SIZE = 15;

const InvoiceList: React.FC = () => {
  const { companyId } = useAuth();
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
  const [showFilters, setShowFilters] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const calculateDateRange = useCallback((type: string, date = new Date()) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    const formatISO = (d: Date) => toISODateCairo(d);

    let startDate: string | undefined;
    let endDate: string | undefined;

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
        start.setDate(start.getDate() - start.getDay());
        end.setDate(start.getDate() + 6);
        endDate = formatISO(end);
        startDate = formatISO(start);
        break;
      case 'thisMonth':
        start.setDate(1);
        end.setMonth(start.getMonth() + 1);
        end.setDate(0);
        endDate = formatISO(end);
        startDate = formatISO(start);
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

  const { settings, loading: settingsLoading } = useSettings();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const fetchInvoices = useCallback(
    async (cursor?: unknown, direction: 'next' | 'prev' = 'next') => {
      if (!companyId) return;
      setLoading(true);
      const [orderByField, orderDirection] = sortBy.split('_') as [string, 'asc' | 'desc'];

      const filters: [string, '==', unknown][] = [];
      if (statusFilter !== 'All') {
        filters.push(['status', '==', statusFilter]);
      }

      try {
        const result = await getInvoices(companyId, {
          limit: PAGE_SIZE,
          startAfter: cursor as any,
          orderBy: orderByField,
          orderDirection,
          dateStart: dateRange.startDate,
          dateEnd: dateRange.endDate,
          searchField: debouncedSearchTerm ? 'customerName' : undefined,
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
        addNotification(msg || t('invoicesLoadError'), 'error');
        setInvoices([]);
      }
      setLoading(false);
    },
    [companyId, addNotification, sortBy, statusFilter, dateRange.startDate, dateRange.endDate, debouncedSearchTerm]
  );

  useEffect(() => {
    setPrevCursors([]);
    fetchInvoices(undefined, 'next');
  }, [fetchInvoices, sortBy, statusFilter, dateRange.startDate, dateRange.endDate, debouncedSearchTerm]);

  const handleNextPage = () => {
    if (nextCursor) fetchInvoices(nextCursor, 'next');
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

  const handleDelete = async (invoiceId: string) => {
    if (!companyId) return;
    const ok = window.confirm(t('invoiceDeleteConfirm'));
    if (!ok) return;
    try {
      const res = await deleteInvoice(companyId, invoiceId);
      if (res) {
        addNotification(t('invoiceDeleteSuccess'), 'success', {
          label: t('commonUndo'),
          onClick: async () => {
            try {
              const okUndo = await undeleteDocument(companyId, 'invoices', invoiceId);
              if (okUndo) await fetchInvoices();
            } catch (e) {
              console.error(e);
            }
          },
        });
        fetchInvoices();
      } else {
        addNotification(t('invoiceDeleteFail'), 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err || t('invoiceDeleteError'));
      addNotification(msg || t('invoiceDeleteError'), 'error');
    }
  };

  const handleDuplicateInvoice = async (invoiceId: string) => {
    if (!companyId) return;
    try {
      const newInv = await duplicateInvoice(companyId, invoiceId);
      addNotification(t('invoiceDuplicateSuccess'), 'success', {
        label: t('commonView'),
        onClick: () => navigate(`/app/invoices/edit/${newInv.id}`),
      });
      await fetchInvoices();
      navigate(`/app/invoices/edit/${newInv.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err || t('invoiceDuplicateFail'));
      addNotification(msg || t('invoiceDuplicateFail'), 'error');
    }
  };

  const displayedInvoices = invoices;

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: settings?.currency || 'EGP',
        maximumFractionDigits: 2,
      }),
    [settings?.currency]
  );

  const formatMoney = (value: number) => formatter.format(value || 0);

  if (loading || settingsLoading) return <TableSkeleton cols={4} rows={PAGE_SIZE} />;

  if (
    invoices.length === 0 &&
    !loading &&
    debouncedSearchTerm === '' &&
    statusFilter === 'All' &&
    !dateRange.startDate
  ) {
    return (
      <EmptyState
        title={t('invoicesEmptyTitle')}
        message={t('invoicesEmptyMessage')}
        action={
          canWrite
            ? { text: t('invoicesNew'), onClick: () => navigate(getRoutePath('invoiceForm')) }
            : undefined
        }
      />
    );
  }

  return (
    <div className="page-container lg">
      {/* Page Header */}
      <div className="page-section">
        <SectionHeader 
          title={t('invoicesTitle')} 
          subtitle={t('invoicesSubtitle')}
          action={canWrite ? <Link to="/app/invoices/new" className="ui-button primary">{t('invoicesNew')}</Link> : undefined}
        />
      </div>

      {/* Filters Section */}
      <div className="page-section">
        <Card>
          <div className="card-body gap-4">
            {/* Search Row */}
            <div className="flex gap-4 flex-col md:flex-row">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder={t('invoicesSearch')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowFilters((s) => !s)}
              >
                {t('commonFilter')}
              </Button>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label={t('invoicesStatus')}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'All')}
                  options={[
                    { value: 'All', label: t('invoicesAllStatuses') },
                    { value: InvoiceStatus.Paid, label: t('invoicesPaid') },
                    { value: InvoiceStatus.Due, label: t('invoicesDue') },
                    { value: InvoiceStatus.Cancelled, label: t('invoicesCancelled') },
                  ]}
                />
                <Select
                  label={t('invoicesSort')}
                  value={sortBy}
                  onChange={(e) => {
                    const v = e.target.value as 'date_desc' | 'date_asc' | 'total_desc' | 'total_asc';
                    setSortBy(v);
                  }}
                  options={[
                    { value: 'date_desc', label: t('invoicesNewest') },
                    { value: 'date_asc', label: t('invoicesOldest') },
                    { value: 'total_desc', label: t('invoicesHighest') },
                    { value: 'total_asc', label: t('invoicesLowest') },
                  ]}
                />
                <Select
                  label={t('invoicesPeriod')}
                  value={dateRange.type}
                  onChange={(e) => handleChangeDateRange(e.target.value as typeof dateRange.type)}
                  options={[
                    { value: 'all', label: t('invoicesAllPeriods') },
                    { value: 'today', label: t('reportsToday') },
                    { value: 'yesterday', label: t('reportsYesterday') },
                    { value: 'thisWeek', label: t('invoicesThisWeek') },
                    { value: 'thisMonth', label: t('invoicesThisMonth') },
                  ]}
                />
                {dateRange.type === 'custom' && (
                  <>
                    <Input
                      label={t('reportsFrom')}
                      type="date"
                      value={dateRange.customStart || dateRange.startDate || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDateRange((prev) => ({ ...prev, type: 'custom', customStart: val, startDate: val }));
                      }}
                    />
                    <Input
                      label={t('reportsTo')}
                      type="date"
                      value={dateRange.customEnd || dateRange.endDate || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDateRange((prev) => ({ ...prev, type: 'custom', customEnd: val, endDate: val }));
                      }}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Invoices List */}
      <div className="page-section">
        {loading || settingsLoading ? (
          <TableSkeleton cols={4} rows={PAGE_SIZE} />
        ) : displayedInvoices.length === 0 && !loading && debouncedSearchTerm === '' && statusFilter === 'All' && !dateRange.startDate ? (
          <EmptyState
            title={t('invoicesEmptyTitle')}
            message={t('invoicesEmptyMessage')}
            action={
              canWrite
                ? { text: t('invoicesNew'), onClick: () => navigate(getRoutePath('invoiceForm')) }
                : undefined
            }
          />
        ) : displayedInvoices.length > 0 ? (
          <div className="list-container">
            {displayedInvoices.map((invoice) => {
              const status = getStatusText(invoice.status);
              const statusColors = {
                success: 'badge-success',
                warning: 'badge-warning',
                muted: 'badge-info',
              };

              return (
                <Link key={invoice.id} to={`/app/invoices/${invoice.id}`} className="list-row">
                  {/* Left: Title + Date */}
                  <div className="list-row-left">
                    <div className="list-row-title">{invoice.customerName || t('commonCustomer')}</div>
                    <div className="list-row-subtitle">
                      {invoice.invoiceNumber} · {new Date(invoice.date).toLocaleDateString('ar-EG')}
                    </div>
                  </div>

                  {/* Right: Amount + Status + Menu */}
                  <div className="list-row-right">
                    <div className="list-row-amount">{formatMoney(invoice.total)}</div>
                    <div className={`list-row-status ${statusColors[status.tone as keyof typeof statusColors] || ''}`}>
                      {status.label}
                    </div>
                    {canWrite && (
                      <ActionMenu
                        items={[
                          {
                            id: 'view',
                            label: t('commonView'),
                            icon: <EyeIcon className="h-4 w-4" />,
                            onClick: () => navigate(`/app/invoices/${invoice.id}`),
                          },
                          {
                            id: 'edit',
                            label: t('commonEdit'),
                            icon: <PencilIcon className="h-4 w-4" />,
                            onClick: () => navigate(`/app/invoices/edit/${invoice.id}`),
                          },
                          {
                            id: 'duplicate',
                            label: t('commonDuplicate'),
                            icon: <DocumentDuplicateIcon className="h-4 w-4" />,
                            onClick: () => handleDuplicateInvoice(invoice.id),
                          },
                          {
                            id: 'delete',
                            label: t('commonDelete'),
                            icon: <TrashIcon className="h-4 w-4" />,
                            onClick: () => handleDelete(invoice.id),
                            variant: 'danger',
                          },
                        ]}
                      />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10">{t('invoicesNoResults')}</div>
        )}
      </div>

      {/* Pagination */}
      {displayedInvoices.length > 0 && (
        <div className="page-section flex justify-center gap-3">
          <Button
            onClick={handlePrevPage}
            disabled={prevCursors.length === 0}
            variant="secondary"
            size="sm"
          >
            {t('commonPrev')}
          </Button>
          <Button
            onClick={handleNextPage}
            disabled={isLastPage}
            variant="secondary"
            size="sm"
          >
            {t('commonNext')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;

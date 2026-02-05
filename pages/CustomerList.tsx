import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCustomers } from '../services/dataService';
import { Customer, UserRole } from '../types';
import { UsersIcon } from '@heroicons/react/24/outline';
import PaymentForm from './PaymentForm';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Card } from '../src/ui/Card';
import { Button } from '../src/ui/Button';
import { Input } from '../src/ui/Input';
import { Select } from '../src/ui/Select';
import { Modal } from '../components/ui/Modal';
import { mapFirestoreError } from '../services/firebaseErrors';
import { t } from '../src/i18n/t';

const PAGE_SIZE = 15;

const CustomerList: React.FC = () => {
  const { companyId, role } = useAuth();
  const canCreatePayments =
    role === UserRole.Owner ||
    role === UserRole.Manager ||
    role === UserRole.Employee;
  const canWriteCustomers = useCanWrite('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [nextCursor, setNextCursor] = useState<unknown | null>(null);
  const [prevCursors, setPrevCursors] = useState<unknown[]>([]);
  const [isLastPage, setIsLastPage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'recent'>('name_asc');
  const [showFilters, setShowFilters] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const fetchData = useCallback(
    async (cursor?: unknown, direction: 'next' | 'prev' = 'next') => {
      if (!companyId) return;
      setLoading(true);
      try {
        const result = await getCustomers(companyId, {
          limit: PAGE_SIZE,
          startAfter: cursor as any,
        });

        setCustomers(result.data);
        setNextCursor(result.nextCursor);
        setIsLastPage(!result.nextCursor || result.data.length < PAGE_SIZE);

        if (direction === 'next') {
          if (cursor) setPrevCursors((prev) => [...prev, cursor]);
        } else {
          setPrevCursors((prev) => prev.slice(0, prev.length - 1));
        }
      } catch (error: unknown) {
        addNotification(mapFirestoreError(error), 'error');
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    },
    [companyId, addNotification]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNextPage = () => {
    if (nextCursor) fetchData(nextCursor, 'next');
  };
  const handlePrevPage = () => {
    if (prevCursors.length > 0) {
      fetchData(prevCursors[prevCursors.length - 2], 'prev');
    } else {
      fetchData(undefined, 'prev');
    }
  };

  const filteredCustomers = useMemo(() => {
    let list = customers.filter((c) => showInactive || c.isActive);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.mobilePhone || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q)
      );
    }
    if (sortBy === 'name_asc')
      list = list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
    if (sortBy === 'name_desc')
      list = list.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'ar'));
    if (sortBy === 'recent')
      list = list.sort(
        (a, b) =>
          (b.createdAt ? Date.parse(String(b.createdAt)) : 0) -
          (a.createdAt ? Date.parse(String(a.createdAt)) : 0)
      );
    return list;
  }, [customers, showInactive, searchTerm, sortBy]);

  const handleOpenPaymentModal = (customer: Customer) => {
    if (!canCreatePayments) {
      addNotification(t('customersNoPaymentPermission'), 'error');
      return;
    }
    setSelectedCustomer(customer);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSaved = () => {
    setIsPaymentModalOpen(false);
    setSelectedCustomer(null);
    fetchData(prevCursors[prevCursors.length - 1] || undefined);
  };

  if (loading) return <TableSkeleton cols={4} rows={PAGE_SIZE} />;

  if (customers.length === 0 && !loading) {
    return (
      <EmptyState
        icon={<UsersIcon className="h-8 w-8" />}
        title={t('customersEmptyTitle')}
        message={t('customersEmptyMessage')}
        action={
          canWriteCustomers
            ? { text: t('customersAdd'), onClick: () => navigate('/app/customers/new') }
            : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-section">
        <div className="ui-section-header">
          <div className="ui-section-text">
            <h1 className="ui-section-title">{t('customersTitle') || 'العملاء'}</h1>
            <p className="ui-section-subtitle">{t('customersSubtitle') || 'إدر قائمة عملائك'}</p>
          </div>
          {canWriteCustomers && (
            <Link to="/app/customers/new" className="ui-button primary">
              {t('customersAdd') || 'إضافة عميل'}
            </Link>
          )}
        </div>
      </div>

      <Card>
        <div className="list-toolbar">
          <Input
            placeholder={t('customersSearch')}
            className="list-search"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="list-toolbar-actions">
            <Button type="button" variant="secondary" onClick={() => setShowFilters((s) => !s)}>
              {t('commonFilter')}
            </Button>
            {canWriteCustomers && (
              <Link to="/app/customers/new" className="ui-button primary">
                {t('customersAdd')}
              </Link>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="filter-panel">
            <Select
              label={t('invoicesSort')}
              value={sortBy}
              onChange={(e) => {
                const v = e.target.value as 'name_asc' | 'name_desc' | 'recent';
                setSortBy(v);
              }}
              options={[
                { value: 'name_asc', label: t('sortNameAsc') },
                { value: 'name_desc', label: t('sortNameDesc') },
                { value: 'recent', label: t('invoicesNewest') },
              ]}
            />
            <Select
              label={t('invoicesStatus')}
              value={showInactive ? 'all' : 'active'}
              onChange={(e) => setShowInactive(e.target.value === 'all')}
              options={[
                { value: 'active', label: t('customersActiveOnly') },
                { value: 'all', label: t('customersAll') },
              ]}
            />
          </div>
        )}

        <div className="invoice-list">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="invoice-row group hover:shadow-lg transition-all">
              <Link to={`/app/customers/${customer.id}`} className="invoice-main flex-1">
                <div className="flex flex-col gap-1">
                  <div className="invoice-title font-semibold text-lg">{customer.name}</div>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">📱 {customer.mobilePhone || '-'}</span>
                    {customer.email && <span className="flex items-center gap-1">✉️ {customer.email}</span>}
                    {customer.address && <span className="flex items-center gap-1">📍 {customer.address.substring(0, 30)}</span>}
                  </div>
                </div>
              </Link>
              <div className="invoice-side flex items-center gap-4">
                <div className={`invoice-status badge ${customer.isActive ? 'badge--success' : 'badge--muted'}`}>
                  {customer.isActive ? '✓ ' + t('customersActive') : '✕ ' + t('customersInactive')}
                </div>
              </div>
              <div className="invoice-menu relative">
                <button
                  type="button"
                  className="menu-button hover:bg-primary-100 p-2 rounded-lg transition-colors"
                  onClick={() =>
                    setActiveMenuId((prev) => (prev === customer.id ? null : customer.id))
                  }
                  aria-label={t('commonActionsMenu')}
                >
                  ⋯
                </button>
                {activeMenuId === customer.id && (
                  <div className="menu-panel absolute top-full left-0 z-10 bg-white rounded-lg shadow-lg border border-gray-200">
                    <Link to={`/app/customers/${customer.id}`} className="menu-item hover:bg-gray-50 px-4 py-2 block">
                      👁️ {t('commonView')}
                    </Link>
                    {canWriteCustomers && (
                      <Link to={`/app/customers/edit/${customer.id}`} className="menu-item hover:bg-gray-50 px-4 py-2 block">
                        ✏️ {t('commonEdit')}
                      </Link>
                    )}
                    {canCreatePayments && (
                      <button
                        type="button"
                        className="menu-item hover:bg-gray-50 px-4 py-2 w-full text-left"
                        onClick={() => handleOpenPaymentModal(customer)}
                      >
                        💳 {t('customersPayment')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="pagination-row">
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

        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title={`${t('customersPayment')} - ${selectedCustomer?.name}`}
        >
          {selectedCustomer && (
            <PaymentForm
              customer={selectedCustomer}
              onPaymentSaved={handlePaymentSaved}
              onClose={() => setIsPaymentModalOpen(false)}
            />
          )}
        </Modal>
      </Card>
    </div>
  );
};

export default CustomerList;


import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCustomers } from '../services/dataService';
import { Customer } from '../types';
import { PlusIcon, EyeIcon, WalletIcon, UsersIcon, PencilIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import PaymentForm from './PaymentForm';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { mapFirestoreError } from '../services/firebaseErrors';

const PAGE_SIZE = 15;

const CustomerCard: React.FC<{ customer: Customer, canWrite: boolean, onAddPayment: (customer: Customer) => void, onNavigate: (path: string) => void }> = ({ customer, canWrite, onAddPayment, onNavigate }) => (
    <Card padding="sm" className="md:hidden cursor-pointer" onClick={() => onNavigate(`/customers/${customer.id}`)}>
        <div className="flex justify-between items-start mb-2">
            <div>
                <h3 className="font-bold text-lg">{customer.name}</h3>
                <p className="text-sm text-gray-500">{customer.mobilePhone}</p>
            </div>
            <Badge variant={customer.isActive ? 'success' : 'default'}>{customer.isActive ? 'نشط' : 'غير نشط'}</Badge>
        </div>
        <div className="flex gap-2 mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
            {canWrite && (
                <Button variant="secondary" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); onAddPayment(customer); }}>
                    <WalletIcon className="h-4 w-4 me-2" />
                    إضافة دفعة
                </Button>
            )}
             <Link to={`/customers/edit/${customer.id}`} className="w-full" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="w-full">
                    <PencilIcon className="h-4 w-4 me-2" />
                    تعديل
                </Button>
            </Link>
        </div>
    </Card>
);

const CustomerList: React.FC = () => {
  const { activeCompanyId } = useAuth();
  const canWrite = useCanWrite('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [nextCursor, setNextCursor] = useState<any | null>(null);
  const [prevCursors, setPrevCursors] = useState<any[]>([]);
  const [isLastPage, setIsLastPage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'recent'>('name_asc');
  
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const fetchData = useCallback(async (cursor?: any, direction: 'next' | 'prev' = 'next') => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
        const result = await getCustomers(activeCompanyId, {
            limit: PAGE_SIZE,
            startAfter: cursor,
        });
        
        setCustomers(result.data);
        setNextCursor(result.nextCursor);
        setIsLastPage(!result.nextCursor || result.data.length < PAGE_SIZE);

        if (direction === 'next') {
            if (cursor) setPrevCursors(prev => [...prev, cursor]);
        } else {
            setPrevCursors(prev => prev.slice(0, prev.length - 1));
        }
    } catch (error: any) {
        addNotification(mapFirestoreError(error), "error");
        setCustomers([]);
    } finally {
        setLoading(false);
    }
  }, [activeCompanyId, addNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNextPage = () => { if (nextCursor) fetchData(nextCursor, 'next'); };
  const handlePrevPage = () => {
    if (prevCursors.length > 0) {
      fetchData(prevCursors[prevCursors.length - 2], 'prev');
    } else {
      fetchData(undefined, 'prev');
    }
  };

  const filteredCustomers = useMemo(() => {
    let list = customers.filter(c => showInactive || c.isActive);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(c => (c.name || '').toLowerCase().includes(q) || (c.mobilePhone || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q));
    }
    if (sortBy === 'name_asc') list = list.sort((a,b) => (a.name||'').localeCompare(b.name||'', 'ar'));
    if (sortBy === 'name_desc') list = list.sort((a,b) => (b.name||'').localeCompare(a.name||'', 'ar'));
    if (sortBy === 'recent') list = list.sort((a,b) => (b.createdAt? Date.parse(b.createdAt as any) : 0) - (a.createdAt? Date.parse(a.createdAt as any) : 0));
    return list;
  }, [customers, showInactive, searchTerm, sortBy]);

  const handleOpenPaymentModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSaved = () => {
    setIsPaymentModalOpen(false);
    setSelectedCustomer(null);
    fetchData(prevCursors[prevCursors.length - 1] || undefined);
  };

  if (loading) return <TableSkeleton cols={6} rows={PAGE_SIZE} />;

  if (customers.length === 0 && !loading) {
    return (
      <EmptyState
        icon={<UsersIcon className="h-8 w-8" />}
        title="لا يوجد عملاء بعد"
        message="ابدأ بإضافة عميلك الأول لتتمكن من إنشاء فواتير له."
        action={canWrite ? { text: 'إضافة عميل', onClick: () => navigate('/customers/new') } : undefined}
      />
    );
  }

  return (
    <Card>
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Input placeholder="ابحث عن عميل..." className="w-full md:w-64" onChange={e => setSearchTerm(e.target.value)} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={() => setShowInactive(!showInactive)}
              className="form-checkbox h-5 w-5 text-primary-600 rounded"
            />
            <span className="text-sm">إظهار العملاء غير النشطين</span>
          </label>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-2 border rounded-md bg-white dark:bg-gray-700">
            <option value="name_asc">الاسم (أ-ي)</option>
            <option value="name_desc">الاسم (ي-أ)</option>
            <option value="recent">الأحدث</option>
          </select>
          {canWrite && (
            <Link to="/customers/new" className="w-full md:w-auto">
                <Button variant="primary" className="w-full">
                    <PlusIcon className="h-5 w-5 me-2" />
                    إضافة عميل
                </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الاسم</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الهاتف</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الحالة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">إجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredCustomers.map(customer => (
              <tr key={customer.id} onClick={() => navigate(`/customers/${customer.id}`)} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 cursor-pointer">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{customer.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{customer.mobilePhone}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant={customer.isActive ? 'success' : 'default'}>{customer.isActive ? 'نشط' : 'غير نشط'}</Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/customers/${customer.id}`); }} aria-label="عرض التفاصيل"><EyeIcon className="h-5 w-5" /></Button>
                        {canWrite && (
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(customer); }} aria-label="إضافة دفعة">
                                <WalletIcon className="h-5 w-5" />
                            </Button>
                        )}
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-4 mt-4">
        {filteredCustomers.map(customer => (
            <CustomerCard key={customer.id} customer={customer} canWrite={canWrite} onAddPayment={handleOpenPaymentModal} onNavigate={navigate} />
        ))}
      </div>

       <div className="flex justify-center items-center mt-6 gap-2">
          <Button onClick={handlePrevPage} disabled={prevCursors.length === 0} variant="secondary" size="sm" aria-label="Previous Page">
              <ChevronRightIcon className="h-5 w-5" />
          </Button>
          <Button onClick={handleNextPage} disabled={isLastPage} variant="secondary" size="sm" aria-label="Next Page">
              <ChevronLeftIcon className="h-5 w-5" />
          </Button>
      </div>

      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={`إضافة دفعة لـ ${selectedCustomer?.name}`}>
        {selectedCustomer && (
            <PaymentForm
                customer={selectedCustomer}
                onPaymentSaved={handlePaymentSaved}
                onClose={() => setIsPaymentModalOpen(false)}
            />
        )}
      </Modal>
    </Card>
  );
};

export default CustomerList;

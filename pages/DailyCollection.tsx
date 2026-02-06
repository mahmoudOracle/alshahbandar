import React, { useEffect, useState, useMemo } from 'react';
import { PlusIcon, TrashIcon, BanknotesIcon, WalletIcon } from '@heroicons/react/24/outline';
import { getReceiptsByDateRange, deleteReceipt, createReceipt } from '../services/receiptsService';
import { getCustomers } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { mapFirestoreError } from '../services/firebaseErrors';
import { Receipt, Customer } from '../types';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { Input } from '../src/ui/Input';
import { Select } from '../src/ui/Select';
import { SectionHeader } from '../src/ui/SectionHeader';
import { ListRow } from '../src/ui/ListRow';
import { ActionMenu } from '../src/ui/ActionMenu';
import { Modal } from '../components/ui/Modal';
import { t } from '../src/i18n/t';
import { getTodayISO, formatDate, formatDateTime } from '../src/utils/date';

const toIsoDate = (date: Date | string) => {
  if (typeof date === 'string') return date;
  // Use local date components instead of toISOString() to preserve local timezone
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const methodLabel = (method: string): string => {
  const methodMap: Record<string, string> = {
    cash: t('paymentMethodCash'),
    wallet: t('paymentMethodWallet'),
    instapay: t('paymentMethodInstapay'),
    transfer: t('paymentMethodTransfer'),
    check: t('paymentMethodCheck'),
    other: t('paymentMethodOther'),
  };
  return methodMap[method] || method;
};

const DailyCollection: React.FC = () => {
  const { companyId, user } = useAuth();
  const { addNotification } = useNotification();

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');

  // Data state
  const [date, setDate] = useState(toIsoDate(new Date()));
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);

  // Load customers once
  useEffect(() => {
    const loadCustomers = async () => {
      if (!companyId) return;
      setLoadingCustomers(true);
      try {
        const data = await getCustomers(companyId);
        setCustomers(Array.isArray(data) ? data : data?.data || []);
      } catch (error) {
        addNotification(mapFirestoreError(error), 'error');
      } finally {
        setLoadingCustomers(false);
      }
    };
    loadCustomers();
  }, [companyId, addNotification]);

  // Load receipts for selected date
  const fetchReceipts = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await getReceiptsByDateRange(companyId, date, date);
      setReceipts(data || []);
    } catch (error) {
      addNotification(mapFirestoreError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [date, companyId]);

  // Handle save receipt
  const handleSaveReceipt = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId || !amount) {
      addNotification(t('dailyCollectionValidationRequired'), 'warning');
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      addNotification(t('dailyCollectionValidationAmount'), 'warning');
      return;
    }

    const selectedCustomer = customers.find((c) => c.id === customerId);
    if (!selectedCustomer) {
      addNotification(t('dailyCollectionValidationCustomer'), 'warning');
      return;
    }

    if (!companyId) return;

    setSavingReceipt(true);
    try {
      await createReceipt(
        companyId,
        customerId,
        selectedCustomer.name,
        amountNum,
        method,
        date,
        note || undefined,
        undefined,
        undefined,
        user?.email
      );

      addNotification(t('dailyCollectionSaved'), 'success');
      setCustomerId('');
      setAmount('');
      setMethod('cash');
      setNote('');
      await fetchReceipts();
    } catch (error) {
      addNotification(mapFirestoreError(error), 'error');
    } finally {
      setSavingReceipt(false);
    }
  };

  // Handle delete receipt
  const handleDeleteReceipt = async (receiptId: string) => {
    if (!companyId) return;
    try {
      await deleteReceipt(companyId, receiptId);
      addNotification(t('dailyCollectionDeleted'), 'success');
      setDeleteModal(null);
      await fetchReceipts();
    } catch (error) {
      addNotification(mapFirestoreError(error), 'error');
    }
  };

  // Summary calculations
  const summary = useMemo(() => {
    const byMethod = receipts.reduce(
      (acc, r) => {
        acc[r.method] = (acc[r.method] || 0) + r.amount;
        return acc;
      },
      {} as Record<string, number>
    );

    const total = Object.values(byMethod).reduce((sum, v) => sum + v, 0);
    const uniqueCustomers = new Set(receipts.map((r) => r.customerId)).size;

    return { byMethod, total, uniqueCustomers };
  }, [receipts]);

  // Payment method options
  const paymentMethods = [
    { value: 'cash', label: t('paymentMethodCash') },
    { value: 'wallet', label: t('paymentMethodWallet') },
    { value: 'instapay', label: t('paymentMethodInstapay') },
    { value: 'transfer', label: t('paymentMethodTransfer') },
    { value: 'check', label: t('paymentMethodCheck') },
  ];

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {t('dailyCollectionTitle')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('dailyCollectionSubtitle')}
          </p>
        </div>

        {/* SECTION A: QUICK ADD FORM */}
        <Card className="p-6 md:p-8">
          <SectionHeader
            title={t('dailyCollectionFormTitle')}
            subtitle={t('dailyCollectionFormSubtitle')}
          />

          <form onSubmit={handleSaveReceipt} className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer */}
              <Select
                label={t('dailyCollectionFormCustomer')}
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                disabled={loadingCustomers}
                options={customerOptions}
                required
              />

              {/* Amount */}
              <Input
                label={t('dailyCollectionFormAmount')}
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />

              {/* Payment Method */}
              <Select
                label={t('dailyCollectionFormMethod')}
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                options={paymentMethods}
              />

              {/* Date */}
              <Input
                label={t('dailyCollectionFormDate')}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Note */}
            <Input
              label={t('dailyCollectionFormNote')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('dailyCollectionFormNotePlaceholder')}
            />

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="submit" disabled={savingReceipt || loadingCustomers} size="lg">
                <PlusIcon className="h-5 w-5 me-2" />
                {savingReceipt ? t('commonLoading') : t('dailyCollectionNewPayment')}
              </Button>
            </div>
          </form>
        </Card>

        {/* SECTION C: SUMMARY KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {t('dailyCollectionTotal')}
            </p>
            <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
              {summary.total.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-2">EGP</p>
          </Card>

          {['cash', 'wallet', 'instapay'].map((method) => (
            <Card key={method} className="p-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {methodLabel(method)}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(summary.byMethod[method] || 0).toFixed(2)}
              </p>
            </Card>
          ))}

          <Card className="p-6 text-center bg-blue-50 dark:bg-blue-900/20">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {t('dailyCollectionCustomers')}
            </p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {summary.uniqueCustomers}
            </p>
          </Card>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const d = new Date(date);
              d.setDate(d.getDate() - 1);
              setDate(toIsoDate(d));
            }}
          >
            {t('commonPrev')}
          </Button>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm font-medium"
          />

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const d = new Date(date);
              d.setDate(d.getDate() + 1);
              setDate(toIsoDate(d));
            }}
          >
            {t('commonNext')}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDate(toIsoDate(new Date()))}
          >
            {t('dailyCollectionToday')}
          </Button>
        </div>

        {/* SECTION B: TODAY'S COLLECTIONS LIST */}
        <SectionHeader
          title={t('dailyCollectionListTitle')}
          subtitle={new Date(date).toLocaleDateString('ar-EG')}
        />

        {loading ? (
          <Card className="p-8 text-center text-gray-500">
            {t('commonLoading')}
          </Card>
        ) : receipts.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              {t('dailyCollectionEmpty')}
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {receipts.map((receipt) => {
                const customer = customers.find((c) => c.id === receipt.customerId);
                return (
                  <div
                    key={receipt.id}
                    className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {receipt.customerName}
                        </p>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {methodLabel(receipt.method)}
                        </span>
                      </div>
                      {receipt.note && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {receipt.note}
                        </p>
                      )}
                      {receipt.invoiceNumber && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Invoice #{receipt.invoiceNumber}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900 dark:text-white">
                          {receipt.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {formatDate(receipt.date, 'ar')}
                        </p>
                      </div>

                      <ActionMenu
                        items={[
                          {
                            id: 'delete',
                            label: t('commonDelete'),
                            icon: <TrashIcon className="h-4 w-4" />,
                            variant: 'danger',
                            onClick: () => setDeleteModal(receipt.id),
                          },
                        ]}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={!!deleteModal}
          onClose={() => setDeleteModal(null)}
          title={t('dailyCollectionDeleteTitle')}
        >
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('dailyCollectionDeleteConfirm')}
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>
              {t('commonCancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteModal) handleDeleteReceipt(deleteModal);
              }}
            >
              {t('commonDelete')}
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default DailyCollection;

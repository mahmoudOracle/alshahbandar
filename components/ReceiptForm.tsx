import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { getCustomers } from '../services/dataService';
import { createReceipt } from '../services/receiptsService';
import { mapFirestoreError } from '../services/firebaseErrors';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { t } from '../src/i18n/t';
import { getTodayISO } from '../src/utils/date';
import { Customer } from '../types';

interface ReceiptFormProps {
  defaultDate?: string;
  onClose: () => void;
  onReceiptSaved: () => void;
}

export const ReceiptForm: React.FC<ReceiptFormProps> = ({
  defaultDate = getTodayISO(),
  onClose,
  onReceiptSaved,
}) => {
  const { companyId } = useAuth();
  const { addNotification } = useNotification();

  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [date, setDate] = useState(defaultDate);
  const [note, setNote] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadCustomers = async () => {
      if (!companyId) return;
      setLoading(true);
      try {
        const data = await getCustomers(companyId);
        setCustomers(Array.isArray(data) ? data : data?.data || []);
      } catch (error) {
        addNotification(mapFirestoreError(error), 'error');
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, [companyId, addNotification]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyId || !customerId || !amount || !method || !date) {
      addNotification(t('receiptFormValidationError'), 'warning');
      return;
    }

    const selectedCustomer = customers.find((c) => c.id === customerId);
    if (!selectedCustomer) {
      addNotification(t('receiptFormCustomerNotFound'), 'error');
      return;
    }

    setSaving(true);
    try {
      await createReceipt(
        companyId,
        customerId,
        selectedCustomer.name,
        parseFloat(amount),
        method,
        date,
        note
      );

      addNotification(t('receiptSaved'), 'success');
      onReceiptSaved();
    } catch (error) {
      addNotification(mapFirestoreError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const paymentMethods = [
    { value: 'cash', label: t('paymentMethodCash') },
    { value: 'transfer', label: t('paymentMethodTransfer') },
    { value: 'check', label: t('paymentMethodCheck') },
    { value: 'wallet', label: t('paymentMethodWallet') },
    { value: 'other', label: t('paymentMethodOther') },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Customer */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          {t('receiptFormCustomer')} *
        </label>
        <Select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          options={customers.map((c) => ({
            value: c.id,
            label: c.name,
          }))}
          disabled={loading}
          className="w-full"
        />
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          {t('receiptFormAmount')} *
        </label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>

      {/* Payment Method */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          {t('receiptFormMethod')} *
        </label>
        <Select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          options={paymentMethods}
        />
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          {t('receiptFormDate')} *
        </label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      {/* Note */}
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          {t('receiptFormNote')}
        </label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('receiptFormNotePlaceholder')}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('commonCancel')}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? t('commonSaving') : t('commonSave')}
        </Button>
      </div>
    </form>
  );
};

export default ReceiptForm;

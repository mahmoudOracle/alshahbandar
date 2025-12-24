
import React, { useState, useEffect } from 'react';
import { Customer, Invoice, Payment, InvoiceStatus } from '../types';
import { getInvoices, savePayment } from '../services/dataService';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import DateInput from '../components/ui/DateInput';
import { Select } from '../components/ui/Select';
import { mapFirestoreError } from '../services/firebaseErrors';

interface PaymentFormProps {
  customer: Customer;
  onPaymentSaved: () => void;
  onClose: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ customer, onPaymentSaved, onClose }) => {
  const { activeCompanyId } = useAuth();
  const canWrite = useCanWrite('payments');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceId, setInvoiceId] = useState('');
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [saving, setSaving] = useState(false);
  const { addNotification } = useNotification();

  useEffect(() => {
    if (customer && activeCompanyId) {
      getInvoices(activeCompanyId, { filters: [['customerId', '==', customer.id]] }).then(result => {
        const customerUnpaidInvoices = result.data.filter(
          inv => inv.status === InvoiceStatus.Due
        ) || [];
        setUnpaidInvoices(customerUnpaidInvoices);
      }).catch(error => {
        addNotification(mapFirestoreError(error), 'error');
      });
      setAmount(0);
      setDate(new Date().toISOString().split('T')[0]);
      setInvoiceId('');
    }
  }, [customer, activeCompanyId, addNotification]);

  if (!customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
        addNotification('صلاحية غير كافية.', 'error');
        return;
    }
    if (amount <= 0 || !activeCompanyId) return;
    setSaving(true);
    console.log('🟢 [PAYMENT] Saving payment', { companyId: activeCompanyId, customerId: customer.id, amount, invoiceId });
    try {
      const result = await savePayment(activeCompanyId, {
        customerId: customer.id,
        amount: Number(amount),
        date,
        invoiceId: invoiceId || '',
      });

      if (result) {
        console.log('🟢 [PAYMENT] Payment saved', result);
        addNotification('تم حفظ الدفعة بنجاح!', 'success');
        onPaymentSaved();
      } else {
        console.warn('🟡 [PAYMENT] savePayment returned falsy', result);
        addNotification('فشل حفظ الدفعة.', 'error');
      }
    } catch (error: any) {
      console.error('🔴 [PAYMENT] savePayment error', error);
      addNotification(mapFirestoreError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="المبلغ"
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        required
        min="0.01"
        step="0.01"
      />
      <DateInput label="تاريخ الدفع" name="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      <Select
        label="ربط بفاتورة (اختياري)"
        value={invoiceId}
        onChange={(e) => setInvoiceId(e.target.value)}
        options={[
            { value: '', label: 'دفعة عامة' },
            ...unpaidInvoices.map(inv => ({
                value: inv.id,
                label: `${inv.invoiceNumber} - (${inv.total.toFixed(2)} ${inv.status})`
            }))
        ]}
      />
      <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onClose}>
          إلغاء
        </Button>
        <Button type="submit" loading={saving} disabled={saving || !canWrite || amount <= 0} title={!canWrite ? 'صلاحية غير كافية' : ''}>
          حفظ الدفعة
        </Button>
      </div>
    </form>
  );
};

export default PaymentForm;

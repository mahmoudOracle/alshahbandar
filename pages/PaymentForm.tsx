import React, { useEffect, useMemo, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Customer, Invoice, PaymentMethod, UserRole } from '../types';
import { getInvoices, savePayment, totalPaidForInvoice } from '../services/dataService';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import DateInput from '../components/ui/DateInput';
import { Select } from '../components/ui/Select';
import { mapFirestoreError } from '../services/firebaseErrors';
import { t } from '../src/i18n/t';

interface PaymentFormProps {
  customer: Customer;
  invoice?: Invoice | null;
  onPaymentSaved: () => void;
  onClose: () => void;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'wallet',
  'instapay',
  'bank_transfer',
  'other',
];

const getPaymentMethodLabel = (method: PaymentMethod | ''): string => {
  if (!method) return '';
  const methodMap: Record<PaymentMethod, string> = {
    'cash': t('paymentMethodCash'),
    'wallet': t('paymentMethodWallet'),
    'instapay': t('paymentMethodInstapay'),
    'bank_transfer': t('paymentMethodBank'),
    'other': t('paymentMethodOther'),
  };
  return methodMap[method] || '';
};

const toDateValue = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const maybe = value as { toDate?: () => Date };
  if (typeof maybe.toDate === 'function') return maybe.toDate();
  return null;
};

const PaymentForm: React.FC<PaymentFormProps> = ({ customer, invoice, onPaymentSaved, onClose }) => {
  const { companyId, role } = useAuth();
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceId, setInvoiceId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [saving, setSaving] = useState(false);
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [notes, setNotes] = useState('');
  const [reference, setReference] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { addNotification } = useNotification();

  const canCreatePayments =
    role === UserRole.Owner || role === UserRole.Manager || role === UserRole.Employee;

  useEffect(() => {
    if (!customer || !companyId) return;
    getInvoices(companyId, { filters: [['customerId', '==', customer.id]] })
      .then((result) => {
        const due = result.data.filter((inv) => inv.status === 'Due') || [];
        setUnpaidInvoices(due);
      })
      .catch((error) => {
        addNotification(mapFirestoreError(error), 'error');
      });
  }, [customer, companyId, addNotification]);

  useEffect(() => {
    if (!customer) return;
    setAmount(0);
    setDate(new Date().toISOString().split('T')[0]);
    setMethod('');
    setNotes('');
    setReference('');
    setRemaining(null);
    setFormError(null);
    if (invoice) {
      setInvoiceId(invoice.id);
      setInvoiceNumber(invoice.invoiceNumber);
    } else {
      setInvoiceId('');
      setInvoiceNumber('');
    }
  }, [customer, invoice]);

  useEffect(() => {
    const loadRemaining = async () => {
      if (!companyId || !invoiceId) {
        setRemaining(null);
        return;
      }
      try {
        const inv =
          invoice && invoice.id === invoiceId
            ? invoice
            : unpaidInvoices.find((i) => i.id === invoiceId);
        const total = Number(inv?.total || 0);
        const paid = await totalPaidForInvoice(companyId, invoiceId);
        const due = Math.max(0, total - paid);
        setRemaining(due);
        if (amount <= 0 || amount > due) {
          setAmount(due);
        }
      } catch {
        setRemaining(null);
      }
    };
    void loadRemaining();
  }, [companyId, invoiceId, invoice, unpaidInvoices]);

  const selectedInvoice = useMemo(
    () => unpaidInvoices.find((inv) => inv.id === invoiceId) || invoice || null,
    [unpaidInvoices, invoiceId, invoice]
  );

  const invoiceOptions = useMemo(() => {
    const base = unpaidInvoices.map((inv) => ({
      value: inv.id,
      label: `${inv.invoiceNumber} - ${toDateValue(inv.date)?.toLocaleDateString('ar-EG') || ''}`,
    }));
    if (invoice && !base.find((opt) => opt.value === invoice.id)) {
      base.unshift({
        value: invoice.id,
        label: `${invoice.invoiceNumber} - ${toDateValue(invoice.date)?.toLocaleDateString('ar-EG') || ''}`,
      });
    }
    return base;
  }, [unpaidInvoices, invoice]);

  const remainingLabel =
    remaining !== null ? t('paymentRemainingLabel', { amount: remaining.toFixed(2) }) : '';

  if (!customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!canCreatePayments) {
      addNotification(t('paymentNoPermission'), 'error');
      return;
    }
    if (!method) {
      addNotification(t('paymentSelectMethod'), 'error');
      return;
    }
    if (!date) {
      addNotification(t('paymentEnterDate'), 'error');
      return;
    }
    if (amount <= 0 || !companyId) {
      addNotification(t('paymentEnterAmount'), 'error');
      return;
    }
    if (invoiceId && remaining !== null && amount > remaining) {
      setFormError(t('paymentAmountTooHigh'));
      return;
    }
    setSaving(true);
    try {
      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        setFormError(t('paymentInvalidDate'));
        setSaving(false);
        return;
      }
      const result = await savePayment(companyId, {
        customerId: customer.id,
        customerName: customer.name,
        invoiceId: invoiceId || undefined,
        invoiceNumber: invoiceNumber || selectedInvoice?.invoiceNumber || undefined,
        amount: Number(amount),
        method: method as PaymentMethod,
        date: Timestamp.fromDate(parsedDate),
        notes: notes || undefined,
        reference: reference || undefined,
      });

      if (result) {
        addNotification(t('paymentSaveSuccess'), 'success');
        onPaymentSaved();
      } else {
        addNotification(t('paymentSaveFail'), 'error');
      }
    } catch (error: unknown) {
      addNotification(mapFirestoreError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!canCreatePayments && (
        <div className="text-sm text-warning-700 bg-warning-50 border border-warning-200 rounded p-3">
          {t('paymentNoPermission')}
        </div>
      )}
      {formError && (
        <div className="text-sm text-danger-700 bg-danger-50 border border-danger-200 rounded p-3">
          {formError}
        </div>
      )}
      <Input
        label={t('paymentAmount')}
        type="number"
        value={amount}
        onChange={(e) => {
          const next = Number(e.target.value);
          setAmount(next);
          if (remaining !== null && next <= remaining) {
            setFormError(null);
          }
        }}
        required
        min="0.01"
        step="0.01"
        hint={remainingLabel || undefined}
      />
      <DateInput
        label={t('paymentDate')}
        name="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />
      <Select
        label={t('paymentMethod')}
        value={method}
        onChange={(e) => setMethod(e.target.value as PaymentMethod)}
        options={PAYMENT_METHODS.map((m) => ({ value: m, label: getPaymentMethodLabel(m) }))}
        required
      />
      <Select
        label={t('paymentInvoiceOptional')}
        value={invoiceId}
        onChange={(e) => {
          setInvoiceId(e.target.value);
          const inv =
            unpaidInvoices.find((i) => i.id === e.target.value) ||
            (invoice && invoice.id === e.target.value ? invoice : null);
          setInvoiceNumber(inv?.invoiceNumber || '');
        }}
        options={[
          { value: '', label: t('paymentOnAccount') },
          ...invoiceOptions,
        ]}
      />
      <Input
        label={t('paymentNotes')}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <Input
        label={t('paymentReference')}
        value={reference}
        onChange={(e) => setReference(e.target.value)}
      />
      <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('commonCancel')}
        </Button>
        <Button type="submit" loading={saving} disabled={saving || !canCreatePayments}>
          {t('paymentSave')}
        </Button>
      </div>
    </form>
  );
};

export default PaymentForm;

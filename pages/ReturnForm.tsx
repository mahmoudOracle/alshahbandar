import React, { useMemo, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Invoice } from '../types';
import { createReturnAtomic } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import DateInput from '../components/ui/DateInput';
import { Select } from '../components/ui/Select';
import { mapFirestoreError } from '../services/firebaseErrors';

interface ReturnFormProps {
  invoice: Invoice;
  onSaved: () => void;
  onClose: () => void;
}

type ReturnLine = {
  productId: string;
  nameSnapshot: string;
  unitPriceSnapshot: number;
  maxQty: number;
  qty: number;
};

const ReturnForm: React.FC<ReturnFormProps> = ({ invoice, onSaved, onClose }) => {
  const { activeCompanyId } = useAuth();
  const { addNotification } = useNotification();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'refund_cash' | 'credit_note'>('credit_note');
  const [saving, setSaving] = useState(false);

  const [lines, setLines] = useState<ReturnLine[]>(
    invoice.items.map((it) => ({
      productId: it.productId,
      nameSnapshot: it.productName,
      unitPriceSnapshot: Number(it.price || 0),
      maxQty: Number(it.quantity || 0),
      qty: 0,
    }))
  );

  const totalReturnAmount = useMemo(
    () => lines.reduce((sum, l) => sum + l.qty * l.unitPriceSnapshot, 0),
    [lines]
  );

  const updateQty = (index: number, qty: number) => {
    setLines((prev) =>
      prev.map((l, i) =>
        i === index ? { ...l, qty: Math.max(0, Math.min(l.maxQty, qty)) } : l
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId) return;
    const selected = lines.filter((l) => l.qty > 0);
    if (selected.length === 0) {
      addNotification('اختر كمية مرتجعة واحدة على الأقل.', 'error');
      return;
    }
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      addNotification('تاريخ المرتجع غير صالح.', 'error');
      return;
    }
    setSaving(true);
    try {
      await createReturnAtomic(activeCompanyId, {
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        items: selected.map((l) => ({
          productId: l.productId,
          nameSnapshot: l.nameSnapshot,
          quantity: l.qty,
          unitPriceSnapshot: l.unitPriceSnapshot,
          lineTotal: l.qty * l.unitPriceSnapshot,
        })),
        totalReturnAmount,
        date: Timestamp.fromDate(parsedDate),
        reason: reason || undefined,
        mode,
      });
      addNotification('تم تسجيل المرتجع بنجاح.', 'success');
      onSaved();
    } catch (err: unknown) {
      addNotification(mapFirestoreError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        {lines.map((line, idx) => (
          <div key={line.productId} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <div className="md:col-span-2">
              <div className="text-sm font-medium">{line.nameSnapshot}</div>
              <div className="text-xs text-gray-500">الحد الأقصى: {line.maxQty}</div>
            </div>
            <Input
              type="number"
              value={line.qty}
              min={0}
              max={line.maxQty}
              onChange={(e) => updateQty(idx, Number(e.target.value || 0))}
              label="الكمية المرتجعة"
            />
            <div className="text-sm text-gray-600">
              الإجمالي: {(line.qty * line.unitPriceSnapshot).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <DateInput label="تاريخ المرتجع" name="returnDate" value={date} onChange={(e) => setDate(e.target.value)} />
      <Select
        label="طريقة المعالجة"
        value={mode}
        onChange={(e) => setMode(e.target.value as 'refund_cash' | 'credit_note')}
        options={[
          { value: 'credit_note', label: 'إشعار دائن' },
          { value: 'refund_cash', label: 'رد نقدي' },
        ]}
      />
      <Input label="سبب المرتجع (اختياري)" value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="text-sm font-semibold">
        إجمالي المرتجع: {totalReturnAmount.toFixed(2)}
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          إلغاء
        </Button>
        <Button type="submit" loading={saving} disabled={saving}>
          حفظ المرتجع
        </Button>
      </div>
    </form>
  );
};

export default ReturnForm;

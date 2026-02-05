import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { t } from '../src/i18n/t';
import { getSuppliers, getProducts, createPurchase } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { mapFirestoreError } from '../services/firebaseErrors';

const PurchaseForm: React.FC = () => {
  const { companyId } = useAuth();
  const { addNotification } = useNotification();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<{ productId: string; quantity: number; unitPrice: number }[]>(
    []
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!companyId) return;
      try {
        const s = await getSuppliers(companyId);
        const p = await getProducts(companyId);
        setSuppliers((s as any).data || []);
        setProducts((p as any).data || []);
      } catch (err: unknown) {
        addNotification(mapFirestoreError(err), 'error');
      }
    };
    load();
  }, [companyId, addNotification]);

  const addRow = (productId?: string) =>
    setItems((prev) => [...prev, { productId: productId || '', quantity: 1, unitPrice: 0 }]);
  const updateRow = (
    idx: number,
    changes: Partial<{ productId: string; quantity: number; unitPrice: number }>
  ) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...changes } : it)));
  // delete helper reserved for future; currently unused

  const total = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!companyId) return addNotification(t('companyNotSpecified'), 'error');
    if (!supplierId) return addNotification('اختر موردًا', 'error');
    if (!items.length) return addNotification('أضف عنصرًا واحدًا على الأقل', 'error');

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productId) return addNotification(`اختر المنتج في الصف ${i + 1}`, 'error');
      if (!it.quantity || Number(it.quantity) <= 0)
        return addNotification(`الكمية غير صالحة في الصف ${i + 1}`, 'error');
      if (typeof it.unitPrice !== 'number' || Number(it.unitPrice) < 0)
        return addNotification(`سعر الوحدة غير صالح في الصف ${i + 1}`, 'error');
    }

    setSubmitting(true);
    try {
      const payload = {
        supplierId,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
        totalAmount: total,
      };
      await createPurchase(companyId, payload as any);
      addNotification('تم إنشاء أمر الشراء', 'success');
      setSupplierId('');
      setItems([]);
    } catch (err: unknown) {
      addNotification(mapFirestoreError(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <div className="mb-4 flex gap-2">
        <select
          aria-label="purchase-supplier-select"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">اختر موردًا</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.supplierName || s.name}
            </option>
          ))}
        </select>
        <Button onClick={() => addRow()}>أضف صف</Button>
      </div>

      {items.map((it, idx) => (
        <div key={idx} className="flex gap-2 mb-2">
          <select
            aria-label={`purchase-row-product-select-${idx}`}
            value={it.productId}
            onChange={(e) => updateRow(idx, { productId: e.target.value })}
            className="p-2 border rounded flex-1"
          >
            <option value="">اختر منتجًا</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Input
            aria-label={`purchase-row-quantity-${idx}`}
            type="number"
            value={it.quantity}
            onChange={(e) => updateRow(idx, { quantity: Number(e.target.value) })}
          />
          <Input
            aria-label={`purchase-row-unitPrice-${idx}`}
            type="number"
            value={it.unitPrice}
            onChange={(e) => updateRow(idx, { unitPrice: Number(e.target.value) })}
          />
        </div>
      ))}

      <div className="flex justify-between items-center mt-4">
        <div className="font-semibold">الإجمالي: {total.toFixed(2)}</div>
        <Button
          aria-label="create-purchase-submit"
          disabled={submitting || !supplierId || items.length === 0}
          onClick={handleSubmit}
          loading={submitting}
        >
          {submitting ? 'جارٍ الحفظ...' : 'إنشاء أمر الشراء'}
        </Button>
      </div>
    </Card>
  );
};

export default PurchaseForm;

import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { getSuppliers, getProducts, createPurchase } from '../services/dataService';

const PurchasesPage: React.FC = () => {
  const { activeCompanyId } = useAuth();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState<{ productId: string; productName?: string; quantity: number; unitPrice: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchLookups = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const s = await getSuppliers(activeCompanyId, { limit: 500 });
      setSuppliers(s.data || []);
      const p = await getProducts(activeCompanyId, { limit: 1000 });
      setProducts(p.data || []);
    } catch (err: any) {
      addNotification(err?.message || 'فشل تحميل البيانات', 'error');
      setSuppliers([]);
      setProducts([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchLookups(); }, [activeCompanyId]);

  const addRow = (product?: any) => setItems(prev => [...prev, { productId: product?.id || '', productName: product?.name || '', quantity: 1, unitPrice: product?.cost || 0 }]);
  const updateRow = (index: number, changes: any) => setItems(prev => prev.map((it,i)=>i===index?{...it,...changes}:it));
  const removeRow = (index: number) => setItems(prev => prev.filter((_,i)=>i!==index));

  const total = items.reduce((s, it) => s + (Number(it.quantity || 0) * Number(it.unitPrice || 0)), 0);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeCompanyId) return addNotification('الشركة غير محددة', 'error');
    if (!supplierId) return addNotification('اختر موردًا', 'error');
    if (!items || items.length===0) return addNotification('أضف عنصرًا واحدًا على الأقل', 'error');

    setSubmitting(true);
    try {
      const payload = { supplierId, invoiceNumber: invoiceNumber || undefined, items: items.map(it=>({ productId: it.productId, productName: it.productName, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) })), totalAmount: total };
      const res = await createPurchase(activeCompanyId, payload as any);
      addNotification('تم إنشاء أمر الشراء', 'success');
      setSupplierId(''); setInvoiceNumber(''); setItems([]);
    } catch (err: any) {
      addNotification(err?.message || 'فشل إنشاء أمر الشراء', 'error');
    } finally { setSubmitting(false); }
  };

  if (loading) return <TableSkeleton cols={4} rows={6} />;

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">أوامر الشراء</h2>
        <div className="flex gap-2">
          <select className="p-2 border rounded" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
            <option value="">اختر موردًا</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplierName}</option>)}
          </select>
          <Input placeholder="رقم الفاتورة (اختياري)" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
        </div>
      </div>

      <div className="mb-4">
        <div className="flex gap-2">
          <select className="p-2 border rounded flex-1" onChange={e => { const prod = products.find(p=>p.id===e.target.value); if (e.target.value) addRow(prod); }}>
            <option value="">أضف منتجًا</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name} - ({p.stock || 0})</option>)}
          </select>
          <Button onClick={() => addRow()}>أضف صف</Button>
        </div>
      </div>

      {items.length === 0 && <EmptyState title="لا يوجد عناصر" message="أضف منتجات إلى أمر الشراء." action={{ text: 'أضف عنصر', onClick: () => addRow() }} />}

      {items.length > 0 && (
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-2 text-right">المنتج</th>
              <th className="px-4 py-2 text-right">الكمية</th>
              <th className="px-4 py-2 text-right">سعر الوحدة</th>
              <th className="px-4 py-2 text-right">الإجمالي</th>
              <th className="px-4 py-2 text-right">إجراءات</th>
            </tr></thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <select className="w-full p-2 border rounded" value={it.productId} onChange={e => { const prod = products.find(p=>p.id===e.target.value); updateRow(idx, { productId: e.target.value, productName: prod?.name || '' }); }}>
                      <option value="">اختر منتجًا</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2"><Input type="number" min={1} value={it.quantity} onChange={e => updateRow(idx, { quantity: Number(e.target.value) })} /></td>
                  <td className="px-4 py-2"><Input type="number" min={0} value={it.unitPrice} onChange={e => updateRow(idx, { unitPrice: Number(e.target.value) })} /></td>
                  <td className="px-4 py-2">{(Number(it.quantity||0) * Number(it.unitPrice||0)).toFixed(2)}</td>
                  <td className="px-4 py-2"><Button variant="danger" size="sm" onClick={() => removeRow(idx)}>حذف</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="text-lg font-semibold">الإجمالي: {total.toFixed(2)}</div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setSupplierId(''); setInvoiceNumber(''); setItems([]); }}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={submitting}>{submitting ? 'جارٍ الحفظ...' : 'إنشاء أمر الشراء'}</Button>
        </div>
      </div>
    </Card>
  );
};

export default PurchasesPage;

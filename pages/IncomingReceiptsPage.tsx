import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import TableSkeleton from '../components/TableSkeleton';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { getSuppliers, getProducts, saveIncomingReceipt } from '../services/dataService';

const IncomingReceiptsPage: React.FC = () => {
  const { activeCompanyId, user } = useAuth();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | undefined>();
  const [items, setItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const fetch = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const supRes = await getSuppliers(activeCompanyId, { limit: 200 });
      setSuppliers(supRes.data || []);
      const prodRes = await getProducts(activeCompanyId, { limit: 500 });
      setProducts(prodRes.data || []);
    } catch (err: any) {
      addNotification(err?.message || 'Failed to load data', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [activeCompanyId]);

  const filteredProducts = useMemo(() => products.filter(p => (p.name || '').toLowerCase().includes(productSearch.toLowerCase())), [products, productSearch]);

  const addItem = (product?: any) => {
    setItems(prev => [...prev, { productId: product?.id || '', productName: product?.name || '', quantityReceived: 1, note: '' }]);
  };

  const updateItem = (index: number, changes: any) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, ...changes } : it));
  };

  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

  const submit = async () => {
    if (!activeCompanyId) return;
    if (!selectedSupplierId) return addNotification('Select supplier', 'error');
    if (!items || items.length === 0) return addNotification('Add at least one product', 'error');
    setSubmitting(true);
    try {
      const payload = {
        supplierId: selectedSupplierId,
        products: items.map(it => ({ productId: it.productId, productName: it.productName, quantityReceived: Number(it.quantityReceived), note: it.note })),
        receivedBy: user?.uid,
      };
      await saveIncomingReceipt(activeCompanyId, payload as any);
      addNotification('Receipt saved and stock updated', 'success');
      setSelectedSupplierId(undefined);
      setItems([]);
    } catch (err: any) {
      addNotification(err?.message || 'Failed to save receipt', 'error');
    } finally { setSubmitting(false); }
  };

  if (loading) return <TableSkeleton cols={4} rows={6} />;

  return (
    <Card>
      <h2 className="text-xl font-bold mb-4">تسجيل الواردات</h2>

      <div className="mb-4">
        <label className="block text-sm mb-1">المورد</label>
        <select className="w-full p-2 border rounded" value={selectedSupplierId || ''} onChange={e => setSelectedSupplierId(e.target.value || undefined)}>
          <option value="">اختر موردًا</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplierName}</option>)}
        </select>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Input placeholder="بحث عن المنتج..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
          <Button onClick={() => addItem()}>أضف صف فارغ</Button>
        </div>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <select className="w-full p-2 border rounded" value={it.productId} onChange={e => {
                  const prod = products.find(p => p.id === e.target.value);
                  updateItem(idx, { productId: e.target.value, productName: prod?.name || '' });
                }}>
                  <option value="">اختر منتجًا</option>
                  {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="col-span-3"><Input type="number" min={1} value={it.quantityReceived} onChange={e => updateItem(idx, { quantityReceived: Number(e.target.value) })} /></div>
              <div className="col-span-3"><Input placeholder="ملاحظة (اختياري)" value={it.note} onChange={e => updateItem(idx, { note: e.target.value })} /></div>
              <div className="col-span-1"><Button variant="danger" onClick={() => removeItem(idx)}>حذف</Button></div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={submit} disabled={submitting}>{submitting ? 'جارٍ الحفظ...' : 'حفظ السند'}</Button>
        <Button variant="secondary" onClick={() => { setItems([]); setSelectedSupplierId(undefined); }}>إلغاء</Button>
      </div>
    </Card>
  );
};

export default IncomingReceiptsPage;

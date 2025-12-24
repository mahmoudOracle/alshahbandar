import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { getSuppliers, saveSupplier, deleteSupplier, saveIncomingReceipt } from '../services/dataService';
import useProducts from '../hooks/useProducts';

const SuppliersPage: React.FC = () => {
  const { activeCompanyId } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptItems, setReceiptItems] = useState<any[]>([]);
  const { products, loading: productsLoading } = useProducts(activeCompanyId);
  const [submittingReceipt, setSubmittingReceipt] = useState(false);

  const fetch = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const res = await getSuppliers(activeCompanyId, { limit: 200 });
      setSuppliers(res.data || []);
    } catch (err: any) {
      addNotification(err?.message || 'Failed to load suppliers', 'error');
      setSuppliers([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [activeCompanyId]);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeCompanyId || !editing) return;
    setSaving(true);
    try {
      await saveSupplier(activeCompanyId, editing);
      addNotification('Supplier saved', 'success');
      setFormOpen(false);
      setEditing(null);
      await fetch();
    } catch (err: any) {
      addNotification(err?.message || 'Failed to save supplier', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!activeCompanyId) return;
    try {
      await deleteSupplier(activeCompanyId, id);
      addNotification('Supplier deleted', 'success');
      await fetch();
    } catch (err: any) {
      addNotification(err?.message || 'Failed to delete supplier', 'error');
    }
  };

  const openReceiptFor = (supplier: any) => {
    setEditing(supplier);
    setReceiptItems([]);
    setShowReceiptModal(true);
  };

  const addReceiptRow = (product?: any) => {
    setReceiptItems(prev => [...prev, { productId: product?.id || '', productName: product?.name || '', quantityReceived: 1, note: '' }]);
  };

  const updateReceiptRow = (index: number, changes: any) => setReceiptItems(prev => prev.map((it,i) => i===index?{...it,...changes}:it));

  const submitReceipt = async () => {
    if (!activeCompanyId || !editing) return addNotification('בחר ספק', 'error');
    if (!receiptItems || receiptItems.length===0) return addNotification('أضف منتجًا واحدًا على الأقل', 'error');
    setSubmittingReceipt(true);
    try {
      const idempotencyKey = (crypto && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : String(Date.now());
      const payload = { supplierId: editing.id, products: receiptItems.map((r:any)=>({ productId: r.productId, productName: r.productName, quantityReceived: Number(r.quantityReceived), note: r.note })), idempotencyKey };
      await saveIncomingReceipt(activeCompanyId, payload as any);
      addNotification('تم حفظ السند وتحديث المخزون', 'success');
      setShowReceiptModal(false);
      setReceiptItems([]);
      await fetch();
    } catch (err: any) {
      if (err?.code === 'duplicate-receipt') addNotification('تم إرسال هذا السند من قبل', 'error');
      else addNotification(err?.message || 'فشل حفظ السند', 'error');
    } finally { setSubmittingReceipt(false); }
  };

  const filtered = suppliers.filter(s => (s.supplierName || '').toLowerCase().includes(search.toLowerCase()));

  if (loading) return <TableSkeleton cols={4} rows={8} />;

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">الموردون</h2>
        <div className="flex gap-2">
          <Input placeholder="ابحث..." value={search} onChange={e => setSearch(e.target.value)} />
          <Button onClick={() => { setEditing({}); setFormOpen(true); }}>إضافة مورد</Button>
        </div>
      </div>

      {filtered.length === 0 && (
        <EmptyState title="لا توجد موردين" message="أضف موردًا جديدًا لبدء تسجيل الواردات." action={{ text: 'إضافة مورد', onClick: () => { setEditing({}); setFormOpen(true); } }} />
      )}

      {filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-2 text-right">الاسم</th>
              <th className="px-4 py-2 text-right">الشركة</th>
              <th className="px-4 py-2 text-right">الهاتف</th>
              <th className="px-4 py-2 text-right">البريد</th>
              <th className="px-4 py-2 text-right">إجراءات</th>
            </tr></thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{s.supplierName}</td>
                  <td className="px-4 py-2">{s.companyName}</td>
                  <td className="px-4 py-2">{s.phone}</td>
                  <td className="px-4 py-2">{s.email}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => navigate(`/receipts?supplierId=${s.id}`)}>عرض السندات</Button>
                      <Button variant="secondary" onClick={() => { setEditing(s); setFormOpen(true); }}>تعديل</Button>
                      <Button variant="danger" onClick={() => handleDelete(s.id)}>حذف</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <form onSubmit={handleSave} className="mt-4 space-y-3">
          <Input placeholder="اسم المورد" value={editing?.supplierName || ''} onChange={e => setEditing({ ...editing, supplierName: e.target.value })} required />
          <Input placeholder="اسم الشركة" value={editing?.companyName || ''} onChange={e => setEditing({ ...editing, companyName: e.target.value })} />
          <Input placeholder="الهاتف" value={editing?.phone || ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} />
          <Input placeholder="البريد" value={editing?.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })} />
          <Input placeholder="العنوان" value={editing?.address || ''} onChange={e => setEditing({ ...editing, address: e.target.value })} />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ'}</Button>
            <Button variant="secondary" onClick={() => { setFormOpen(false); setEditing(null); }}>إلغاء</Button>
          </div>
        </form>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && (
        <div>
          <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setShowReceiptModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl p-6">
              <h3 className="text-lg font-bold mb-4">تسجيل وارد للمورد: {editing?.supplierName}</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <select className="p-2 border rounded flex-1" onChange={e => { const prod = products.find(p=>p.id===e.target.value); addReceiptRow(prod); }}>
                    <option value="">إضافة منتج</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} - ({p.stock})</option>)}
                  </select>
                  <button type="button" className="px-3 py-2 bg-gray-100 rounded" onClick={() => addReceiptRow()}>أضف صف فارغ</button>
                </div>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {receiptItems.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <select className="w-full p-2 border rounded" value={it.productId} onChange={e => { const prod = products.find(p=>p.id===e.target.value); updateReceiptRow(idx, { productId: e.target.value, productName: prod?.name || '' }); }}>
                          <option value="">اختر منتجًا</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-3"><Input type="number" min={1} value={it.quantityReceived} onChange={e => updateReceiptRow(idx, { quantityReceived: Number(e.target.value) })} /></div>
                      <div className="col-span-3"><Input placeholder="ملاحظة" value={it.note} onChange={e => updateReceiptRow(idx, { note: e.target.value })} /></div>
                      <div className="col-span-1"><Button variant="danger" size="sm" onClick={() => setReceiptItems(prev => prev.filter((_,i)=>i!==idx))}>حذف</Button></div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-end mt-4">
                  <Button variant="secondary" onClick={() => setShowReceiptModal(false)}>إلغاء</Button>
                  <Button onClick={submitReceipt} loading={submittingReceipt}>{submittingReceipt ? 'جارٍ الحفظ...' : 'حفظ السند'}</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default SuppliersPage;

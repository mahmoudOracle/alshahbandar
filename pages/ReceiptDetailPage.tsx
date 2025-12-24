import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import TableSkeleton from '../components/TableSkeleton';
import { getIncomingReceiptById, editIncomingReceipt } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useNotification } from '../contexts/NotificationContext';

const ReceiptDetailPage: React.FC = () => {
  const { id } = useParams();
  const { activeCompanyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  useEffect(() => {
    const fetch = async () => {
      if (!activeCompanyId || !id) return;
      setLoading(true);
      try {
        const r = await getIncomingReceiptById(activeCompanyId, id);
        setReceipt(r || null);
        setItems((r?.products || []).map((p:any)=>({ ...p })));
      } catch (err:any) {
        addNotification(err?.message || 'Failed to load receipt', 'error');
      } finally { setLoading(false); }
    };
    fetch();
  }, [activeCompanyId, id]);

  if (loading) return <TableSkeleton cols={3} rows={6} />;
  if (!receipt) return <Card><p>Receipt not found</p></Card>;

  const updateItem = (index:number, changes:any) => setItems(prev=>prev.map((it,i)=>i===index?{...it,...changes}:it));
  const submitEdit = async () => {
    if (!activeCompanyId || !id) return;
    try {
      await editIncomingReceipt(activeCompanyId, id, { ...receipt, products: items });
      addNotification('Receipt updated', 'success');
      navigate('/receipts');
    } catch (err:any) {
      addNotification(err?.message || 'Failed to edit receipt', 'error');
    }
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">تفاصيل السند {receipt.receiptId || receipt.id}</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/receipts')}>رجوع</Button>
          <Button onClick={() => setEditing(e=>!e)}>{editing ? 'إلغاء' : 'تعديل'}</Button>
        </div>
      </div>

      {!editing && (
        <div>
          <p>المورد: {receipt.supplierName}</p>
          <table className="min-w-full divide-y divide-gray-200 mt-4">
            <thead className="bg-gray-50"><tr><th>المنتج</th><th>الكمية</th><th>ملاحظة</th></tr></thead>
            <tbody>{(receipt.products||[]).map((p:any,i:number)=>(<tr key={i}><td>{p.productName}</td><td>{p.quantityReceived}</td><td>{p.note||'-'}</td></tr>))}</tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="space-y-3">
          {(items||[]).map((it,idx)=> (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-7"><Input value={it.productName} readOnly /></div>
              <div className="col-span-3"><Input type="number" value={it.quantityReceived} onChange={e=>updateItem(idx,{ quantityReceived: Number(e.target.value) })} /></div>
              <div className="col-span-2"><Input value={it.note||''} onChange={e=>updateItem(idx,{ note: e.target.value })} /></div>
            </div>
          ))}
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={()=>setEditing(false)}>إلغاء</Button><Button onClick={submitEdit}>حفظ التعديل</Button></div>
        </div>
      )}
    </Card>
  );
};

export default ReceiptDetailPage;

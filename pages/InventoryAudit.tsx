import React, { useEffect, useState } from 'react';
import { getInventory, getStockLedger } from '../services/dataService';
import { InventoryItem, StockLedgerEntry } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

const InventoryAudit: React.FC = () => {
  const { activeCompanyId } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [productFilter, setProductFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    const load = async () => {
      if (!activeCompanyId) return;
      setLoading(true);
      try {
        const invRes = await getInventory(activeCompanyId);
        const ledgerRes = await getStockLedger(activeCompanyId, { limit: 200 });
        setInventory(invRes.data || []);
        setLedger(ledgerRes.data || []);
      } catch (e) {
        console.error('Failed to load inventory/ledger', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeCompanyId]);

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">تفريغ مخزون وسجل المخزون</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">جرد المخزون</h3>
            <Button onClick={async () => { if (!activeCompanyId) return; const res = await getInventory(activeCompanyId); setInventory(res.data || []); }}>تحديث</Button>
          </div>
          {loading ? <div>جارٍ التحميل...</div> : (
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-right p-2">المنتج</th>
                  <th className="text-right p-2">المخزون</th>
                  <th className="text-right p-2">تكلفة متوسطة</th>
                  <th className="text-right p-2">آخر تحديث</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(i => (
                  <tr key={i.productId} className="border-t">
                    <td className="p-2 text-right">{i.productName || i.productId}</td>
                    <td className="p-2 text-right">{i.stock}</td>
                    <td className="p-2 text-right">{(i.averageCost || 0).toFixed(2)}</td>
                    <td className="p-2 text-right">{i.updatedAt ? new Date(i.updatedAt as any).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">سجل الحركات (آخر 200)</h3>
              <div className="flex items-center gap-2">
                <input placeholder="تصفية حسب المنتج" className="input" value={productFilter} onChange={e => { setProductFilter(e.target.value); setPage(1); }} />
                <select className="input" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
                  <option value="">الكل</option>
                  <option value="purchase">استلام</option>
                  <option value="sale">بيع</option>
                  <option value="adjustment">تسوية</option>
                </select>
                <Button onClick={async () => { if (!activeCompanyId) return; const res = await getStockLedger(activeCompanyId, { limit: 200 }); setLedger(res.data || []); }}>تحديث</Button>
                <Button onClick={() => {
                  // Export filtered ledger to CSV
                  const rows = [['productId','quantity','type','unitCost','reference','createdAt']];
                  const filtered = ledger.filter(l => {
                    if (productFilter && !String(l.productId).includes(productFilter)) return false;
                    if (typeFilter && String(l.type) !== typeFilter) return false;
                    return true;
                  });
                  for (const l of filtered) rows.push([String(l.productId), String(l.quantity), String(l.type), String((l.unitCost || 0).toFixed ? (l.unitCost as any).toFixed(2) : String(l.unitCost || 0)), String(l.referenceId || ''), l.createdAt ? new Date(l.createdAt as any).toISOString() : '']);
                  const csv = rows.map(r => r.map(c => '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `stock-ledger-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
                }}>تصدير CSV</Button>
              </div>
          </div>
          {loading ? <div>جارٍ التحميل...</div> : (
            <div className="overflow-auto max-h-96">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="p-2 text-right">المنتج</th>
                    <th className="p-2 text-right">الكمية</th>
                    <th className="p-2 text-right">النوع</th>
                    <th className="p-2 text-right">التكلفة/وحدة</th>
                    <th className="p-2 text-right">المرجع</th>
                    <th className="p-2 text-right">تاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = ledger.filter(l => {
                      if (productFilter && !String(l.productId).includes(productFilter)) return false;
                      if (typeFilter && String(l.type) !== typeFilter) return false;
                      return true;
                    });
                    const start = (page - 1) * pageSize;
                    const paged = filtered.slice(start, start + pageSize);
                    return paged.map(l => (
                    <tr key={l.id} className="border-t">
                      <td className="p-2 text-right">{l.productId}</td>
                      <td className="p-2 text-right">{l.quantity}</td>
                      <td className="p-2 text-right">{l.type}</td>
                      <td className="p-2 text-right">{(l.unitCost || 0).toFixed(2)}</td>
                      <td className="p-2 text-right">{l.referenceCollection || ''} / {l.referenceId || ''}</td>
                      <td className="p-2 text-right">{l.createdAt ? new Date(l.createdAt as any).toLocaleString() : '-'}</td>
                    </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-between items-center mt-3">
            <div>
              <label className="me-2">صفحة:</label>
              <button className="px-2 py-1 border rounded me-2" onClick={() => setPage(p => Math.max(1, p - 1))}>السابق</button>
              <button className="px-2 py-1 border rounded" onClick={() => setPage(p => p + 1)}>التالي</button>
            </div>
            <div>
              <label className="me-2">حجم الصفحة:</label>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default InventoryAudit;

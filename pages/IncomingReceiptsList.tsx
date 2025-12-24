import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import TableSkeleton from '../components/TableSkeleton';
import { useAuth } from '../contexts/AuthContext';
import { getIncomingReceipts, getSupplierById } from '../services/dataService';
import { useLocation } from 'react-router-dom';

const IncomingReceiptsList: React.FC = () => {
  const { activeCompanyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<any[]>([]);
  const location = useLocation();
  const [supplierName, setSupplierName] = useState('');

  const fetch = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const res = await getIncomingReceipts(activeCompanyId, { limit: 200 });
      const all = res.data || [];

      // If a supplierId query param is present, filter client-side to avoid extra routes
      const params = new URLSearchParams(location.search);
      const supplierId = params.get('supplierId');
      if (supplierId) {
        setReceipts(all.filter(r => r.supplierId === supplierId));
        // also fetch supplier name for header
        try {
          const sup = await getSupplierById(activeCompanyId, supplierId);
          setSupplierName(sup?.supplierName || '');
        } catch { setSupplierName(''); }
      } else {
        setReceipts(all);
        setSupplierName('');
      }
    } catch (err) {
      setReceipts([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [activeCompanyId, location.search]);

  if (loading) return <TableSkeleton cols={4} rows={6} />;

  return (
    <Card>
      <h2 className="text-xl font-bold mb-4">سجل سندات الاستلام {supplierName ? `- المورد: ${supplierName}` : ''}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50"><tr>
            <th className="px-4 py-2 text-right">رقم السند</th>
            <th className="px-4 py-2 text-right">المورد</th>
            <th className="px-4 py-2 text-right">مجموع الأصناف</th>
            <th className="px-4 py-2 text-right">التاريخ</th>
          </tr></thead>
          <tbody>
            {receipts.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2"><a href={`#/receipts/${r.id}`} className="text-primary-600">{r.receiptId || r.id}</a></td>
                <td className="px-4 py-2">{r.supplierName}</td>
                <td className="px-4 py-2">{(r.products || []).length}</td>
                <td className="px-4 py-2">{r.receivedAt ? new Date(r.receivedAt.seconds * 1000).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default IncomingReceiptsList;

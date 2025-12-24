import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import TableSkeleton from '../components/TableSkeleton';
import { useAuth } from '../contexts/AuthContext';
import { getProducts } from '../services/dataService';

const WarehousePage: React.FC = () => {
  const { activeCompanyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const fetch = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const res = await getProducts(activeCompanyId, { limit: 1000 });
      setProducts(res.data || []);
    } catch (err) {
      setProducts([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [activeCompanyId]);

  if (loading) return <TableSkeleton cols={4} rows={8} />;

  const filtered = products.filter(p => (p.name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">المخزن</h2>
        <Input placeholder="ابحث عن منتج..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50"><tr>
            <th className="px-4 py-2 text-right">المنتج</th>
            <th className="px-4 py-2 text-right">الفئة</th>
            <th className="px-4 py-2 text-right">المخزون الحالي</th>
            <th className="px-4 py-2 text-right">آخر تحديث</th>
          </tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2">{p.category || '-'}</td>
                <td className="px-4 py-2">{p.stock}</td>
                <td className="px-4 py-2">{p.updatedAt ? new Date(p.updatedAt.seconds * 1000).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default WarehousePage;

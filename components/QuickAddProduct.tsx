import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface Props {
  onAdd: (product: { name: string; price: number; stock: number }) => void;
}

const QuickAddProduct: React.FC<Props> = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState<string>('');
  const [stock, setStock] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name || !price) return;
    setLoading(true);
    try {
      onAdd({ name: name.trim(), price: parseFloat(price || '0'), stock: parseInt(stock || '0') });
      setName(''); setPrice(''); setStock('');
    } finally { setLoading(false); }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
      <h3 className="text-sm font-semibold mb-2">إضافة منتج سريع</h3>
      <div className="space-y-2">
        <Input label="اسم المنتج" value={name} onChange={e => setName(e.target.value)} />
        <Input label="السعر" value={price} onChange={e => setPrice(e.target.value)} type="number" />
        <Input label="الكمية" value={stock} onChange={e => setStock(e.target.value)} type="number" />
        <div className="flex justify-end">
          <Button onClick={submit} loading={loading}>إضافة</Button>
        </div>
      </div>
    </div>
  );
};

export default QuickAddProduct;

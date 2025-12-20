
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProducts, deleteProduct } from '../services/dataService';
import { Product } from '../types';
import { PlusIcon, PencilIcon, TrashIcon, ArchiveBoxIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useSettings } from '../contexts/SettingsContext';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { mapFirestoreError } from '../services/firebaseErrors';

const PAGE_SIZE = 15;

const ProductCard: React.FC<{ product: Product, currency?: string, canWrite: boolean, onDelete: (id: string) => void }> = ({ product, currency, canWrite, onDelete }) => (
    <Card padding="sm" className="md:hidden">
        <div className="flex justify-between items-start mb-2">
            <div>
                <h3 className="font-bold text-lg">{product.name}</h3>
                <p className="text-sm text-gray-500">{product.price.toFixed(2)} {currency}</p>
            </div>
            <span className="font-bold text-primary-600 bg-primary-100 dark:bg-primary-900/50 px-2 py-1 text-xs rounded-full">{product.stock} متبقي</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 truncate">{product.description}</p>
        {canWrite && (
            <div className="flex gap-2 mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                <Link to={`/products/edit/${product.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                        <PencilIcon className="h-4 w-4 me-2" /> تعديل
                    </Button>
                </Link>
                <Button variant="danger" size="sm" className="flex-1" onClick={() => onDelete(product.id)}>
                    <TrashIcon className="h-4 w-4 me-2" /> حذف
                </Button>
            </div>
        )}
    </Card>
);

const ProductList: React.FC = () => {
  const { activeCompanyId } = useAuth();
  const canWrite = useCanWrite('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [nextCursor, setNextCursor] = useState<any | null>(null);
  const [prevCursors, setPrevCursors] = useState<any[]>([]);
  const [isLastPage, setIsLastPage] = useState(false);

  const { settings, loading: settingsLoading } = useSettings();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const fetchProducts = useCallback(async (cursor?: any, direction: 'next' | 'prev' = 'next') => {
      if (!activeCompanyId) return;
      setLoading(true);
      try {
        const result = await getProducts(activeCompanyId, {
            limit: PAGE_SIZE,
            startAfter: cursor,
        });

        setProducts(result.data);
        setNextCursor(result.nextCursor);
        setIsLastPage(!result.nextCursor || result.data.length < PAGE_SIZE);

        if (direction === 'next') {
            if (cursor) setPrevCursors(prev => [...prev, cursor]);
        } else {
            setPrevCursors(prev => prev.slice(0, prev.length - 1));
        }
      } catch (error: any) {
          addNotification(mapFirestoreError(error), "error");
          setProducts([]);
      } finally {
          setLoading(false);
      }
  }, [activeCompanyId, addNotification]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleNextPage = () => { if (nextCursor) fetchProducts(nextCursor, 'next'); };
  const handlePrevPage = () => {
    if (prevCursors.length > 0) {
      fetchProducts(prevCursors[prevCursors.length - 2], 'prev');
    } else {
      fetchProducts(undefined, 'prev');
    }
  };

  const confirmDelete = async () => {
    if (productToDelete && activeCompanyId) {
        try {
            const result = await deleteProduct(activeCompanyId, productToDelete.id);
            if(result) {
                addNotification('تم حذف المنتج بنجاح!', 'success');
                fetchProducts(prevCursors[prevCursors.length - 1] || undefined);
            } else {
                addNotification('فشل حذف المنتج.', 'error');
            }
        } catch (error: any) {
            addNotification(mapFirestoreError(error), 'error');
        }
    }
    setProductToDelete(null);
  }

  const filteredProducts = useMemo(() => {
    return products.filter(product =>
      (product.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
    );
  }, [products, searchTerm]);

  if (loading || settingsLoading) return <TableSkeleton cols={5} rows={PAGE_SIZE} />;

  if (products.length === 0 && !loading) {
    return (
      <EmptyState
        icon={<ArchiveBoxIcon className="h-8 w-8" />}
        title="لا توجد منتجات بعد"
        message={canWrite ? "ابدأ بإضافة أول منتج أو خدمة لإنشاء الفواتير." : "لم يتم إضافة أي منتجات حتى الآن."}
        action={canWrite ? { text: 'إضافة منتج', onClick: () => navigate('/products/new')}: undefined}
      />
    );
  }

  return (
    <Card>
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <Input
            type="text"
            placeholder="ابحث عن منتج..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full md:w-64"
        />
        {canWrite && (
            <Link to="/products/new" className="w-full md:w-auto">
                <Button variant="primary" className="w-full">
                    <PlusIcon className="h-5 w-5 me-2" />
                    إضافة منتج
                </Button>
            </Link>
        )}
      </div>
      
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">اسم المنتج</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">السعر</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">المخزون</th>
              {canWrite && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">إجراءات</th>}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredProducts.map(product => (
              <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{product.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{product.price.toFixed(2)} {settings?.currency}</td>
                <td className="px-6 py-4 whitespace-nowrap">{product.stock}</td>
                {canWrite && 
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                            <Link to={`/products/edit/${product.id}`} className="text-gray-600 hover:text-gray-900 p-2" aria-label="تعديل المنتج"><PencilIcon className="h-5 w-5" /></Link>
                            <button onClick={() => setProductToDelete(product)} className="text-danger-600 hover:text-danger-700 p-2" aria-label="حذف المنتج"><TrashIcon className="h-5 w-5" /></button>
                      </div>
                    </td>
                }
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-4 mt-4">
        {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} currency={settings?.currency} canWrite={canWrite} onDelete={() => setProductToDelete(product)} />
        ))}
      </div>

       <div className="flex justify-center items-center mt-6 gap-2">
          <Button onClick={handlePrevPage} disabled={prevCursors.length === 0} variant="secondary" size="sm" aria-label="Previous Page">
              <ChevronRightIcon className="h-5 w-5" />
          </Button>
          <Button onClick={handleNextPage} disabled={isLastPage} variant="secondary" size="sm" aria-label="Next Page">
              <ChevronLeftIcon className="h-5 w-5" />
          </Button>
      </div>

      {filteredProducts.length === 0 && (
          <div className="text-center py-10">
              <p>لا توجد منتجات تطابق بحثك.</p>
          </div>
      )}

      <Modal isOpen={!!productToDelete} onClose={() => setProductToDelete(null)} title="تأكيد الحذف">
        <p>هل أنت متأكد من رغبتك في حذف المنتج "{productToDelete?.name}"؟ لا يمكن التراجع عن هذا الإجراء.</p>
        <div className="flex justify-end gap-4 mt-6">
            <Button variant="secondary" onClick={() => setProductToDelete(null)}>إلغاء</Button>
            <Button variant="danger" onClick={confirmDelete}>حذف</Button>
        </div>
      </Modal>
    </Card>
  );
};

export default ProductList;

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getProducts, deleteProduct, undeleteDocument, saveProduct } from '../services/dataService';
import { Product } from '../types';
import { PlusIcon, PencilIcon, TrashIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
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
import QuickAddProduct from '../components/QuickAddProduct';
import { clearProductCache } from '../services/repositories/products';

const PAGE_SIZE = 200;
const SKELETON_ROWS = 8;

const isLowStock = (product: Product) => {
  const level = Number(product.reorderLevel || 0);
  if (!Number.isFinite(level) || level <= 0) return false;
  return Number(product.stock || 0) <= level;
};

const ProductCard: React.FC<{
  product: Product;
  currency?: string;
  canWrite: boolean;
  onDelete: (id: string) => void;
  onAdjust: (product: Product, delta: number) => void;
  lowStock: boolean;
  adjustmentValue: number;
  onAdjustmentChange: (id: string, value: number) => void;
}> = ({
  product,
  currency,
  canWrite,
  onDelete,
  onAdjust,
  lowStock,
  adjustmentValue,
  onAdjustmentChange,
}) => (
  <Card padding="sm" className="md:hidden">
    <div className="flex justify-between items-start mb-2">
      <div>
        <h3 className="font-bold text-lg">{product.name}</h3>
        <p className="text-sm text-gray-500">
          {Number(product.price || 0).toFixed(2)} {currency}
        </p>
      </div>
      <span
        className={`font-bold px-2 py-1 text-xs rounded-full ${
          lowStock
            ? 'text-danger-700 bg-danger-100 dark:bg-danger-900/40'
            : 'text-primary-600 bg-primary-100 dark:bg-primary-900/50'
        }`}
      >
        المخزون: {product.stock}
      </span>
    </div>
    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 truncate">{product.description}</p>
    {Number(product.reorderLevel || 0) > 0 && (
      <p className="text-xs text-gray-500 mt-1">حد إعادة الطلب: {product.reorderLevel}</p>
    )}
    {canWrite && (
      <>
        <div className="flex gap-2 mt-3">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => onAdjust(product, -1)}
          >
            -1
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => onAdjust(product, 1)}
          >
            +1
          </Button>
          <Input
            type="number"
            value={String(adjustmentValue)}
            onChange={(e) => onAdjustmentChange(product.id, Number(e.target.value || 0))}
            className="flex-1"
          />
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => onAdjust(product, adjustmentValue)}
          >
            تطبيق
          </Button>
        </div>
        <div className="flex gap-2 mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
          <Link to={`/products/edit/${product.id}`} className="flex-1">
            <Button variant="secondary" size="sm" className="w-full">
              <PencilIcon className="h-4 w-4 me-2" /> تعديل
            </Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            className="flex-1"
            onClick={() => onDelete(product.id)}
          >
            <TrashIcon className="h-4 w-4 me-2" /> حذف
          </Button>
        </div>
      </>
    )}
  </Card>
);

const ProductList: React.FC = () => {
  const { activeCompanyId } = useAuth();
  const canWrite = useCanWrite('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();
  const [filter, setFilter] = useState<'all' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'price_asc' | 'price_desc'>(
    'name_asc'
  );
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [stockAdjustments, setStockAdjustments] = useState<Record<string, number>>({});

  const { settings, loading: settingsLoading } = useSettings();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedProduct, setEditedProduct] = useState<Partial<Product> | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const result = await getProducts(activeCompanyId, { limit: PAGE_SIZE });
      if (Array.isArray(result)) {
        setProducts(result);
      } else {
        const paginated = result as { data?: Product[]; nextCursor?: unknown };
        setProducts(paginated.data || []);
      }
    } catch (error: unknown) {
      addNotification(mapFirestoreError(error), 'error');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, addNotification]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const applyStockAdjustment = async (product: Product, delta: number) => {
    if (!activeCompanyId || !canWrite) return;
    const nextStock = Number(product.stock || 0) + delta;
    try {
      await saveProduct(activeCompanyId, { ...product, stock: Math.max(0, nextStock) });
      clearProductCache(activeCompanyId);
      setStockAdjustments((prev) => ({ ...prev, [product.id]: 0 }));
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, stock: Math.max(0, nextStock) } : p))
      );
      addNotification('تم تحديث المخزون بنجاح.', 'success');
    } catch (err: unknown) {
      addNotification(mapFirestoreError(err), 'error');
    }
  };

  const confirmDelete = async () => {
    if (productToDelete && activeCompanyId) {
      try {
        const result = await deleteProduct(activeCompanyId, productToDelete.id);
        if (result) {
          addNotification('تم حذف المنتج.', 'success', {
            label: 'تراجع',
            onClick: async () => {
              try {
                const ok = await undeleteDocument(activeCompanyId, 'products', productToDelete.id);
                if (ok) {
                  await fetchProducts();
                }
              } catch (e) {
                console.error(e);
              }
            },
          });
          fetchProducts();
        } else {
          addNotification('تعذر حذف المنتج.', 'error');
        }
      } catch (error: unknown) {
        addNotification(mapFirestoreError(error), 'error');
      }
    }
    setProductToDelete(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const f = params.get('filter');
    if (f === 'low') setFilter('low');
  }, [location.search]);

  const lowStockCount = useMemo(
    () => products.filter((product) => isLowStock(product)).length,
    [products]
  );

  const filteredProducts = useMemo(() => {
    let list = products.filter((product) =>
      (product.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
    );
    if (filter === 'low') {
      list = list.filter((p) => isLowStock(p));
    }

    const sorted = [...list];
    if (sortBy === 'name_asc')
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
    if (sortBy === 'name_desc')
      sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'ar'));
    if (sortBy === 'price_asc')
      sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sortBy === 'price_desc')
      sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    return sorted;
  }, [products, searchTerm, sortBy, filter]);

  if (loading || settingsLoading) return <TableSkeleton cols={5} rows={SKELETON_ROWS} />;

  if (products.length === 0 && !loading) {
    return (
      <EmptyState
        icon={<ArchiveBoxIcon className="h-8 w-8" />}
        title="لا توجد منتجات"
        message={
          canWrite
            ? 'ابدأ بإضافة منتج جديد لإدارة المخزون.'
            : 'لا توجد منتجات متاحة للعرض.'
        }
        action={canWrite ? { text: 'إضافة منتج', onClick: () => navigate('/products/new') } : undefined}
      />
    );
  }

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">المنتجات والمخزون</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            تتبع المنتجات وكميات المخزون وإدارة الأسعار بشكل عملي.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
            lowStockCount > 0
              ? 'bg-danger-100 text-danger-700'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          منخفض: {lowStockCount}
        </span>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
        {canWrite && (
          <div className="w-full md:w-80 mb-2 md:mb-0">
            <QuickAddProduct
              onAdd={async (p) => {
                if (!activeCompanyId) return;
                try {
                  await saveProduct(activeCompanyId, {
                    name: p.name,
                    description: p.description || '',
                    price: p.price,
                    stock: p.stock,
                    reorderLevel: p.reorderLevel ?? 0,
                  } as any);
                  clearProductCache(activeCompanyId);
                  addNotification('تمت إضافة المنتج بنجاح.', 'success');
                  fetchProducts();
                } catch (err: unknown) {
                  addNotification(mapFirestoreError(err), 'error');
                }
              }}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <div className="flex gap-2 w-full md:w-auto items-center">
          <Input
            type="text"
            placeholder="ابحث عن منتج..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64"
          />
          <select
            value={sortBy}
            onChange={(e) => {
              const v = e.target.value as 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc';
              setSortBy(v);
            }}
            className="px-3 py-2 border rounded-md bg-white dark:bg-gray-700"
          >
            <option value="name_asc">الاسم (أ-ي)</option>
            <option value="name_desc">الاسم (ي-أ)</option>
            <option value="price_asc">السعر (الأقل أولاً)</option>
            <option value="price_desc">السعر (الأعلى أولاً)</option>
          </select>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'low')}
            className="px-3 py-2 border rounded-md bg-white dark:bg-gray-700"
          >
            <option value="all">الكل</option>
            <option value="low">منخفض</option>
          </select>
        </div>
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
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                المنتج
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                السعر
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                المخزون
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                حد إعادة الطلب
              </th>
              {canWrite && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  تعديل المخزون
                </th>
              )}
              {canWrite && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  إجراءات
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredProducts.map((product) => (
              <tr
                key={product.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
              >
                {editingId === product.id ? (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      <Input
                        value={String(editedProduct?.name ?? product.name)}
                        onChange={(e) =>
                          setEditedProduct((p) => ({ ...(p || {}), name: e.target.value }))
                        }
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Input
                        value={String(editedProduct?.price ?? product.price)}
                        onChange={(e) =>
                          setEditedProduct((p) => ({
                            ...(p || {}),
                            price: parseFloat(e.target.value || '0'),
                          }))
                        }
                      />{' '}
                      {settings?.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Input
                        value={String(editedProduct?.stock ?? product.stock)}
                        onChange={(e) =>
                          setEditedProduct((p) => ({
                            ...(p || {}),
                            stock: parseInt(e.target.value || '0'),
                          }))
                        }
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Input
                        value={String(editedProduct?.reorderLevel ?? product.reorderLevel ?? 0)}
                        onChange={(e) =>
                          setEditedProduct((p) => ({
                            ...(p || {}),
                            reorderLevel: parseInt(e.target.value || '0'),
                          }))
                        }
                      />
                    </td>
                    {canWrite && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                              if (!activeCompanyId || !editedProduct) return;
                              try {
                                const toSave = {
                                  id: product.id,
                                  name: editedProduct.name ?? product.name,
                                  price: Number(editedProduct.price ?? product.price),
                                  stock: Number(editedProduct.stock ?? product.stock),
                                  reorderLevel: Number(
                                    editedProduct.reorderLevel ?? product.reorderLevel ?? 0
                                  ),
                                } as Product;
                                await saveProduct(activeCompanyId, toSave);
                                try {
                                  clearProductCache(activeCompanyId);
                                } catch (e) {
                                  /* ignore cache clear errors */
                                }
                                addNotification('تم حفظ التعديل.', 'success');
                                setEditingId(null);
                                setEditedProduct(null);
                                await fetchProducts();
                              } catch (err: unknown) {
                                addNotification(mapFirestoreError(err), 'error');
                              }
                            }}
                          >
                            حفظ
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingId(null);
                              setEditedProduct(null);
                            }}
                          >
                            إلغاء
                          </Button>
                        </div>
                      </td>
                    )}
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {Number(product.price || 0).toFixed(2)} {settings?.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          isLowStock(product)
                            ? 'text-danger-700 bg-danger-100 dark:bg-danger-900/40'
                            : 'text-primary-600 bg-primary-100 dark:bg-primary-900/50'
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {Number(product.reorderLevel || 0) > 0 ? product.reorderLevel : 'غير محدد'}
                    </td>
                    {canWrite && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => applyStockAdjustment(product, -1)}
                          >
                            -1
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => applyStockAdjustment(product, 1)}
                          >
                            +1
                          </Button>
                          <Input
                            type="number"
                            value={String(stockAdjustments[product.id] ?? 0)}
                            onChange={(e) =>
                              setStockAdjustments((prev) => ({
                                ...prev,
                                [product.id]: Number(e.target.value || 0),
                              }))
                            }
                            className="w-20"
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              applyStockAdjustment(product, stockAdjustments[product.id] ?? 0)
                            }
                          >
                            تطبيق
                          </Button>
                        </div>
                      </td>
                    )}
                    {canWrite && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingId(product.id);
                              setEditedProduct({
                                name: product.name,
                                price: product.price,
                                stock: product.stock,
                                reorderLevel: product.reorderLevel ?? 0,
                              });
                            }}
                            className="text-gray-600 hover:text-gray-900 p-2"
                            aria-label="تعديل المنتج"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setProductToDelete(product)}
                            className="text-danger-600 hover:text-danger-700 p-2"
                            aria-label="حذف المنتج"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-4 mt-4">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            currency={settings?.currency}
            canWrite={canWrite}
            onDelete={() => setProductToDelete(product)}
            onAdjust={applyStockAdjustment}
            lowStock={isLowStock(product)}
            adjustmentValue={stockAdjustments[product.id] ?? 0}
            onAdjustmentChange={(id, value) =>
              setStockAdjustments((prev) => ({ ...prev, [id]: value }))
            }
          />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-10">
          <p>
            {filter === 'low'
              ? 'لا توجد أصناف منخفضة حالياً.'
              : 'لا توجد نتائج مطابقة للبحث.'}
          </p>
        </div>
      )}

      <Modal isOpen={!!productToDelete} onClose={() => setProductToDelete(null)} title="تأكيد الحذف">
        <p>
          هل أنت متأكد من حذف المنتج &quot;{productToDelete?.name}&quot;؟ يمكنك التراجع عن الحذف
          لاحقًا.
        </p>
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="secondary" onClick={() => setProductToDelete(null)}>
            إلغاء
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            حذف
          </Button>
        </div>
      </Modal>
    </Card>
  );
};

export default ProductList;

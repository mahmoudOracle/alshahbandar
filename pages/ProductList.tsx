import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';
import { getRoutePath } from '../src/routes';
import { deleteProduct, getProducts, undeleteDocument } from '../services/dataService';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useSettings } from '../contexts/SettingsContext';
import { Product } from '../types';
import EmptyState from '../components/EmptyState';
import TableSkeleton from '../components/TableSkeleton';
import { Card } from '../src/ui/Card';
import { Button } from '../src/ui/Button';
import { Input } from '../src/ui/Input';
import { Select } from '../src/ui/Select';
import { Modal } from '../components/ui/Modal';
import { mapFirestoreError } from '../services/firebaseErrors';
import { t } from '../src/i18n/t';

const PAGE_SIZE = 50;
const SKELETON_ROWS = 8;

const isLowStock = (product: Product) => {
  const level = Number(product.reorderLevel || 0);
  if (!Number.isFinite(level) || level <= 0) return false;
  return Number(product.stock || 0) <= level;
};

const ProductList: React.FC = () => {
  const { companyId } = useAuth();
  const canWrite = useCanWrite('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<unknown | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();
  const [filter, setFilter] = useState<'all' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'price_asc' | 'price_desc'>(
    'name_asc'
  );
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const { settings, loading: settingsLoading } = useSettings();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const fetchProducts = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const result = await getProducts(companyId, { limit: PAGE_SIZE });
      if (Array.isArray(result)) {
        setProducts(result);
        setNextCursor(null);
      } else {
        const paginated = result as { data?: Product[]; nextCursor?: unknown };
        setProducts(paginated.data || []);
        setNextCursor(paginated.nextCursor ?? null);
      }
    } catch (error: unknown) {
      addNotification(mapFirestoreError(error), 'error');
      setProducts([]);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, addNotification]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const loadMoreProducts = async () => {
    if (!companyId || !nextCursor) return;
    setLoadingMore(true);
    try {
      const result = await getProducts(companyId, { limit: PAGE_SIZE, startAfter: nextCursor });
      if (Array.isArray(result)) {
        setNextCursor(null);
        return;
      }
      const paginated = result as { data?: Product[]; nextCursor?: unknown };
      setProducts((prev) => [...prev, ...(paginated.data || [])]);
      setNextCursor(paginated.nextCursor ?? null);
    } catch (error: unknown) {
      addNotification(mapFirestoreError(error), 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const confirmDelete = async () => {
    if (productToDelete && companyId) {
      try {
        const result = await deleteProduct(companyId, productToDelete.id);
        if (result) {
          addNotification(t('productDeleteSuccess'), 'success', {
            label: t('commonUndo'),
            onClick: async () => {
              try {
                const ok = await undeleteDocument(companyId, 'products', productToDelete.id);
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
          addNotification(t('productDeleteFail'), 'error');
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

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: settings?.currency || 'EGP',
        maximumFractionDigits: 2,
      }),
    [settings?.currency]
  );

  const formatMoney = (value: number) => formatter.format(value || 0);

  if (loading || settingsLoading) return <TableSkeleton cols={4} rows={SKELETON_ROWS} />;

  if (products.length === 0 && !loading) {
    return (
      <EmptyState
        icon={<ArchiveBoxIcon className="h-8 w-8" />}
        title={t('productsEmptyTitle')}
        message={canWrite ? t('productsEmptyMessage') : t('productsEmptyReadonly')}
        action={
          canWrite ? { text: t('productsAdd'), onClick: () => navigate(getRoutePath('productForm')) } : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="page-title">{t('productsTitle')}</div>
        <div className="page-subtitle">{t('productsSubtitle')}</div>
      </div>

      <Card>
        <div className="list-toolbar">
          <Input
            type="text"
            placeholder={t('productsSearch')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="list-search"
          />
          <div className="list-toolbar-actions">
            <Button type="button" variant="secondary" onClick={() => setShowFilters((s) => !s)}>
              {t('commonFilter')}
            </Button>
            <span className="tag-pill">
              {t('productsLow')}: {lowStockCount}
            </span>
            {canWrite && (
              <Link to="/app/products/new" className="ui-button primary">
                {t('productsAdd')}
              </Link>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="filter-panel">
            <Select
              label={t('productsSort')}
              value={sortBy}
              onChange={(e) => {
                const v = e.target.value as 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc';
                setSortBy(v);
              }}
              options={[
                { value: 'name_asc', label: t('productsSortNameAsc') },
                { value: 'name_desc', label: t('productsSortNameDesc') },
                { value: 'price_asc', label: t('productsSortPriceAsc') },
                { value: 'price_desc', label: t('productsSortPriceDesc') },
              ]}
            />
            <Select
              label={t('productsStockLabel')}
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'low')}
              options={[
                { value: 'all', label: t('productsAll') },
                { value: 'low', label: t('productsLow') },
              ]}
            />
          </div>
        )}

        {filteredProducts.length > 0 ? (
          <div className="invoice-list">
            {filteredProducts.map((product) => {
              const low = isLowStock(product);
              return (
                <div key={product.id} className="invoice-row">
                  <Link to={`/app/products/edit/${product.id}`} className="invoice-main">
                    <div className="invoice-title">{product.name}</div>
                    <div className="invoice-meta">
                      {t('productsPriceLabel')}: {formatMoney(Number(product.price || 0))} ·{' '}
                      {t('productsStockLabel')}: {product.stock}
                    </div>
                  </Link>
                  <div className="invoice-side">
                    <div className="invoice-total">
                      {t('productsStockLabel')}: {product.stock}
                    </div>
                    <div className={`invoice-status ${low ? 'warning' : 'muted'}`}>
                      {low ? t('productsLow') : t('productsStable')}
                    </div>
                  </div>
                  <div className="invoice-menu">
                    <button
                      type="button"
                      className="menu-button"
                      onClick={() =>
                        setActiveMenuId((prev) => (prev === product.id ? null : product.id))
                      }
                      aria-label={t('commonActionsMenu')}
                    >
                      ⋯
                    </button>
                    {activeMenuId === product.id && (
                      <div className="menu-panel">
                        <Link to={`/app/products/edit/${product.id}`} className="menu-item">
                          {t('commonEdit')}
                        </Link>
                        {canWrite && (
                          <button
                            type="button"
                            className="menu-item danger"
                            onClick={() => setProductToDelete(product)}
                          >
                            {t('commonDelete')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10">
            <p>{filter === 'low' ? t('productsNoLow') : t('invoicesNoResults')}</p>
          </div>
        )}

        {nextCursor && filteredProducts.length > 0 && (
          <div className="flex justify-center mt-6">
            <Button variant="secondary" onClick={loadMoreProducts} loading={loadingMore}>
              {t('productsLoadMore')}
            </Button>
          </div>
        )}

        <Modal
          isOpen={!!productToDelete}
          onClose={() => setProductToDelete(null)}
          title={t('commonDelete')}
        >
          <p>{t('productDeleteConfirm', { name: productToDelete?.name || '' })}</p>
          <div className="flex justify-end gap-4 mt-6">
            <Button variant="secondary" onClick={() => setProductToDelete(null)}>
              {t('commonCancel')}
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t('commonDelete')}
            </Button>
          </div>
        </Modal>
      </Card>
    </div>
  );
};

export default ProductList;

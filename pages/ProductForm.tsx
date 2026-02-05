import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProductById, saveProduct } from '../services/dataService';
import { Product } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { FormSkeleton } from '../components/ui/FormSkeleton';
import { mapFirestoreError } from '../services/firebaseErrors';
import { t } from '../src/i18n/t';

const ProductForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const { companyId } = useAuth();
  const canWrite = useCanWrite('products');

  const [product, setProduct] = useState<Omit<Product, 'id'>>({
    name: '',
    description: '',
    price: 0,
    cost: 0,
    sku: '',
    quantity: 0,
    unit: t('unitPiece'),
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!canWrite && id) {
      // Allow viewing
    } else if (!canWrite) {
      addNotification(t('productNoPermission'), 'error');
      navigate('/app/products');
    }
  }, [canWrite, id, navigate, addNotification]);

  useEffect(() => {
    if (id && companyId) {
      setLoading(true);
      getProductById(companyId, id)
        .then((productData) => {
          if (productData) setProduct(productData as Omit<Product, 'id'>);
          else addNotification(t('productNotFound'), 'error');
          setLoading(false);
        })
        .catch((error) => {
          addNotification(mapFirestoreError(error), 'error');
          setLoading(false);
        });
    }
  }, [id, companyId, addNotification]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setProduct((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProduct((prev) => ({ ...prev, isActive: e.target.checked }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!product.name.trim()) newErrors.name = t('commonRequiredField');
    if (product.price < 0) newErrors.price = t('productValidatePrice');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      addNotification(t('productNoPermissionSave'), 'error');
      return;
    }
    if (!validateForm()) {
      addNotification(t('productFillRequired'), 'error');
      return;
    }
    if (!companyId) return;
    setSaving(true);
    try {
      const result = id
        ? await saveProduct(companyId, { ...product, id })
        : await saveProduct(companyId, product);

      if (result) {
        addNotification(t('productSaveSuccess'), 'success');
        navigate('/app/products');
      } else {
        addNotification(t('productSaveError'), 'error');
      }
    } catch (error: unknown) {
      addNotification(mapFirestoreError(error), 'error');
    }
    setSaving(false);
  };

  if (loading && id)
    return (
      <Card>
        <FormSkeleton />
      </Card>
    );

  return (
    <div className="form-page">
      <div>
        <div className="form-title">{id ? t('productFormTitleEdit') : t('productFormTitleNew')}</div>
        <div className="form-subtitle">{t('productFormSubtitle')}</div>
      </div>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset disabled={!canWrite} className="space-y-6">
            <Input
              label={t('productFormName')}
              name="name"
              value={product.name}
              onChange={handleInputChange}
              required
              error={errors.name}
            />
            <Textarea
              label={t('productFormDescription')}
              name="description"
              value={product.description}
              onChange={handleInputChange}
              rows={3}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label={t('productFormPrice')}
                type="number"
                inputMode="decimal"
                name="price"
                value={product.price}
                onChange={handleInputChange}
                step="0.01"
                error={errors.price}
              />
              <Input
                label={t('productFormCost')}
                type="number"
                inputMode="decimal"
                name="cost"
                value={product.cost}
                onChange={handleInputChange}
                step="0.01"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label={t('productFormSku')}
                name="sku"
                value={product.sku}
                onChange={handleInputChange}
              />
              <Input
                label={t('productFormQuantity')}
                type="number"
                inputMode="numeric"
                name="quantity"
                value={product.quantity}
                onChange={handleInputChange}
                step="1"
              />
            </div>
            <Input
              label={t('productFormUnit')}
              name="unit"
              value={product.unit || t('unitPiece')}
              onChange={handleInputChange}
            />
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={product.isActive}
                onChange={handleStatusChange}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label
                htmlFor="isActive"
                className="ms-2 block text-sm text-gray-900 dark:text-gray-300"
              >
                {t('productFormActive')}
              </label>
            </div>
          </fieldset>

          {canWrite && (
            <div className="form-actions">
              <Button type="submit" loading={saving} size="lg">
                {t('productFormSave')}
              </Button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
};

export default ProductForm;

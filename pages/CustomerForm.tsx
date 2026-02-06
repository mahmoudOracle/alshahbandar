import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoutePath } from '../src/routes';
import { getCustomerById, saveCustomer } from '../services/dataService';
import { Customer } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { Card } from '../src/ui/Card';
import { Button } from '../src/ui/Button';
import { Input } from '../src/ui/Input';
import { Textarea } from '../src/ui/Textarea';
import { FormSkeleton } from '../components/ui/FormSkeleton';
import { mapFirestoreError } from '../services/firebaseErrors';
import { t } from '../src/i18n/t';

const CustomerForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const { companyId } = useAuth();
  const canWrite = useCanWrite('customers');
  const [customer, setCustomer] = useState<Omit<Customer, 'id' | 'createdAt'>>({
    name: '',
    email: '',
    mobilePhone: '',
    whatsappPhone: '',
    address: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!canWrite && id) {
      // Allow viewing
    } else if (!canWrite) {
      addNotification(t('customerNoPermission'), 'error');
      navigate(getRoutePath('customers'));
    }
  }, [canWrite, id, navigate, addNotification]);

  useEffect(() => {
    if (id && companyId) {
      setLoading(true);
      getCustomerById(companyId, id)
        .then((customerData) => {
          if (customerData) {
            const data = { ...customerData } as Record<string, unknown>;
            delete (data as Record<string, unknown>)['id'];
            delete (data as Record<string, unknown>)['createdAt'];
            setCustomer(data as unknown as Omit<Customer, 'id' | 'createdAt'>);
          } else {
            addNotification(t('customerNotFound'), 'error');
          }
          setLoading(false);
        })
        .catch((error) => {
          addNotification(mapFirestoreError(error), 'error');
          setLoading(false);
        });
    }
  }, [id, companyId, addNotification]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomer((prev) => ({ ...prev, isActive: e.target.checked }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!customer.name.trim()) newErrors.name = t('commonRequiredField');
    if (!customer.mobilePhone.trim()) newErrors.mobilePhone = t('commonRequiredField');
    if (!customer.whatsappPhone.trim()) newErrors.whatsappPhone = t('commonRequiredField');
    if (!customer.address.trim()) newErrors.address = t('commonRequiredField');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (customer.email && !emailRegex.test(customer.email)) {
      newErrors.email = t('customerEmailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      addNotification(t('customerNoPermissionSave'), 'error');
      return;
    }
    if (!validateForm()) {
      addNotification(t('customerFillRequired'), 'error');
      return;
    }
    if (!companyId) return;
    setSaving(true);
    try {
      const payload = id ? ({ ...customer, id } as Customer) : (customer as Customer);
      const result = await saveCustomer(companyId, payload);

      if (result) {
        addNotification(t('customerSaveSuccess'), 'success');
        navigate(getRoutePath('customers'));
      } else {
        addNotification(t('customerSaveError'), 'error');
      }
    } catch (error: unknown) {
      addNotification(mapFirestoreError(error), 'error');
    } finally {
      setSaving(false);
    }
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
        <div className="form-title">{id ? t('customerFormTitleEdit') : t('customerFormTitleNew')}</div>
        <div className="form-subtitle">{t('customerFormSubtitle')}</div>
      </div>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset disabled={!canWrite} className="space-y-6">
            <Input
              label={t('customerFormName')}
              name="name"
              value={customer.name}
              onChange={handleInputChange}
              required
              error={errors.name}
            />
            <Input
              label={t('customerFormEmail')}
              type="email"
              name="email"
              value={customer.email || ''}
              onChange={handleInputChange}
              error={errors.email}
            />
            <Input
              label={t('customerFormMobile')}
              type="tel"
              inputMode="tel"
              name="mobilePhone"
              value={customer.mobilePhone}
              onChange={handleInputChange}
              required
              error={errors.mobilePhone}
            />
            <Input
              label={t('customerFormWhatsapp')}
              type="tel"
              inputMode="tel"
              name="whatsappPhone"
              value={customer.whatsappPhone}
              onChange={handleInputChange}
              required
              error={errors.whatsappPhone}
            />
            <Textarea
              label={t('customerFormAddress')}
              name="address"
              value={customer.address}
              onChange={handleInputChange}
              rows={3}
              required
              error={errors.address}
            />
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={customer.isActive}
                onChange={handleStatusChange}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label
                htmlFor="isActive"
                className="ms-2 block text-sm text-gray-900 dark:text-gray-300"
              >
              {t('customerFormActive')}
            </label>
          </div>
        </fieldset>
        {canWrite && (
          <div className="form-actions">
            <Button type="submit" loading={saving} size="lg" disabled={saving}>
              {t('customerFormSave')}
            </Button>
          </div>
        )}
      </form>
      </Card>
    </div>
  );
};

export default CustomerForm;

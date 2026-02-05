import React, { useState } from 'react';
import { Company } from '../../../types';
import { t } from '../../../src/i18n/t';
import { createCompany } from '../../../services/dataService';
import { useNotification } from '../../../contexts/NotificationContext';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { mapFirestoreError } from '../../../services/firebaseErrors';
import { getErrorMessage } from '../../../src/utils/errorMessage';

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyCreated: (newCompany: Company) => void;
}

const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  isOpen,
  onClose,
  onCompanyCreated,
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerFirstName, setOwnerFirstName] = useState('');
  const [ownerLastName, setOwnerLastName] = useState('');
  const [ownerMobile, setOwnerMobile] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { addNotification } = useNotification();

  const resetForm = () => {
    setName('');
    setAddress('');
    setCompanyId('');
    setOwnerEmail('');
    setOwnerFirstName('');
    setOwnerLastName('');
    setOwnerMobile('');
    setErrors({});
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t('companyNameRequired');
    if (!address.trim()) newErrors.address = t('companyAddressRequired');
    if (!companyId.trim()) newErrors.companyId = t('companyIdRequired');
    if (!ownerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
      newErrors.ownerEmail = t('validEmailRequired');
    }
    if (!ownerFirstName.trim()) newErrors.ownerFirstName = t('ownerFirstNameRequired');
    if (!ownerLastName.trim()) newErrors.ownerLastName = t('ownerLastNameRequired');
    if (!ownerMobile.trim()) newErrors.ownerMobile = t('ownerMobileRequired');
    if (!/^[a-z0-9-]+$/.test(companyId)) {
      newErrors.companyId = t('companyIdFormatError');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const payload = {
      id: companyId.trim(),
      companyName: name.trim(),
      ownerName: `${ownerFirstName.trim()} ${ownerLastName.trim()}`.trim(),
      phone: ownerMobile.trim(),
      email: ownerEmail.trim(),
      country: country.trim() || 'غير محدد',
      city: city.trim() || 'غير محدد',
      businessType: '',
      status: 'approved' as const,
    };

    try {
      const newCompany = await createCompany(payload);
      addNotification(t('companyCreatedSuccess'), 'success');
      onCompanyCreated(newCompany);
      resetForm();
    } catch (error: unknown) {
      console.error('[CreateCompany] Error creating company', getErrorMessage(error));
      const code = (error as Record<string, unknown>)?.code as string | undefined;
      if (code === 'already-exists') {
        setErrors((prev) => ({ ...prev, companyId: t('companyIdAlreadyInUse') }));
      } else {
        addNotification(mapFirestoreError(error), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    // Auto-generate companyId from name
    const slug = (newName || '')
      .toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w-]+/g, '') // Remove all non-word chars
      .replace(/--+/g, '-'); // Replace multiple - with single -
    setCompanyId(slug);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة شركة جديدة">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 mb-4">{t('companyDataTitle')}</h3>
        <Input
          label={t('companyNameLabel')}
          value={name}
          onChange={handleNameChange}
          error={errors.name}
          required
        />
        <Textarea
          label={t('companyAddressLabel')}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          error={errors.address}
          required
          rows={2}
        />
        <Input
          label={t('companyIdFormLabel')}
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          error={errors.companyId}
          required
          hint="يستخدم في الرابط، يجب أن يكون فريداً."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="البلد" value={country} onChange={(e) => setCountry(e.target.value)} />
          <Input label="المدينة" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>

        <h3 className="text-lg font-semibold border-b pb-2 mb-4 pt-4">بيانات المالك</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="الاسم الأول للمالك"
            value={ownerFirstName}
            onChange={(e) => setOwnerFirstName(e.target.value)}
            error={errors.ownerFirstName}
            required
          />
          <Input
            label="اسم العائلة للمالك"
            value={ownerLastName}
            onChange={(e) => setOwnerLastName(e.target.value)}
            error={errors.ownerLastName}
            required
          />
        </div>
        <Input
          label="بريد المالك"
          type="email"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          error={errors.ownerEmail}
          required
        />
        <Input
          label="رقم جوال المالك"
          type="tel"
          value={ownerMobile}
          onChange={(e) => setOwnerMobile(e.target.value)}
          error={errors.ownerMobile}
          required
        />

        <div className="flex justify-end gap-4 pt-4 border-t dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('commonCancel')}
          </Button>
          <Button type="submit" loading={loading}>
            {t('createCompanyButton')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateCompanyModal;

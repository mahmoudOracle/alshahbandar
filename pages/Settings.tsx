import React, { useState, useEffect } from 'react';
import { Settings, Tax, UserRole } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useNotification } from '../contexts/NotificationContext';
import { t } from '../src/i18n/t';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getFirebaseStorage } from '../services/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import NotAuthorizedPage from './NotAuthorizedPage';
import UserManagement from '../components/UserManagement';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { FormSkeleton } from '../components/ui/FormSkeleton';

const SettingsPage: React.FC = () => {
  const { settings: contextSettings, loading: loadingSettings, updateSettings } = useSettings();
  const { role, companyId } = useAuth();
  const canWrite = useCanWrite('settings');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const { addNotification } = useNotification();

  useEffect(() => {
    if (contextSettings) {
      setSettings(contextSettings);
    }
  }, [contextSettings]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (settings) {
      setSettings((prev) => ({ ...prev!, [name]: value }));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    // Upload to Firebase Storage under companies/{companyId}/logo_{timestamp}
    (async () => {
      try {
        const path = `companies/${companyId}/assets/logo_${Date.now()}_${file.name}`;
        const storage = getFirebaseStorage();
        const sref = storageRef(storage, path);
        const snap = await uploadBytes(sref, file);
        const url = await getDownloadURL(snap.ref);
        setSettings((prev) => ({ ...prev!, logo: url }));
      } catch (err) {
        console.error('Logo upload failed', err);
      }
    })();
  };

  const handleTaxChange = (index: number, field: keyof Tax, value: string | number) => {
    if (!settings) return;
    const newTaxes = [...settings.taxes];
    (newTaxes[index] as unknown as Record<string, unknown>)[field] = value;
    setSettings({ ...settings, taxes: newTaxes });
  };

  const addTax = () => {
    if (!settings) return;
    const newTax: Tax = { id: String(Date.now()), name: '', rate: 0 };
    setSettings({ ...settings, taxes: [...settings.taxes, newTax] });
  };

  const removeTax = (index: number) => {
    if (!settings) return;
    setSettings({ ...settings, taxes: settings.taxes.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !canWrite) {
      addNotification(t('insufficientPermissions'), 'error');
      return;
    }
    setSaving(true);
    try {
      await updateSettings(settings);
      addNotification('تم حفظ الإعدادات بنجاح!', 'success');
    } catch (error: unknown) {
      addNotification(
        String((error as unknown as { message?: unknown })?.message ?? 'Failed to save settings'),
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!companyId) {
    return <NotAuthorizedPage />;
  }

  if (loadingSettings || !settings)
    return (
      <Card>
        <FormSkeleton />
      </Card>
    );

  return (
    <div className="page-container lg">
      {/* Page Header */}
      <div className="page-section">
        <div className="ui-section-header">
          <div className="ui-section-text">
            <h1 className="ui-section-title">{t('settingsTitle') || 'الإعدادات'}</h1>
            <p className="ui-section-subtitle">{t('settingsSubtitle') || 'أدر إعدادات عملك'}</p>
          </div>
        </div>
      </div>

      {/* Access Denied Warning */}
      {!canWrite && (
        <div className="page-section">
          <Card variant="outlined">
            <div className="card-body">
              <div className="flex items-start gap-3">
                <div className="text-danger-600 text-xl">⚠️</div>
                <div>
                  <h3 className="font-semibold text-danger-700">{t('settingsAccessDenied') || 'لا توجد صلاحيات'}</h3>
                  <p className="text-sm text-gray-600 mt-1">{t('settingsAccessDeniedMsg') || 'لا تملك صلاحيات لتعديل الإعدادات'}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Settings Section */}
        <Card variant="elevated">
          <div className="card-header">
            <h2 className="card-title">🏢 {t('settingsBusiness') || 'إعدادات العمل'}</h2>
          </div>
          <fieldset disabled={!canWrite} className="card-body space-y-6">
            {/* Logo Upload */}
            <div className="border-b border-gray-200 pb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-4">{t('settingsLogo') || 'شعار العمل'}</label>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="h-24 w-24 rounded-lg overflow-hidden bg-gradient-to-br from-primary-50 to-accent-50 border-2 border-primary-200 flex items-center justify-center shadow-md">
                    {settings.logo ? (
                      <img
                        src={settings.logo}
                        alt={settings.businessName}
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <svg className="h-12 w-12 text-primary-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    )}
                  </div>
                </div>
                <div>
                  <input
                    type="file"
                    id="logo-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                  >
                    {settings.logo ? t('settingsChange') : t('settingsUpload')}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">{t('settingsLogoHint') || 'صيغ مدعومة: PNG, JPG'}</p>
                </div>
              </div>
            </div>

            {/* Business Name & Slogan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label={t('settingsBusinessName') || 'اسم العمل'}
                name="businessName"
                value={settings.businessName}
                onChange={handleInputChange}
                required
              />
              <Input
                label={t('settingsSlogan') || 'الشعار'}
                name="slogan"
                value={settings.slogan}
                onChange={handleInputChange}
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('settingsAddress') || 'العنوان'}</label>
              <Textarea
                name="address"
                value={settings.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full"
              />
            </div>

            {/* Contact & Currency Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label={t('settingsContact') || 'معلومات الاتصال'}
                name="contactInfo"
                value={settings.contactInfo}
                onChange={handleInputChange}
              />
              <Select
                label={t('settingsCurrency') || 'العملة الافتراضية'}
                name="currency"
                value={settings.currency}
                onChange={handleInputChange}
                options={[
                  { value: 'SAR', label: 'ريال سعودي (SAR)' },
                  { value: 'EGP', label: 'جنيه مصري (EGP)' },
                  { value: 'USD', label: 'دولار أمريكي (USD)' },
                  { value: 'AED', label: 'درهم إماراتي (AED)' },
                ]}
              />
            </div>

            {/* Language & Invoice Footer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label={t('settingsLanguage') || 'اللغة الافتراضية'}
                name="language"
                value={settings.language || 'ar'}
                onChange={handleInputChange}
                options={[
                  { value: 'ar', label: 'العربية' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </div>

            {/* Invoice Footer */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('settingsFooter') || 'تذييل الفاتورة'}</label>
              <Textarea
                name="invoiceFooter"
                value={settings.invoiceFooter || ''}
                onChange={handleInputChange}
                rows={3}
                className="w-full"
              />
            </div>
          </fieldset>
        </Card>

        {/* Tax Rates Section */}
        <Card variant="elevated">
          <div className="card-header">
            <h2 className="card-title">💰 {t('settingsTaxes') || 'معدلات الضريبة'}</h2>
          </div>
          <fieldset disabled={!canWrite} className="card-body space-y-4">
            <div className="space-y-3">
              {settings.taxes.map((tax, index) => (
                <div key={tax.id} className="flex gap-3 items-end p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-300 transition-colors">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{t('settingsTaxName') || 'اسم الضريبة'}</label>
                    <Input
                      placeholder={t('settingsTaxNamePlaceholder') || 'مثال: ضريبة القيمة المضافة'}
                      value={tax.name}
                      onChange={(e) => handleTaxChange(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{t('settingsTaxRate') || 'المعدل %'}</label>
                    <Input
                      type="number"
                      placeholder="15"
                      value={tax.rate}
                      onChange={(e) => handleTaxChange(index, 'rate', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                    />
                  </div>
                  {canWrite && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTax(index)}
                      aria-label={t('settingsRemoveTax') || 'حذف الضريبة'}
                      className="text-danger-600 hover:text-danger-700"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {canWrite && (
              <Button type="button" variant="secondary" onClick={addTax} className="w-full">
                <PlusIcon className="h-4 w-4 me-2" />
                {t('settingsAddTax') || 'إضافة ضريبة'}
              </Button>
            )}
          </fieldset>
        </Card>

        {/* Locked Periods Section */}
        <Card variant="elevated">
          <div className="card-header">
            <h2 className="card-title">🔒 {t('settingsLockedPeriods') || 'أقفال الدورات المحاسبية'}</h2>
          </div>
          <fieldset disabled={!canWrite} className="card-body space-y-4">
            <p className="text-sm text-gray-600">{t('settingsLockedPeriodsHint') || 'أغلق فترات محاسبية لمنع التعديلات على المستندات المؤرشفة'}</p>
            {canWrite && (
              <div className="flex items-end gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-2">{t('settingsSelectMonth') || 'اختر الشهر'}</label>
                  <input type="month" id="locked-period-input" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    const el = document.getElementById(
                      'locked-period-input'
                    ) as HTMLInputElement | null;
                    const val = el?.value;
                    if (!val || !settings) return;
                    const list = Array.isArray(settings.lockedPeriods)
                      ? [...settings.lockedPeriods]
                      : [];
                    if (!list.includes(val)) {
                      setSettings({ ...settings, lockedPeriods: [...list, val] });
                    }
                  }}
                >
                  {t('settingsAdd') || 'إضافة'}
                </Button>
              </div>
            )}
            {(settings.lockedPeriods || []).length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>{t('settingsNoLockedPeriods') || 'لا توجد فترات مغلقة'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(settings.lockedPeriods || []).map((p) => (
                  <div
                    key={p}
                    className="flex items-center justify-between bg-warning-50 border border-warning-200 rounded-lg px-4 py-3"
                  >
                    <span className="font-semibold text-warning-900">📅 {p}</span>
                    {canWrite && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!settings) return;
                          setSettings({
                            ...settings,
                            lockedPeriods: (settings.lockedPeriods || []).filter((x) => x !== p),
                          });
                        }}
                        className="text-danger-600"
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </fieldset>
        </Card>

        {/* Save Button */}
        {canWrite && (
          <div className="page-section flex justify-start">
            <Button type="submit" loading={saving} size="lg">
              {t('settingsSave') || 'حفظ الإعدادات'}
            </Button>
          </div>
        )}
      </form>

      {role === UserRole.Owner && <UserManagement />}
    </div>
  );
};

export default SettingsPage;



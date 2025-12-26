
import React, { useState, useEffect } from 'react';
import { Settings, Tax, UserRole } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useNotification } from '../contexts/NotificationContext';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { storage } from '../services/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import UserManagement from '../components/UserManagement';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { FormSkeleton } from '../components/ui/FormSkeleton';

const SettingsPage: React.FC = () => {
    const { settings: contextSettings, loading: loadingSettings, updateSettings } = useSettings();
    const { activeRole } = useAuth();
    const canWrite = useCanWrite('settings');
    const [settings, setSettings] = useState<Settings | null>(null);
    const [saving, setSaving] = useState(false);
    const { addNotification } = useNotification();

    useEffect(() => {
        if (contextSettings) {
            setSettings(contextSettings);
        }
    }, [contextSettings]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (settings) {
            setSettings(prev => ({ ...prev!, [name]: value }));
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeCompanyId) return;
        // Upload to Firebase Storage under companies/{companyId}/logo_{timestamp}
        (async () => {
            try {
                const path = `companies/${activeCompanyId}/assets/logo_${Date.now()}_${file.name}`;
                const sref = storageRef(storage, path);
                const snap = await uploadBytes(sref, file);
                const url = await getDownloadURL(snap.ref);
                setSettings(prev => ({ ...prev!, logo: url }));
            } catch (err) {
                console.error('Logo upload failed', err);
            }
        })();
    };
    
    const handleTaxChange = (index: number, field: keyof Tax, value: string | number) => {
        if (!settings) return;
        const newTaxes = [...settings.taxes];
        (newTaxes[index] as any)[field] = value;
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
             addNotification('صلاحية غير كافية.', 'error');
            return;
        }
        setSaving(true);
        try {
            await updateSettings(settings);
            addNotification('تم حفظ الإعدادات بنجاح!', 'success');
        } catch (error: any) {
            addNotification(error.message || 'Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loadingSettings || !settings) return <Card><FormSkeleton /></Card>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
                <Card header={<h2 className="text-xl font-bold">إعدادات العمل</h2>}>
                    <fieldset disabled={!canWrite} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium">شعار العمل</label>
                            <div className="mt-1 flex items-center gap-4">
                                <span className="inline-block h-20 w-20 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700">
                                    {settings.logo ? (
                                        <img src={settings.logo} alt="شعار العمل" className="h-full w-full object-contain" />
                                    ) : (
                                        <svg className="h-full w-full text-gray-300 dark:text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    )}
                                </span>
                                <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                <Button type="button" variant="secondary" onClick={() => document.getElementById('logo-upload')?.click()}>
                                    تغيير
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="اسم العمل" name="businessName" value={settings.businessName} onChange={handleInputChange} required />
                            <Input label="الشعار (Slogan)" name="slogan" value={settings.slogan} onChange={handleInputChange} />
                        </div>
                        <Textarea label="العنوان" name="address" value={settings.address} onChange={handleInputChange} rows={3} />
                        <Textarea label="نص تذييل الفاتورة" name="invoiceFooter" value={settings.invoiceFooter || ''} onChange={handleInputChange} rows={3} />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="معلومات الاتصال" name="contactInfo" value={settings.contactInfo} onChange={handleInputChange} />
                            <Select label="العملة الافتراضية" name="currency" value={settings.currency} onChange={handleInputChange}
                                options={[
                                    { value: 'SAR', label: 'ريال سعودي (SAR)' },
                                    { value: 'EGP', label: 'جنيه مصري (EGP)' },
                                    { value: 'USD', label: 'دولار أمريكي (USD)' },
                                    { value: 'AED', label: 'درهم إماراتي (AED)' },
                                ]}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            <Select label="اللغة الافتراضية" name="language" value={settings.language || 'ar'} onChange={handleInputChange}
                                options={[
                                    { value: 'ar', label: 'العربية' },
                                    { value: 'en', label: 'English' },
                                ]}
                            />
                        </div>
                    </fieldset>
                </Card>

                <Card header={<h3 className="text-xl font-bold">معدلات الضريبة</h3>}>
                    <fieldset disabled={!canWrite} className="space-y-4">
                        {settings.taxes.map((tax, index) => (
                            <div key={tax.id} className="grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-5"><Input placeholder="اسم الضريبة" value={tax.name} onChange={e => handleTaxChange(index, 'name', e.target.value)} /></div>
                                <div className="col-span-5"><Input type="number" placeholder="المعدل %" value={tax.rate} onChange={e => handleTaxChange(index, 'rate', parseFloat(e.target.value))} /></div>
                                <div className="col-span-2"><Button type="button" variant="ghost" size="sm" onClick={() => removeTax(index)} aria-label="حذف الضريبة"><TrashIcon className="h-5 w-5 text-danger-600" /></Button></div>
                            </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={addTax}>
                            <PlusIcon className="h-4 w-4 me-2" />
                            إضافة ضريبة
                        </Button>
                    </fieldset>
                </Card>
                
                {canWrite && (
                    <div className="flex justify-start">
                        <Button type="submit" loading={saving} size="lg">
                            حفظ الإعدادات
                        </Button>
                    </div>
                )}
            </form>
        
            {activeRole === UserRole.Owner && <UserManagement />}
        </div>
    );
};

export default SettingsPage;

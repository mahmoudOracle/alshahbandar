
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCustomerById, saveCustomer } from '../services/dataService';
import { Customer } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { FormSkeleton } from '../components/ui/FormSkeleton';
import { mapFirestoreError } from '../services/firebaseErrors';

const CustomerForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addNotification } = useNotification();
    const { activeCompanyId } = useAuth();
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
        if (!canWrite && id) { // Allow viewing
        } else if (!canWrite) {
            addNotification('ليس لديك الصلاحية للوصول لهذه الصفحة.', 'error');
            navigate('/customers');
        }
    }, [canWrite, id, navigate, addNotification]);

    useEffect(() => {
        if (id && activeCompanyId) {
            setLoading(true);
            getCustomerById(activeCompanyId, id).then(customerData => {
                if (customerData) {
                    const {id: _id, createdAt: _ca, ...data} = customerData;
                    setCustomer(data);
                } else {
                    addNotification('لم يتم العثور على العميل.', 'error');
                }
                setLoading(false);
            }).catch(error => {
                addNotification(mapFirestoreError(error), 'error');
                setLoading(false);
            });
        }
    }, [id, activeCompanyId, addNotification]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCustomer(prev => ({ ...prev, [name]: value }));
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomer(prev => ({ ...prev, isActive: e.target.checked }));
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!customer.name.trim()) newErrors.name = 'هذا الحقل مطلوب.';
        if (!customer.mobilePhone.trim()) newErrors.mobilePhone = 'هذا الحقل مطلوب.';
        if (!customer.whatsappPhone.trim()) newErrors.whatsappPhone = 'هذا الحقل مطلوب.';
        if (!customer.address.trim()) newErrors.address = 'هذا الحقل مطلوب.';
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (customer.email && !emailRegex.test(customer.email)) {
            newErrors.email = 'صيغة البريد الإلكتروني غير صحيحة.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canWrite) {
            addNotification('صلاحية غير كافية.', 'error');
            return;
        }
        if (!validateForm()) {
            addNotification('يرجى ملء جميع الحقول المطلوبة.', 'error');
            return;
        }
        if (!activeCompanyId) return;
        setSaving(true);
        try {
            const result = id 
                ? await saveCustomer(activeCompanyId, { ...customer, id } as Customer)
                : await saveCustomer(activeCompanyId, customer);
                
            if (result) {
                addNotification('تم حفظ العميل بنجاح!', 'success');
                navigate('/customers');
            } else {
                addNotification('فشل حفظ العميل.', 'error');
            }
        } catch (error: any) {
            addNotification(mapFirestoreError(error), 'error');
        }
        setSaving(false);
    };
    
    if (loading && id) return <Card><FormSkeleton /></Card>;

    return (
        <Card header={<h2 className="text-xl font-bold">{id ? 'تعديل عميل' : 'إضافة عميل جديد'}</h2>}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <fieldset disabled={!canWrite} className="space-y-6">
                    <Input label="الاسم الكامل" name="name" value={customer.name} onChange={handleInputChange} required error={errors.name} />
                    <Input label="البريد الإلكتروني (اختياري)" type="email" name="email" value={customer.email || ''} onChange={handleInputChange} error={errors.email} />
                    <Input label="رقم الموبايل" type="tel" name="mobilePhone" value={customer.mobilePhone} onChange={handleInputChange} required error={errors.mobilePhone} />
                    <Input label="رقم الواتساب" type="tel" name="whatsappPhone" value={customer.whatsappPhone} onChange={handleInputChange} required error={errors.whatsappPhone} />
                    <Textarea label="العنوان" name="address" value={customer.address} onChange={handleInputChange} rows={3} required error={errors.address} />
                    <div className="flex items-center">
                        <input type="checkbox" id="isActive" checked={customer.isActive} onChange={handleStatusChange} className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                        <label htmlFor="isActive" className="ms-2 block text-sm text-gray-900 dark:text-gray-300">عميل نشط</label>
                    </div>
                </fieldset>
                {canWrite &&
                    <div className="flex justify-start pt-4 border-t dark:border-gray-700">
                        <Button type="submit" loading={saving} size="lg">
                            حفظ العميل
                        </Button>
                    </div>
                }
            </form>
        </Card>
    );
};

export default CustomerForm;

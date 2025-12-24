
import React, { useState } from 'react';
import { Company } from '../../../types';
import { createCompany } from '../../../services/dataService';
import { useNotification } from '../../../contexts/NotificationContext';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { mapFirestoreError } from '../../../services/firebaseErrors';

interface CreateCompanyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCompanyCreated: (newCompany: Company) => void;
}

const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({ isOpen, onClose, onCompanyCreated }) => {
    const [name, setName] = useState('');
    const [companyId, setCompanyId] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [plan, setPlan] = useState('free');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const { addNotification } = useNotification();

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!name.trim()) newErrors.name = 'اسم الشركة مطلوب.';
        if (!companyId.trim()) newErrors.companyId = 'معرف الشركة مطلوب.';
        if (!ownerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
            newErrors.ownerEmail = 'بريد إلكتروني صالح مطلوب.';
        }
        if (!/^[a-z0-9-]+$/.test(companyId)) {
            newErrors.companyId = 'المعرف يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        
        setLoading(true);
        try {
            const newCompany = await createCompany({
                id: companyId,
                name,
                ownerEmail,
                plan,
            });
            addNotification('تم إنشاء الشركة بنجاح!', 'success');
            onCompanyCreated(newCompany);
            // Reset form
            setName('');
            setCompanyId('');
            setOwnerEmail('');
        } catch (error: any) {
            if (error.code === 'already-exists') {
                setErrors(prev => ({ ...prev, companyId: 'معرف الشركة هذا مستخدم بالفعل.' }));
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
        const slug = newName.toLowerCase()
            .replace(/\s+/g, '-') // Replace spaces with -
            .replace(/[^\w-]+/g, '') // Remove all non-word chars
            .replace(/--+/g, '-'); // Replace multiple - with single -
        setCompanyId(slug);
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="إضافة شركة جديدة">
            <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                    label="اسم الشركة"
                    value={name}
                    onChange={handleNameChange}
                    error={errors.name}
                    required
                />
                <Input
                    label="معرف الشركة (companyId)"
                    value={companyId}
                    onChange={e => setCompanyId(e.target.value)}
                    error={errors.companyId}
                    required
                    hint="يستخدم في الرابط، يجب أن يكون فريداً."
                />
                <Input
                    label="بريد المالك"
                    type="email"
                    value={ownerEmail}
                    onChange={e => setOwnerEmail(e.target.value)}
                    error={errors.ownerEmail}
                    required
                />
                 <Select
                    label="الخطة"
                    value={plan}
                    onChange={e => setPlan(e.target.value)}
                    options={[
                        { value: 'free', label: 'Free' },
                        { value: 'paid', label: 'Paid' },
                        { value: 'trial', label: 'Trial' },
                    ]}
                />
                <div className="flex justify-end gap-4 pt-4 border-t dark:border-gray-700">
                    <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
                    <Button type="submit" loading={loading}>إنشاء الشركة</Button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateCompanyModal;
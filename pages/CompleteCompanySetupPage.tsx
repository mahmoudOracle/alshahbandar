import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import * as dataService from '../services/dataService';
import { useNotification } from '../contexts/NotificationContext';

const CompleteCompanySetupPage: React.FC = () => {
    const { user, activeCompany } = useAuth();
    const navigate = useNavigate();
    const { addNotification } = useNotification();

    const [loading, setLoading] = useState(false);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState('');
    const [country, setCountry] = useState('');
    const [city, setCity] = useState('');
    const [phone, setPhone] = useState('');
    const [businessType, setBusinessType] = useState('');

    useEffect(() => {
        const load = async () => {
            if (!user) return;
            try {
                const profile: any = await dataService.getUserProfile(user.uid);
                if (!profile || !profile.companyId) {
                    addNotification('لم يتم ربط حسابك بشركة. لا يوجد شيء لإكماله.', 'error');
                    return;
                }
                setCompanyId(profile.companyId);
                // Prefer cached company from AuthContext if available
                const company: any = (activeCompany && activeCompany.id === profile.companyId) ? activeCompany : await dataService.getCompany(profile.companyId);
                if (!company) {
                    addNotification('لم يتم العثور على بيانات الشركة.', 'error');
                    return;
                }
                setCompanyName(company.companyName || '');
                setCountry(company.country || '');
                setCity(company.city || '');
                setPhone(company.phone || '');
                setBusinessType(company.businessType || '');
            } catch (err) {
                console.error(err);
            }
        };
        load();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyId) return;
        setLoading(true);
        try {
            await dataService.updateCompanyDetails(companyId, {
                companyName: companyName.trim(),
                country: country.trim(),
                city: city.trim(),
                phone: phone.trim(),
                businessType: businessType.trim(),
            });
            addNotification('تم حفظ بيانات الشركة بنجاح. سيتم إعلام الإدارة لمراجعتها.', 'success');
            navigate('/');
        } catch (err) {
            console.error(err);
            addNotification('فشل حفظ بيانات الشركة.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold">إكمال بيانات الشركة</h1>
                    <p className="text-sm text-gray-600">أكمل بيانات شركتك حتى يتمكن فريقنا من مراجعة واعتماد الحساب.</p>
                </div>
                <Card>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input label="اسم الشركة" id="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                        <Input label="الدولة" id="country" value={country} onChange={e => setCountry(e.target.value)} required />
                        <Input label="المدينة" id="city" value={city} onChange={e => setCity(e.target.value)} required />
                        <Input label="الهاتف" id="phone" value={phone} onChange={e => setPhone(e.target.value)} required />
                        <Input label="نوع النشاط (اختياري)" id="businessType" value={businessType} onChange={e => setBusinessType(e.target.value)} />
                        <Button type="submit" loading={loading} className="w-full">إرسال للمراجعة</Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default CompleteCompanySetupPage;

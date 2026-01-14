import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { useAuth } from '../contexts/AuthContext';
import { createPlatformCompanyWithManager } from '../services/dataService';
import NotAuthorizedPage from './NotAuthorizedPage';

type CreateResult = {
  companyId?: string;
  managerUid?: string;
  managerEmail?: string;
  tempPassword?: string;
};

const PlatformAdminPage: React.FC = () => {
  const { isPlatformAdmin } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [managerFullName, setManagerFullName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [maxUsers, setMaxUsers] = useState(10);
  const [status, setStatus] = useState<'approved' | 'pending' | 'rejected'>('approved');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);

  if (!isPlatformAdmin) return <NotAuthorizedPage />;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await createPlatformCompanyWithManager({
        companyName: companyName.trim(),
        managerFullName: managerFullName.trim(),
        managerEmail: managerEmail.trim(),
        managerPassword,
        maxUsers,
        status,
      });

      if (!res || !res.success) {
        throw new Error('فشل إنشاء الشركة.');
      }

      setResult({
        companyId: res.companyId,
        managerUid: res.managerUid,
        managerEmail: res.managerEmail,
        tempPassword: res.tempPassword,
      });

      setCompanyName('');
      setManagerFullName('');
      setManagerEmail('');
      setManagerPassword('');
      setMaxUsers(10);
      setStatus('approved');
    } catch (err) {
      setError((err as Error)?.message || 'حدث خطأ غير متوقع.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold">إضافة شركة جديدة</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            إدارة منصة "الشاهبندر لإدارة الأعمال"
          </p>
        </header>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <Input
                label="اسم الشركة"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">بيانات مدير الشركة</h2>
              <Input
                label="الاسم الكامل"
                value={managerFullName}
                onChange={(e) => setManagerFullName(e.target.value)}
                required
              />
              <Input
                label="البريد الإلكتروني"
                type="email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                required
              />
              <Input
                label="كلمة المرور المؤقتة"
                type="password"
                value={managerPassword}
                onChange={(e) => setManagerPassword(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="الحد الأقصى للمستخدمين"
                type="number"
                min={1}
                value={maxUsers}
                onChange={(e) => setMaxUsers(Number(e.target.value))}
              />
              <Select
                label="حالة الاشتراك"
                value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setStatus(e.target.value as 'approved' | 'pending' | 'rejected')
                }
                options={[
                  { value: 'approved', label: 'معتمد' },
                  { value: 'pending', label: 'قيد المراجعة' },
                  { value: 'rejected', label: 'مرفوض' },
                ]}
              />
            </div>

            {error && <div className="text-danger-600 text-sm">{error}</div>}

            <Button type="submit" disabled={loading}>
              {loading ? 'جارٍ الإنشاء...' : 'إنشاء الشركة'}
            </Button>
          </form>
        </Card>

        {result && (
          <Card>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">تم إنشاء الشركة بنجاح</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                رقم الشركة: <span className="font-semibold">{result.companyId}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                مدير الشركة: <span className="font-semibold">{result.managerEmail}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                كلمة المرور المؤقتة: <span className="font-semibold">{result.tempPassword}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                يرجى تغيير كلمة المرور بعد تسجيل الدخول لأول مرة.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PlatformAdminPage;

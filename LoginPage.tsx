import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from './components/ui/Card';
import { Input } from './components/ui/Input';
import { Button } from './components/ui/Button';
import LogoPlaceholder from './components/LogoPlaceholder';
import { signInWithEmail } from './services/authService';
import { useNotification } from './contexts/NotificationContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      addNotification(
        (err as Error).message || 'تعذر تسجيل الدخول. تأكد من البريد وكلمة المرور.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <div className="flex flex-col items-center gap-4">
            <LogoPlaceholder size={72} ariaLabel="شعار الشاهبندر" />
            <h1 className="text-2xl font-bold text-center">الشاهبندر</h1>
            <p className="text-sm text-center text-gray-600 dark:text-gray-300">
              نظام إدارة بسيط للتجارة والحسابات
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <Input
              id="email"
              label="البريد الإلكتروني"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="username@company.com"
            />
            <Input
              id="password"
              label="كلمة المرور"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />

            <div className="flex items-center justify-between">
              <Link to="/register" className="text-sm text-primary-600 hover:underline">
                إنشاء حساب جديد
              </Link>
              <Button type="submit" loading={loading} size="md">
                تسجيل الدخول
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;

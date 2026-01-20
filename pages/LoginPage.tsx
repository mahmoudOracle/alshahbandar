import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { signInWithEmail } from '../services/authService';
import { useNotification } from '../contexts/NotificationContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import useTenantConfig from '../hooks/useTenantConfig';
import { t } from '../services/i18n';
import LogoPlaceholder from '../components/LogoPlaceholder';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage } from '../src/utils/errorMessage';
import { LoadingScreen } from '../LoadingScreen';

const LoginPage: React.FC = () => {
  const { isLoggedIn, status } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const { addNotification } = useNotification();

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      // AuthProvider will handle state updates and routing.
    } catch (error: unknown) {
      const message = 'تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور.';
      addNotification(message, 'error');
      console.error(getErrorMessage(error, message));
    } finally {
      setLoading(false);
    }
  };

  const { config } = useTenantConfig();
  const lang = config?.language || 'ar';

  if (isLoggedIn) {
    return <Navigate to="/app" replace />;
  }

  if (status === 'authLoading' || status === 'resolvingMembership') {
    return <LoadingScreen message="جاري التحقق من صلاحيات الحساب..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="hidden md:flex flex-col items-start justify-center space-y-6 p-8 rounded-lg bg-gradient-to-br from-slate-50 to-white shadow">
          <LogoPlaceholder size={84} />
          <h2 className="text-3xl font-extrabold text-slate-900">{t('app_name', lang)}</h2>
          <p className="text-slate-600">{t('login_tagline', lang) || 'إدارة بسيطة وسريعة لأعمالك.'}</p>
          <div className="w-full mt-4">
            <ul className="space-y-2 text-sm text-slate-600">
              <li>واجهة واضحة وسهلة الاستخدام</li>
              <li>متابعة يومية للمبيعات والمصروفات</li>
              <li>قرارات أسرع بأقل خطوات</li>
            </ul>
          </div>
        </div>
        <div className="w-full">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl font-semibold text-slate-900">
              {t('sign_in', lang) || 'تسجيل الدخول'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {t('sign_in_sub', lang) || 'أدخل بياناتك للمتابعة'}
            </p>
          </div>
          <Card>
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <Input
                label="البريد الإلكتروني"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <Input
                label="كلمة المرور"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <Button type="submit" loading={loading} className="w-full" size="lg">
                {t('login_button', lang) || 'تسجيل الدخول'}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-slate-500">
              {t('no_account', lang) || 'ليس لديك حساب؟'}{' '}
              <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                {t('create_account', lang) || 'إنشاء حساب'}
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;


import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmail } from '../services/authService';
import { useNotification } from '../contexts/NotificationContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import useTenantConfig from '../hooks/useTenantConfig';
import { t } from '../services/i18n';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState<boolean>(false);
    const { addNotification } = useNotification();
    const navigate = useNavigate();

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signInWithEmail(email, password);
             // AuthProvider will handle navigation
        } catch (error: any) {
            let message = 'فشل تسجيل الدخول. يرجى التحقق من بريدك الإلكتروني وكلمة المرور.';
            if (error.code === 'auth/invalid-email') {
                message = 'صيغة البريد الإلكتروني المدخلة غير صحيحة.';
            } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
            } else if (error.code === 'auth/user-disabled') {
                message = 'تم تعطيل هذا الحساب.';
            }
            addNotification(message, 'error');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                            <div className="text-center mb-8">
                                <h1 className="text-4xl font-bold text-primary-600 dark:text-primary-400">{(useTenantConfig().config?.businessName) || t('app_name', (useTenantConfig().config?.language || 'ar'))}</h1>
                                <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">{t('welcome_back', (useTenantConfig().config?.language || 'ar'))}</p>
                            </div>
                <Card>
                    <form onSubmit={handleEmailSignIn} className="space-y-6">
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
                            تسجيل الدخول
                        </Button>
                    </form>
                     <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                        ليس لديك حساب؟{' '}
                        <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                            أنشئ حساباً جديداً
                        </Link>
                    </p>
                </Card>
            </div>
        </div>
    );
};

export default LoginPage;
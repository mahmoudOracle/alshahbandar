import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithGoogle, signInWithEmail } from '../services/authService';
import { useNotification } from '../contexts/NotificationContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState<'google' | 'email' | null>(null);
    const { addNotification } = useNotification();
    const navigate = useNavigate();

    const handleGoogleSignIn = async () => {
        setLoading('google');
        try {
            await signInWithGoogle();
            // AuthProvider will handle navigation
        } catch (error: any) {
            if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
                addNotification('تم إلغاء عملية تسجيل الدخول عبر جوجل.', 'info');
            } else {
                addNotification('فشل تسجيل الدخول باستخدام جوجل.', 'error');
            }
            console.error("Google Sign-In Error:", error);
        } finally {
            setLoading(null);
        }
    };

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading('email');
        try {
            await signInWithEmail(email, password);
             // AuthProvider will handle navigation
        } catch (error: any) {
            addNotification('فشل تسجيل الدخول. يرجى التحقق من بريدك الإلكتروني وكلمة المرور.', 'error');
            console.error(error);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-primary-600 dark:text-primary-400">الشاهبندر</h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">مرحباً بعودتك! قم بتسجيل الدخول للمتابعة.</p>
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
                        <Button type="submit" loading={loading === 'email'} className="w-full" size="lg">
                            تسجيل الدخول
                        </Button>
                    </form>
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">أو</span>
                        </div>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={handleGoogleSignIn}
                        loading={loading === 'google'}
                        className="w-full"
                        size="lg"
                    >
                        <svg className="w-5 h-5 me-2" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.6 1.62-4.88 1.62-3.87 0-7-3.13-7-7s3.13-7 7-7c2.2 0 3.68.88 4.75 1.95l2.43-2.43C19.6 1.89 16.47 0 12.48 0 5.88 0 .04 5.88.04 12.48s5.84 12.48 12.44 12.48c3.43 0 6.22-1.15 8.25-3.25 2.1-2.1 2.86-5.2 2.86-7.88 0-.9-.08-1.5-.2-2.18h-11Z"/></svg>
                        المتابعة باستخدام جوجل
                    </Button>
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

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerWithEmail } from '../services/authService';
import { useNotification } from '../contexts/NotificationContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

const RegisterPage: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { addNotification } = useNotification();

    const handleEmailRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await registerWithEmail(email, password, name);
            addNotification('تم إنشاء الحساب بنجاح! سيتم توجيهك الآن.', 'success');
            // AuthProvider will handle navigation
        } catch (error: any) {
            let message = 'فشل إنشاء الحساب.';
            if (error.code === 'auth/email-already-in-use') {
                message = 'هذا البريد الإلكتروني مستخدم بالفعل.';
            } else if (error.code === 'auth/weak-password') {
                message = 'كلمة المرور ضعيفة جداً. يجب أن تتكون من 6 أحرف على الأقل.';
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
                    <h1 className="text-4xl font-bold text-primary-600 dark:text-primary-400">إنشاء حساب جديد</h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">انضم إلى الشاهبندر لإدارة أعمالك.</p>
                </div>
                <Card>
                    <form onSubmit={handleEmailRegister} className="space-y-6">
                        <Input
                            label="الاسم الكامل"
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoComplete="name"
                        />
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
                            autoComplete="new-password"
                        />
                        <Button type="submit" loading={loading} className="w-full" size="lg">
                            إنشاء حساب
                        </Button>
                    </form>
                     <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                        لديك حساب بالفعل؟{' '}
                        <Link to="/" className="font-medium text-primary-600 hover:text-primary-500">
                            قم بتسجيل الدخول
                        </Link>
                    </p>
                </Card>
            </div>
        </div>
    );
};

export default RegisterPage;

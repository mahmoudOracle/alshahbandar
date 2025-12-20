
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerWithEmail } from '../services/authService';
import { createCompanyWithOwner, createOwnerCompanyCallable } from '../services/firestoreService';
import { FirebaseError } from 'firebase/app';
import { useNotification } from '../contexts/NotificationContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

const RegisterPage: React.FC = () => {
    const [step, setStep] = useState<'details' | 'auth'>('details');
    
    // Step 1: Owner & Company Details
    const [ownerFirstName, setOwnerFirstName] = useState('');
    const [ownerLastName, setOwnerLastName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');
    const [country, setCountry] = useState('');
    const [city, setCity] = useState('');
    const [ownerMobile, setOwnerMobile] = useState('');
    
    // Step 2: Authentication
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [loading, setLoading] = useState(false);
    const { addNotification } = useNotification();

    const handleDetailsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Enforce required company fields
        if (!ownerFirstName || !ownerLastName || !companyName || !companyAddress || !country || !city || !ownerMobile) {
            addNotification('برجاء ملء جميع الحقول المطلوبة (بما في ذلك الدولة، المدينة، ورقم الهاتف).', 'error');
            return;
        }
        setStep('auth');
    };

    const handleBackToDetails = () => {
        setStep('details');
    };

    const handleEmailRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            addNotification('كلمتا المرور غير متطابقتين.', 'error');
            return;
        }
        if (!email) {
            addNotification('البريد الإلكتروني مطلوب.', 'error');
            return;
        }
        
        setLoading(true);
        try {
            // Register with Firebase Auth only - simple and cost-effective
            console.log('[DEBUG][Register] Registering user with email:', email);
            const user = await registerWithEmail(email, password);

            // Force refresh ID token to ensure Firestore security rules see the latest auth token
            try {
                if (user && typeof (user as any).getIdToken === 'function') {
                    console.log('[DEBUG][Register] Refreshing ID token for new user');
                    await (user as any).getIdToken(true);
                }
            } catch (tokenErr) {
                console.warn('[DEBUG][Register] Failed to refresh ID token; proceeding anyway', tokenErr);
            }

            // Create company and link the user as owner.
            // Prefer server-side callable to avoid client rule issues; fall back to client batch with a retry.
            console.log('🔍 [Register] Creating company document for uid:', user.uid);
            try {
                // Try callable first (server-side creation)
                try {
                    const callablePayload = await createOwnerCompanyCallable({
                        ownerFirstName: ownerFirstName.trim(),
                        ownerLastName: ownerLastName.trim(),
                        companyName: companyName.trim(),
                        companyAddress: companyAddress.trim(),
                        ownerMobile: ownerMobile.trim(),
                    });
                    if (callablePayload && callablePayload.companyId) {
                        console.log('🟢 [Register] Company created via callable', callablePayload.companyId);
                        addNotification('تم إنشاء الحساب والشركة بنجاح! بانتظار موافقة المسؤول.', 'success');
                    } else {
                        console.log('🟡 [Register] createOwnerCompanyCallable returned', callablePayload);
                        addNotification('تم إنشاء الحساب لكن حدث تحذير أثناء إنشاء الشركة؛ تواصل مع الدعم.', 'warning');
                    }
                } catch (callErr) {
                    // Callable may not be deployed in dev — fallback to client-side write with a small delay
                    console.warn('[Register] createOwnerCompanyCallable failed, falling back to client write', callErr);

                    // Ensure token propagation: refresh token and wait briefly
                    try {
                        if (user && typeof (user as any).getIdToken === 'function') {
                            await (user as any).getIdToken(true);
                        }
                    } catch (tokenErr) {
                        console.warn('[Register] Token refresh failed before fallback write', tokenErr);
                    }
                    // brief delay for auth state propagation
                    await new Promise(res => setTimeout(res, 600));

                    try {
                        const payload = await createCompanyWithOwner(user.uid, email.trim(), {
                            companyName: companyName.trim(),
                            ownerName: `${ownerFirstName.trim()} ${ownerLastName.trim()}`,
                            phone: ownerMobile.trim() || '',
                            country: country.trim(),
                            city: city.trim(),
                            businessType: '',
                            companyAddress: companyAddress.trim(),
                        } as any);
                        if (payload && payload.companyId) {
                            console.log('🟢 [Register] Company created successfully (client write)', payload.companyId);
                            addNotification('تم إنشاء الحساب والشركة بنجاح! بانتظار موافقة المسؤول.', 'success');
                        } else {
                            console.warn('🟡 [Register] createCompanyWithOwner did not return companyId', payload);
                            addNotification('تم إنشاء الحساب لكن حدث تحذير أثناء إنشاء الشركة؛ تواصل مع الدعم.', 'warning');
                        }
                    } catch (createErr) {
                        console.error('🔴 [Register] Failed to create company document for uid (client write):', user.uid, createErr);
                        // Provide actionable message for permission errors
                        if ((createErr as any)?.code === 'permission-denied') {
                            addNotification('لا يمكن إنشاء بيانات الشركة بسبب قيود قواعد الأمان. تأكد من إعداد قواعد Firestore أو قم بنشر الوظائف السحابية المطلوبة.', 'error');
                        } else {
                            addNotification('فشل إنشاء بيانات الشركة. حاول مرة أخرى أو تواصل مع الدعم.', 'error');
                        }
                        // Do not throw to avoid leaving user in unknown state; user account exists regardless
                    }
                }
            } catch (err) {
                console.error('🔴 [Register] Unexpected error during company creation flow', err);
                addNotification('حدث خطأ غير متوقع أثناء إنشاء الشركة. تواصل مع الدعم.', 'error');
            }
        } catch (error: any) {
            let message = 'فشل إنشاء الحساب. حدث خطأ غير متوقع.';
            if (error instanceof FirebaseError) {
                console.error('[DEBUG][Register] FirebaseError code:', error.code, 'message:', error.message);
                switch (error.code) {
                    case 'auth/configuration-not-found':
                        message = 'إعدادات مصادقة Firebase غير مكتملة. يرجى تمكين طريقة تسجيل البريد الإلكتروني/كلمة المرور في وحدة تحكم Firebase.';
                        break;
                    case 'auth/email-already-in-use':
                        message = 'هذا البريد الإلكتروني مستخدم بالفعل. برجاء استخدام بريد آخر.';
                        break;
                    case 'auth/weak-password':
                        message = 'كلمة المرور ضعيفة جداً. برجاء اختيار كلمة مرور أقوى (على الأقل 6 أحرف).';
                        break;
                    case 'auth/invalid-email':
                        message = 'صيغة البريد الإلكتروني غير صحيحة. برجاء التحقق من البريد.';
                        break;
                    case 'auth/operation-not-allowed':
                        message = 'تسجيل المستخدمين غير مُفعل في إعدادات Firebase Auth.';
                        break;
                    case 'auth/network-request-failed':
                        message = 'فشل الاتصال بالشبكة. برجاء التأكد من الاتصال وحاول مرة أخرى.';
                        break;
                    default:
                        message = 'فشل إنشاء الحساب. كود الخطأ: ' + error.code;
                        break;
                }
            } else {
                console.error('[DEBUG][Register] Error during registration:', error);
                message = error?.message || message;
            }
            addNotification(message, 'error');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-primary-600 dark:text-primary-400">
                        {step === 'details' ? 'إنشاء حساب جديد' : 'إعداد تسجيل الدخول'}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">
                        {step === 'details' ? 'أخبرنا عن شركتك وملاكها' : 'أكمل إعداد بيانات تسجيل الدخول'}
                    </p>
                </div>
                <Card>
                    {step === 'details' ? (
                        <form onSubmit={handleDetailsSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="الاسم الأول"
                                    id="ownerFirstName"
                                    type="text"
                                    value={ownerFirstName}
                                    onChange={(e) => setOwnerFirstName(e.target.value)}
                                    required
                                    placeholder="محمد"
                                />
                                <Input
                                    label="الاسم الأخير"
                                    id="ownerLastName"
                                    type="text"
                                    value={ownerLastName}
                                    onChange={(e) => setOwnerLastName(e.target.value)}
                                    required
                                    placeholder="علي"
                                />
                            </div>
                            <Input
                                label="اسم الشركة"
                                id="companyName"
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                                placeholder="شركتي"
                            />
                            <Input
                                label="عنوان الشركة"
                                id="companyAddress"
                                type="text"
                                value={companyAddress}
                                onChange={(e) => setCompanyAddress(e.target.value)}
                                required
                                placeholder="الرياض، المملكة العربية السعودية"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="الدولة"
                                    id="country"
                                    type="text"
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    required
                                    placeholder="المملكة العربية السعودية"
                                />
                                <Input
                                    label="المدينة"
                                    id="city"
                                    type="text"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    required
                                    placeholder="الرياض"
                                />
                            </div>
                            <Input
                                label="رقم الهاتف (اختياري)"
                                id="ownerMobile"
                                type="tel"
                                value={ownerMobile}
                                onChange={(e) => setOwnerMobile(e.target.value)}
                                placeholder="+966501234567"
                            />
                            <Button type="submit" className="w-full" size="lg">
                                التالي
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleEmailRegister} className="space-y-6">
                            <Input
                                label="البريد الإلكتروني"
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                placeholder="hoodaalawamry@gmail.com"
                            />
                            <Input
                                label="كلمة المرور"
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                                placeholder="أدخل كلمة مرور قوية"
                            />
                            <Input
                                label="تأكيد كلمة المرور"
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                                placeholder="أعد إدخال كلمة المرور"
                            />
                            <div className="flex gap-4">
                                <Button 
                                    type="button" 
                                    variant="secondary" 
                                    onClick={handleBackToDetails} 
                                    className="flex-1" 
                                    size="lg"
                                    disabled={loading}
                                >
                                    السابق
                                </Button>
                                <Button 
                                    type="submit" 
                                    loading={loading} 
                                    className="flex-1" 
                                    size="lg"
                                >
                                    إنشاء حساب
                                </Button>
                            </div>
                        </form>
                    )}
                    {step === 'details' && (
                        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                            لديك حساب بالفعل؟{' '}
                            <Link to="/" className="font-medium text-primary-600 hover:text-primary-500">
                                قم بتسجيل الدخول
                            </Link>
                        </p>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default RegisterPage;

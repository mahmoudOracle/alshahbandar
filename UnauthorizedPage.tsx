import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export const UnauthorizedPage = () => {
  const { status, user, logout } = useAuth();

  // If somehow we ended up here but are actually authorized, go to app
  if (status === 'authorized') {
    return <Navigate to="/app" replace />;
  }

  // If logged out, go to login
  if (status === 'loggedOut') {
    return <Navigate to="/login" replace />;
  }

  let title = "غير مصرح لك بالدخول";
  let message = "لا تملك الصلاحيات الكافية للوصول إلى هذا النظام.";

  if (status === 'unauthorized_notMember') {
    message = "حسابك غير مسجل ضمن أعضاء الشركة. يرجى التواصل مع المسؤول.";
  } else if (status === 'unauthorized_companyInactive') {
    title = "الشركة غير نشطة";
    message = "تم إيقاف حساب الشركة مؤقتاً. يرجى التواصل مع الدعم الفني.";
  } else if (status === 'error') {
    title = "خطأ في النظام";
    message = "حدث خطأ أثناء التحقق من البيانات. يرجى المحاولة مرة أخرى.";
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 dir="rtl" style={{ color: '#d32f2f' }}>{title}</h1>
      <p dir="rtl" style={{ fontSize: '1.1rem', margin: '20px 0' }}>
        {message}
      </p>
      <p style={{ color: '#666' }}>{user?.email}</p>
      
      <button onClick={() => logout()} style={{ padding: '10px 20px', cursor: 'pointer' }}>
        تسجيل الخروج (Logout)
      </button>
    </div>
  );
};
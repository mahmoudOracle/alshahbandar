import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';

export const AuthGuard = () => {
  const { status } = useAuth();

  switch (status) {
    case 'authLoading':
      return <LoadingScreen message="جاري تسجيل الدخول..." />;
    case 'resolvingMembership':
      return <LoadingScreen message="جاري التحقق من صلاحيات الحساب..." />;

    case 'loggedOut':
      return <Navigate to="/login" replace />;

    case 'unauthorized_notMember':
    case 'unauthorized_companyInactive':
    case 'error':
      return <Navigate to="/unauthorized" replace />;

    case 'authorized':
      return <Outlet />;

    default:
      // Fallback safety
      return <Navigate to="/login" replace />;
  }
};

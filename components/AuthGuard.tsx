import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from './LoadingScreen';
import { t } from '../src/i18n/t';

export const AuthGuard = () => {
  const { status } = useAuth();

  switch (status) {
    case 'authLoading':
    case 'resolvingMembership':
      return <LoadingScreen message={t('loadingCheckingAccess')} />;

    case 'loggedOut':
      return <Navigate to="/login" replace />;

    case 'unauthorized_notMember':
    case 'unauthorized_companyInactive':
    case 'error':
      return <Navigate to="/unauthorized" replace />;

    case 'authorized':
      return <Outlet />;

    default:
      return <Navigate to="/login" replace />;
  }
};

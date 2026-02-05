import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { t } from '../src/i18n/t';

export const UnauthorizedPage = () => {
  const { status, user, logout } = useAuth();

  if (status === 'authorized') {
    return <Navigate to="/app" replace />;
  }

  if (status === 'loggedOut') {
    return <Navigate to="/login" replace />;
  }

  let title = t('unauthorizedTitle');
  let message = t('unauthorizedMessage');

  if (status === 'unauthorized_notMember') {
    message = t('unauthorizedNotMember');
  } else if (status === 'unauthorized_companyInactive') {
    title = t('unauthorizedCompanyInactiveTitle');
    message = t('unauthorizedCompanyInactiveMessage');
  } else if (status === 'error') {
    title = t('unauthorizedErrorTitle');
    message = t('unauthorizedErrorMessage');
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
        {t('logoutLabel')}
      </button>
    </div>
  );
};

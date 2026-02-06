import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import NotAuthorizedPage from './NotAuthorizedPage';

const PlatformAdminPage: React.FC = () => {
  const auth = useAuth();
  return <NotAuthorizedPage />;
};

export default PlatformAdminPage;

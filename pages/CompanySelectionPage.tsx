import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const CompanySelectionPage: React.FC = () => {
  const { status } = useAuth();
  const navigate = useNavigate();

  // In single-tenant mode, redirect to app instead of showing company selection
  useEffect(() => {
    if (status === 'authorized') {
      navigate('/app');
    }
  }, [status, navigate]);

  return <div>Loading...</div>;
};

export default CompanySelectionPage;

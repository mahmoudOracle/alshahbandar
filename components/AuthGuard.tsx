import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FullPageSpinner } from './Spinner';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import PlatformCompaniesPage from '../pages/admin/PlatformCompaniesPage';
import CompanySelectionPage from '../pages/CompanySelectionPage';
import NoAccessPage from '../pages/NoAccessPage';
import { HashRouter, Routes, Route } from 'react-router-dom';

const AppContent = React.lazy(() => import('../App'));

export const AuthGuard: React.FC = () => {
    const { 
        firebaseUser, 
        authLoading, 
        isPlatformAdmin, 
        activeCompanyId, 
        companyMemberships 
    } = useAuth();

    if (authLoading) {
        return <FullPageSpinner />;
    }

    if (!firebaseUser) {
        return (
             <HashRouter>
                <Routes>
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="*" element={<LoginPage />} />
                </Routes>
            </HashRouter>
        );
    }
    
    if (isPlatformAdmin) {
        // Correctly route to the real admin dashboard
        return <PlatformCompaniesPage />;
    }

    if (companyMemberships.length > 1 && !activeCompanyId) {
        return <CompanySelectionPage />;
    }

    if (companyMemberships.length === 0) {
        return <NoAccessPage />;
    }
    
    if (activeCompanyId) {
        return <AppContent />;
    }

    // Fallback case, should ideally not be reached
    return <NoAccessPage />;
};
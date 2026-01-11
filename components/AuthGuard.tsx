
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FullPageSpinner } from './Spinner';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import { HashRouter, Routes, Route } from 'react-router-dom';

const AppContent = React.lazy(() => import('../App'));

export const AuthGuard: React.FC = () => {
    const { 
        firebaseUser, 
        authLoading, 
        activeCompanyId 
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
    
    if (activeCompanyId) {
        return <AppContent />;
    }

    // Fallback while company is being created and assigned, or if something went wrong.
    return <FullPageSpinner />;
};
import React from 'react';
import { useAuth, AuthPhase, CompanyPhase } from '../contexts/AuthContext';
import { FullPageSpinner } from './Spinner';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import CompanySelectionPage from '../pages/CompanySelectionPage';
import NoAccessPage from '../pages/NoAccessPage';
import FatalErrorPage from '../pages/FatalErrorPage';
import { HashRouter, Routes, Route } from 'react-router-dom';

const AcceptInvitationPage = React.lazy(() => import('../pages/AcceptInvitationPage'));
const AppContent = React.lazy(() => import('../App'));

export const AuthGuard: React.FC = () => {
  const {
    firebaseUser,
    authPhase,
    companyPhase,
    authErrorMessage,
    authRole,
    activeCompanyId,
    companyMemberships,
  } = useAuth();

  if (import.meta.env.DEV) {
    console.info('[AUTH_GUARD_DEBUG]', { authPhase, companyPhase, message: authErrorMessage });
  }

  // Show spinner during initial auth check or while loading company data for a tenant.
  if (authPhase === 'loading' || (authRole === 'tenant' && companyPhase === 'loading')) {
    return <FullPageSpinner />;
  }

  // Show a terminal error page if auth fails or company data fails to load.
  if (authPhase === 'terminal_error' || authPhase === 'unauthorized' || companyPhase === 'error') {
    return <FatalErrorPage message={authErrorMessage} />;
  }

  // From here, authPhase is 'resolved' and companyPhase is 'resolved' or 'idle'.

  // If auth is resolved but there's no user, show public routes (Login/Register).
  if (!firebaseUser) {
    return (
      <HashRouter>
        <React.Suspense fallback={<FullPageSpinner />}>
          <Routes>
            <Route path="/invite/accept" element={<AcceptInvitationPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<LoginPage />} />
          </Routes>
        </React.Suspense>
      </HashRouter>
    );
  }

  // If user has multiple company memberships but hasn't selected one, show selection page.
  if (authRole === 'tenant' && companyMemberships.length > 1 && !activeCompanyId) {
    return <CompanySelectionPage />;
  }
  
  // If user is authenticated but their role couldn't be determined, show an error.
  if (authRole === 'unknown') {
    return <FatalErrorPage message={authErrorMessage || 'Your user role could not be determined.'} />;
  }

  // If we have an active company or the user is a platform admin, show the main app.
  if (activeCompanyId || authRole === 'platformAdmin') {
    return <AppContent />;
  }

  // Fallback case for a resolved state but no clear path forward (e.g., tenant with no company).
  return <NoAccessPage />;
};

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';
import AppShell from './src/layout/AppShell';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import DevDbInspector from './pages/dev/DevDbInspector';
import FirebaseSetupRequiredPage from './pages/FirebaseSetupRequiredPage';
import { APP_ROUTES } from './src/routes';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/setup/firebase" element={<FirebaseSetupRequiredPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected Routes - Generated from unified APP_ROUTES */}
      <Route path="/app" element={<AuthGuard />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          
          {/* Dynamically generate routes from APP_ROUTES (excluding public routes) */}
          {APP_ROUTES.filter(
            (route) =>
              route.path.startsWith('/app/') &&
              !route.path.includes(':companyId') &&
              !route.path.includes('/complete-setup') &&
              !route.path.includes('/invite')
          ).map((route) => (
            <Route
              key={route.id}
              path={route.path.replace('/app/', '')}
              element={route.component as React.ReactElement}
            />
          ))}
        </Route>
      </Route>

      {import.meta.env.DEV && <Route path="/dev/db" element={<DevDbInspector />} />}
      {/* Catch all - Redirect to app (AuthGuard will handle login redirect if needed) */}
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

export default App;

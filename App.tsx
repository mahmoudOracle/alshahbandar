import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected Routes */}
      <Route path="/app" element={<AuthGuard />}>
        {/* All protected app routes go here */}
        <Route index element={<div style={{ padding: 20 }}>Welcome to Al Shabandar App</div>} />
      </Route>

      {/* Catch all - Redirect to app (AuthGuard will handle login redirect if needed) */}
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

export default App;

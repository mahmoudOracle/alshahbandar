import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import MobileBottomNav from '../../components/MobileBottomNav';

/**
 * AppShell - Global layout container
 * 
 * Structure:
 * - RTL safe with dir="rtl"
 * - Sidebar (desktop only)
 * - Content area with max-width centering
 * - Mobile bottom nav
 * - Calm spacing: 16px mobile, 24px desktop
 */
const AppShell: React.FC = () => {
  return (
    <div className="appShell" dir="rtl">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="content">
        <div className="content-inner">
          {/* Route outlet with calm page structure */}
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

export default AppShell;

import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';

const AppShell: React.FC = () => {
  return (
    <div className="appShell" dir="rtl">
      <Sidebar />
      <main className="content">
        <div className="content-inner">
          <Outlet />
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default AppShell;

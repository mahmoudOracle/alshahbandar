import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import { useSettings } from '../contexts/SettingsContext';

const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { settings } = useSettings();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <div className="md:flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 min-h-screen">
          <header className="sticky top-0 z-20 flex items-center gap-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3 md:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="h-10 w-10 inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              {settings?.businessName || 'Al Shabandar'}
            </div>
          </header>

          <main className="px-4 py-4 pb-24 md:pb-6">
            <Outlet />
          </main>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default AppShell;

import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Bars3Icon, 
  XMarkIcon,
  HomeIcon,
  DocumentDuplicateIcon,
  UserGroupIcon,
  CubeIcon,
  SparklesIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LanguageToggle from '../components/LanguageToggle';
import ThemeToggle from '../components/ThemeToggle';

const ModernAppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, company } = useAuth();

  const navItems = [
    { path: '/app/reports', label: 'Dashboard', icon: HomeIcon },
    { path: '/app/invoices', label: 'Invoices', icon: DocumentDuplicateIcon },
    { path: '/app/customers', label: 'Customers', icon: UserGroupIcon },
    { path: '/app/products', label: 'Products', icon: CubeIcon },
    { path: '/app/suppliers', label: 'Suppliers', icon: ShoppingCartIcon },
    { path: '/app/purchases', label: 'Purchases', icon: ChartBarIcon },
    { path: '/app/expenses', label: 'Expenses', icon: CurrencyDollarIcon },
    { path: '/app/settings', label: 'Settings', icon: Cog6ToothIcon },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="app-layout" dir="rtl">
      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{
        width: sidebarOpen ? '280px' : '60px',
        transition: 'width var(--transition-base)',
      }}>
        <div style={{ padding: 'var(--space-lg)' }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: 'var(--primary)',
            marginBottom: 'var(--space-xl)',
            textAlign: sidebarOpen ? 'start' : 'center',
            whiteSpace: 'nowrap',
          }}>
            {sidebarOpen ? '📊 Alshabandar' : '📊'}
          </div>

          {/* NAVIGATION */}
          <nav>
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                title={!sidebarOpen ? item.label : ''}
              >
                <item.icon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>

          {/* DIVIDER */}
          <div style={{
            height: '1px',
            backgroundColor: 'var(--border)',
            margin: 'var(--space-xl) 0',
          }} />

          {/* THEME & LANGUAGE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div style={{ padding: '0 var(--space-md)' }}>
              <ThemeToggle />
            </div>
            <div style={{ padding: '0 var(--space-md)' }}>
              <LanguageToggle />
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="main-content" style={{ flex: 1, overflow: 'auto', backgroundColor: 'var(--bg-secondary)' }}>
        {/* TOP BAR */}
        <header style={{
          backgroundColor: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border)',
          padding: 'var(--space-lg) var(--space-xl)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-lg)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
            <button
              className="btn btn-ghost"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ padding: 'var(--space-md)' }}
            >
              {sidebarOpen ? (
                <XMarkIcon style={{ width: '24px', height: '24px' }} />
              ) : (
                <Bars3Icon style={{ width: '24px', height: '24px' }} />
              )}
            </button>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                {company?.name || 'Company'}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                {user?.email}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
            <span style={{
              padding: '6px 12px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              fontWeight: '500',
              color: 'var(--text-secondary)',
            }}>
              {new Date().toLocaleDateString()}
            </span>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main style={{ paddingBottom: 'var(--space-3xl)' }}>
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav style={{
        display: 'none',
        '@media (max-width: 768px)': {
          display: 'flex',
        },
        backgroundColor: 'var(--bg-primary)',
        borderTop: '1px solid var(--border)',
        padding: 'var(--space-md)',
        justifyContent: 'space-around',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
      }} as any}>
        {navItems.slice(0, 4).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              color: isActive(item.path) ? 'var(--primary)' : 'var(--text-secondary)',
              fontSize: '10px',
            }}
          >
            <item.icon style={{ width: '24px', height: '24px' }} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          nav {
            display: flex !important;
          }
          .main-content {
            padding-bottom: 80px;
          }
        }
      `}</style>
    </div>
  );
};

export default ModernAppShell;

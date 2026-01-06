import React, { useState, useEffect, Suspense } from 'react';
import { HashRouter, Routes, Route, useLocation, matchPath } from 'react-router-dom';
import { Bars3Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import Sidebar from './components/Sidebar';
import { SettingsProvider } from './contexts/SettingsContext';
import { useAuth } from './contexts/AuthContext';
import ThemeToggle from './components/ThemeToggle';
import CommandBar from './components/CommandBar';
import { FullPageSpinner } from './components/Spinner';
import OfflineBanner from './components/OfflineBanner';
import OnboardingBanner from './components/OnboardingBanner';
import ErrorBoundary from '@/components/ErrorBoundary';
import { DataIsolationDebug } from '@/components/DataIsolationDebug';
import { routes } from '@/src/routes';
import MobileBottomNav from './components/MobileBottomNav';
import LogoPlaceholder from './components/LogoPlaceholder';
import Avatar from './components/Avatar';
import { designTokens } from './design-tokens';
import { Link } from 'react-router-dom';

// Inline small header user menu (keeps App layout simple). Uses AuthContext to access user and memberships.
const HeaderUserMenu: React.FC = () => {
  const { firebaseUser, companyMemberships, activeCompanyId, setActiveCompanyId, signOutUser } =
    useAuth();
  const [open, setOpen] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const displayName = firebaseUser?.displayName || firebaseUser?.email || 'User';

  React.useEffect(() => {
    if (!open) return;
    // focus first actionable element when menu opens
    const el = menuRef.current?.querySelector<HTMLElement>('a,button');
    el?.focus();
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!menuRef.current) return;
    const focusables = Array.from(menuRef.current.querySelectorAll<HTMLElement>('a,button'));
    const idx = focusables.indexOf(document.activeElement as HTMLElement);

    if (e.key === 'Escape') {
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = focusables[(idx + 1) % focusables.length];
      next?.focus();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = focusables[(idx - 1 + focusables.length) % focusables.length];
      prev?.focus();
      return;
    }
    // trap tab within menu
    if (e.key === 'Tab') {
      if (focusables.length === 0) return;
      if (e.shiftKey && idx === 0) {
        e.preventDefault();
        focusables[focusables.length - 1].focus();
      } else if (!e.shiftKey && idx === focusables.length - 1) {
        e.preventDefault();
        focusables[0].focus();
      }
    }
  };

  return (
    <div className="relative ms-3">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 text-white rounded-md px-2 py-1 hover:bg-white/10"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Avatar name={firebaseUser?.displayName} email={firebaseUser?.email} size={36} />
        <span className="text-sm hidden sm:inline">{displayName}</span>
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            d="M6 8l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          onKeyDown={handleKeyDown}
          className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md shadow-lg z-50"
          role="menu"
        >
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <div className="text-sm font-semibold">{displayName}</div>
            <div className="text-xs text-gray-500">{activeCompanyId}</div>
          </div>
          <ul className="py-1">
            <li>
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                role="menuitem"
              >
                Profile
              </Link>
            </li>
            <li>
              <button
                onClick={() => {
                  setOpen(false);
                  signOutUser().catch(() => {});
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                role="menuitem"
              >
                Sign out
              </button>
            </li>
            {companyMemberships && companyMemberships.length > 1 && (
              <li>
                <div className="p-2 text-xs text-gray-500">Switch company</div>
                {companyMemberships.map((m) => (
                  <button
                    key={m.companyId}
                    onClick={() => {
                      setActiveCompanyId(m.companyId);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    role="menuitem"
                  >
                    {m.companyName}
                  </button>
                ))}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

const AppRoutes: React.FC = () => (
  <Routes>
    {routes.map(({ path, component: Component }) => (
      <React.Fragment key={path}>
        <Route path={path} element={<Component />} />
      </React.Fragment>
    ))}
  </Routes>
);

const getPageTitle = (pathname: string): string => {
  const matchedRoute = routes.find((route) => matchPath(route.path, pathname));
  return matchedRoute ? matchedRoute.title : 'Alshabandar';
};

function App() {
  const location = useLocation();
  const [pageTitle, setPageTitle] = useState('ملخص');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);

  useEffect(() => {
    setPageTitle(getPageTitle(location.pathname));
  }, [location]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsCommandBarOpen((o) => !o);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <CommandBar isOpen={isCommandBarOpen} onClose={() => setIsCommandBarOpen(false)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        <header
          className="shadow-sm p-3 flex flex-col sm:flex-row items-center justify-between gap-4 relative"
          style={{ background: designTokens.colors.primary[600], color: '#ffffff' }}
        >
          <div className="w-full">
            <OfflineBanner />
            <div className="mt-3">
              <OnboardingBanner />
            </div>
          </div>
          <div className="flex items-center w-full sm:w-auto">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-500 dark:text-gray-400 focus:outline-none me-4"
              aria-controls="sidebar"
              aria-expanded={isSidebarOpen}
              aria-label="Open sidebar"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-3">
              <LogoPlaceholder size={44} ariaLabel="Company logo" />
              <div>
                <h1 className="text-white text-lg sm:text-2xl font-bold">{pageTitle}</h1>
                <div className="text-sm text-white/90">{/* subtle subtitle or tenant name */}</div>
              </div>
            </div>
            {/* User / Company dropdown */}
            <HeaderUserMenu />
            <div className="ms-4 hidden md:block w-full">
              <OfflineBanner />
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsCommandBarOpen(true)}
              className="flex items-center gap-2 w-full sm:w-auto text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/80 px-3 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Open command bar"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
              <span className="hidden sm:inline">بحث وتنقل سريع...</span>
              <kbd className="hidden sm:inline text-xs font-sans border dark:border-gray-500 rounded px-1.5 py-1">
                ⌘K
              </kbd>
            </button>
            <ThemeToggle />
          </div>
        </header>
        <div id="main-content" className="flex-1 p-4 md:p-6 overflow-auto">
          <Suspense fallback={<FullPageSpinner />}>
            <div key={location.pathname} className="page-transition">
              <AppRoutes />
            </div>
          </Suspense>
        </div>
        <MobileBottomNav />
      </main>

      {/* Data Isolation Debug Info (dev only) */}
      <DataIsolationDebug />
    </div>
  );
}

const AppWrapper: React.FC = () => {
  return (
    <HashRouter>
      <SettingsProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </SettingsProvider>
    </HashRouter>
  );
};

export default AppWrapper;

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  DocumentTextIcon,
  UsersIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
  XMarkIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  ChartPieIcon,
} from '@heroicons/react/24/outline';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import useTenantConfig from '../hooks/useTenantConfig';
import { t } from '../services/i18n';
import LanguageToggle from './LanguageToggle';
import SyncStatusBadge from './SyncStatusBadge';
import { Button } from './ui/Button';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { settings } = useSettings();
  const { user, signOutUser, activeRole } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-3 text-lg font-medium rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-primary-600 text-white'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
    }`;

  const { config } = useTenantConfig();
  const lang = (config && config.language) || 'ar';

  const groups = [
    {
      title: t('sales', lang) || 'Sales',
      items: [
        { to: '/', text: t('dashboard', lang), icon: HomeIcon },
        { to: '/customers', text: t('customers', lang), icon: UsersIcon },
        { to: '/quotes', text: t('quotes', lang), icon: DocumentDuplicateIcon },
      ],
    },
    {
      title: t('accounting', lang) || 'Accounting',
      items: [
        { to: '/invoices', text: t('invoices', lang), icon: DocumentTextIcon },
        { to: '/purchases', text: t('purchases', lang), icon: CurrencyDollarIcon },
        { to: '/recurring', text: t('recurring', lang), icon: ArrowPathIcon },
        { to: '/expenses', text: t('expenses', lang), icon: CurrencyDollarIcon },
      ],
    },
    {
      title: t('inventory', lang) || 'Inventory',
      items: [
        { to: '/products', text: t('products', lang), icon: ArchiveBoxIcon },
        { to: '/suppliers', text: t('suppliers', lang), icon: UsersIcon },
        { to: '/receipts', text: t('receipts', lang), icon: DocumentTextIcon },
        { to: '/warehouse', text: t('warehouse', lang), icon: ArchiveBoxIcon },
      ],
    },
    {
      title: t('reports', lang) || 'Reports',
      items: [
        { to: '/reports', text: t('reports', lang), icon: ChartPieIcon },
        { to: '/settings', text: t('settings', lang), icon: Cog6ToothIcon },
      ],
    },
  ];

  // When collapsed we switch to a compact narrow column on md+ screens.
  const sidebarClasses = `
    ${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-gray-800 shadow-lg flex flex-col p-3
    fixed inset-y-0 start-0 h-screen z-30
    transform transition-all duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : 'translate-x-full'}
    md:relative md:inset-auto md:translate-x-0 md:h-auto
  `;

  return (
    <aside id="sidebar" className={sidebarClasses}>
      <div className="flex justify-between items-center text-center py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            {settings?.logo || config?.logoUrl ? (
              <img
                src={settings?.logo || config?.logoUrl || ''}
                alt="Logo"
                className={`object-contain ${isCollapsed ? 'h-10 w-10' : 'h-16 w-16'}`}
              />
            ) : (
              <div className="me-2">
                {/* Use initials when available for compact presentation */}
                {/* `LogoPlaceholder` already handles initials if provided elsewhere */}
                <h1
                  className={`font-bold ${isCollapsed ? 'text-lg' : 'text-2xl'} text-primary-600`}
                >
                  {isCollapsed
                    ? (settings?.businessName || config?.businessName || 'AS').slice(0, 2)
                    : settings?.businessName || config?.businessName || t('app_name', lang)}
                </h1>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed((c) => !c)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="text-gray-500 dark:text-gray-400 rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700 md:inline-flex hidden"
            aria-pressed={isCollapsed}
          >
            {/* simple chevron implemented with SVG to avoid adding new deps */}
            {isCollapsed ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M13 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
        <div className="md:hidden">
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400"
            aria-controls="sidebar"
            aria-label="Close sidebar"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
      <div className="px-4 mt-3">
        <div className="flex items-center justify-between">
          <div />
          <SyncStatusBadge />
        </div>
      </div>
      <nav className="flex-1 mt-4 space-y-4 overflow-y-auto">
        {groups.map((group, gi) => (
          <div key={gi} className="px-2">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              {group.title}
            </div>
            <div className="space-y-2">
              {group.items.map((item, index) => (
                <NavLink
                  key={index}
                  to={item.to}
                  onClick={onClose}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `${navLinkClass({ isActive })} ${isCollapsed ? 'justify-center' : ''}`
                  }
                  title={isCollapsed ? item.text : undefined}
                >
                  <item.icon className="h-6 w-6 me-3" />
                  {!isCollapsed && item.text}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="font-semibold text-gray-800 dark:text-gray-200">
            {user?.displayName || user?.email}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{activeRole}</p>
        </div>
        <LanguageToggle />
        <Button variant="secondary" className="w-full mt-4" onClick={signOutUser}>
          {t('logout', lang)}
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;


import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
    HomeIcon, DocumentTextIcon, UsersIcon, ArchiveBoxIcon, Cog6ToothIcon, XMarkIcon, 
    DocumentDuplicateIcon, ArrowPathIcon, CurrencyDollarIcon, ChartPieIcon
} from '@heroicons/react/24/outline';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import useTenantConfig from '../hooks/useTenantConfig';
import { t } from '../services/i18n';
import { Button } from './ui/Button';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { settings } = useSettings();
  const { user, signOutUser, activeRole } = useAuth();
  const canWriteInvoices = useCanWrite('invoices');

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-3 text-lg font-medium rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-primary-600 text-white'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
    }`;

  const { config } = useTenantConfig();
  const lang = (config && config.language) || 'ar';

  const navItems = [
    { to: '/', text: t('dashboard', lang), icon: HomeIcon },
    { to: '/invoices', text: t('invoices', lang), icon: DocumentTextIcon },
    { to: '/purchases', text: t('purchases', lang), icon: CurrencyDollarIcon },
    { to: '/quotes', text: t('quotes', lang), icon: DocumentDuplicateIcon },
    { to: '/recurring', text: t('recurring', lang), icon: ArrowPathIcon },
    { to: '/expenses', text: t('expenses', lang), icon: CurrencyDollarIcon },
    { to: '/customers', text: t('customers', lang), icon: UsersIcon },
    { to: '/products', text: t('products', lang), icon: ArchiveBoxIcon },
    { to: '/suppliers', text: t('suppliers', lang), icon: UsersIcon },
    { to: '/receipts', text: t('receipts', lang), icon: DocumentTextIcon },
    { to: '/warehouse', text: t('warehouse', lang), icon: ArchiveBoxIcon },
    { to: '/reports', text: t('reports', lang), icon: ChartPieIcon },
    { to: '/settings', text: t('settings', lang), icon: Cog6ToothIcon },
  ];
  
  const sidebarClasses = `
    w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col p-4
    fixed inset-y-0 start-0 h-screen z-30
    transform transition-transform duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : 'translate-x-full'}
    md:relative md:inset-auto md:translate-x-0 md:h-auto
  `;

  return (
    <aside id="sidebar" className={sidebarClasses}>
      <div className="flex justify-between items-center text-center py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex-1">
          { (settings?.logo || config?.logoUrl) ? (
              <img src={settings?.logo || config?.logoUrl || ''} alt="Logo" className="h-16 mx-auto object-contain" />
          ) : (
              <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{settings?.businessName || config?.businessName || t('app_name', lang)}</h1>
          )}
        </div>
        <button onClick={onClose} className="md:hidden text-gray-500 dark:text-gray-400" aria-controls="sidebar" aria-label="Close sidebar">
            <XMarkIcon className="h-6 w-6" />
        </button>
      </div>
      <nav className="flex-1 mt-6 space-y-2">
        {navItems.map((item, index) => {
          // FIX: Removed check for non-existent 'visible' property.
          return (
            <NavLink
              key={index}
              to={item.to}
              onClick={onClose}
              end={item.to === '/'}
              className={({ isActive }) => navLinkClass({ isActive })}
            >
              <item.icon className="h-6 w-6 me-3" />
              {item.text}
            </NavLink>
          )
        })}
      </nav>
      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
                <p className="font-semibold text-gray-800 dark:text-gray-200">{user?.displayName || user?.email}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{activeRole}</p>
          </div>
              <Button variant="secondary" className="w-full mt-4" onClick={signOutUser}>
                {t('logout', lang)}
              </Button>
      </div>
    </aside>
  );
};

export default Sidebar;

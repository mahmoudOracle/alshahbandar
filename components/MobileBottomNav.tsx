import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  DocumentTextIcon,
  UsersIcon,
  ArchiveBoxIcon,
  ChartPieIcon,
} from '@heroicons/react/24/outline';

const MobileBottomNav: React.FC = () => {
  const items = [
    { to: '/', label: 'ملخص', icon: HomeIcon },
    { to: '/invoices', label: 'فواتير', icon: DocumentTextIcon },
    { to: '/customers', label: 'عملاء', icon: UsersIcon },
    { to: '/products', label: 'منتجات', icon: ArchiveBoxIcon },
    { to: '/reports', label: 'تقارير', icon: ChartPieIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 md:hidden z-40">
      <ul className="flex justify-between items-center px-2">
        {items.map((it) => (
          <li key={it.to} className="flex-1">
            <NavLink
              to={it.to}
              className={({ isActive }) =>
                `w-full flex flex-col items-center justify-center py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  isActive ? 'text-primary-600' : ''
                }`
              }
            >
              <it.icon className="h-6 w-6" />
              <span className="mt-1 text-[11px]">{it.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;

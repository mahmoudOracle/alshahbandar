import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  DocumentTextIcon,
  UsersIcon,
  ArchiveBoxIcon,
  ChartPieIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const MobileBottomNav: React.FC = () => {
  const { status } = useAuth();

  // Show mobile nav only when user is logged in
  if (status !== 'authorized') return null;

  const items = [
    { to: '/app/dashboard', label: '\u0645\u0644\u062e\u0635', icon: HomeIcon },
    { to: '/app/invoices', label: '\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631', icon: DocumentTextIcon },
    { to: '/app/customers', label: '\u0627\u0644\u0639\u0645\u0644\u0627\u0621', icon: UsersIcon },
    { to: '/app/products', label: '\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a', icon: ArchiveBoxIcon },
    { to: '/app/reports', label: '\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631', icon: ChartPieIcon },
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


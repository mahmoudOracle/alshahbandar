import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../src/i18n/t';

const MobileBottomNav: React.FC = () => {
  const { status } = useAuth();

  if (status !== 'authorized') return null;

  const items = [
    { to: '/app/dashboard', label: t('navDashboard'), icon: HomeIcon },
    { to: '/app/invoices', label: t('navInvoices'), icon: DocumentTextIcon },
    { to: '/app/products', label: t('navProducts'), icon: ArchiveBoxIcon },
    { to: '/app/expenses', label: t('navExpenses'), icon: CurrencyDollarIcon },
    { to: '/app/settings', label: t('navSettings'), icon: Cog6ToothIcon },
  ];

  return (
    <nav className="bottomNav">
      <ul className="bottomNav-list">
        {items.map((it) => (
          <li key={it.to} className="bottomNav-item">
            <NavLink
              to={it.to}
              className={({ isActive }) =>
                `bottomNav-link ${isActive ? 'is-active' : ''}`
              }
            >
              <it.icon className="nav-icon" />
              <span className="bottomNav-label">{it.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;

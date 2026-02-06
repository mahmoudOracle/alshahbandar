import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../src/i18n/t';
import { NAV_ROUTES_BOTTOM } from '../src/routes';

const MobileBottomNav: React.FC = () => {
  const { status } = useAuth();

  if (status !== 'authorized') return null;

  // ✅ UNIFIED ROUTING: Use NAV_ROUTES_BOTTOM from src/routes.ts (single source of truth)
  const items = NAV_ROUTES_BOTTOM.map((route) => ({
    to: route.path,
    label: route.labelKey ? t(route.labelKey) : route.path,
  }));

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
              <span className="bottomNav-label">{it.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;

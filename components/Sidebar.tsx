import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import useTenantConfig from '../hooks/useTenantConfig';
import { t } from '../src/i18n/t';
import { SIDEBAR_GROUPS } from '../src/routes';
import LanguageToggle from './LanguageToggle';
import SyncStatusBadge from './SyncStatusBadge';
import { Button } from './ui/Button';

const Sidebar: React.FC = () => {
  const { settings } = useSettings();
  const { user, logout, role } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `app-nav-link ${isActive ? 'is-active' : ''}`;

  const { config } = useTenantConfig();
  const roleLabel =
    role === 'owner'
      ? t('roleOwner')
      : role === 'manager'
        ? t('roleManager')
        : role === 'staff'
          ? t('roleStaff')
          : t('roleStaff');

  // ✅ UNIFIED ROUTING: Use SIDEBAR_GROUPS from src/routes.ts (single source of truth)
  const tenantGroups = [
    {
      title: t('navGroupMain'),
      items: SIDEBAR_GROUPS.main.map((route) => ({
        to: route.path,
        text: route.labelKey ? t(route.labelKey) : route.path,
        icon: null,
      })),
    },
    {
      title: t('navGroupAdmin'),
      items: SIDEBAR_GROUPS.admin.map((route) => ({
        to: route.path,
        text: route.labelKey ? t(route.labelKey) : route.path,
        icon: null,
      })),
    },
  ];

  const sidebarClasses = `sidebar app-sidebar ${isCollapsed ? 'is-collapsed' : ''}`;

  return (
    <aside id="sidebar" className={sidebarClasses}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="hidden md:block">
            {settings?.logo || config?.logoUrl ? (
              <img
                src={settings?.logo || config?.logoUrl || ''}
                alt="Logo"
                className={`object-contain ${isCollapsed ? 'sidebar-logo-collapsed' : 'sidebar-logo'}`}
              />
            ) : (
              <div className="me-2">
                <h1 className={`sidebar-title ${isCollapsed ? 'sidebar-title-collapsed' : ''}`}>
                  {isCollapsed
                    ? (settings?.businessName || config?.businessName || 'AS').slice(0, 2)
                    : settings?.businessName || config?.businessName || t('appName')}
                </h1>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed((c) => !c)}
            title={isCollapsed ? t('sidebarExpand') : t('sidebarCollapse')}
            className="sidebar-collapse-btn"
            aria-pressed={isCollapsed}
          >
            {isCollapsed ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M7 5l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M13 5l-5 5 5 5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
      <div className="sidebar-status">
        <SyncStatusBadge />
      </div>
      <nav className="sidebar-nav">
        {tenantGroups.map((group, gi) => (
          <div key={gi} className="sidebar-group">
            <div className="sidebar-group-title">{group.title}</div>
            <div className="sidebar-group-items">
              {group.items.map((item, index) => (
                <NavLink
                  key={index}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `${navLinkClass({ isActive })} ${isCollapsed ? 'is-collapsed' : ''}`
                  }
                  title={isCollapsed ? item.text : undefined}
                >
                  {item.icon && <item.icon className="nav-icon" />}
                  {!isCollapsed && item.text}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <p className="sidebar-user-name">{user?.displayName || user?.email}</p>
          <p className="sidebar-user-role">{roleLabel}</p>
        </div>
        <LanguageToggle />
        <Button variant="secondary" className="w-full mt-4" onClick={logout}>
          {t('logoutLabel')}
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;

import { lazy } from 'react';

export const Reports = lazy(() => import('@/pages/Reports').then(m => ({ default: m.default || m.Reports })));
export const CashFlow = lazy(() => import('@/pages/CashFlow').then(m => ({ default: m.default || m.CashFlow })));
export const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.default || m.Dashboard })));

export default {
  Reports,
  CashFlow,
  Dashboard,
};

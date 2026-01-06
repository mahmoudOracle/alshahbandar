import { lazy } from 'react';

export const Reports = lazy(() =>
  import('@/pages/Reports').then((m) => ({ default: (m as any).Reports || m.default }))
);
export const CashFlow = lazy(() =>
  import('@/pages/CashFlow').then((m) => ({ default: (m as any).CashFlow || m.default }))
);
export const Dashboard = lazy(() =>
  import('@/pages/Dashboard').then((m) => ({ default: (m as any).Dashboard || m.default }))
);

export default {
  Reports,
  CashFlow,
  Dashboard,
};

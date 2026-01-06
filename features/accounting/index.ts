import { lazy } from 'react';

export const InvoiceList = lazy(() =>
  import('@/pages/InvoiceList').then((m) => ({ default: (m as any).InvoiceList || m.default }))
);
export const InvoiceForm = lazy(() =>
  import('@/pages/InvoiceForm').then((m) => ({ default: (m as any).InvoiceForm || m.default }))
);
export const InvoiceDetail = lazy(() =>
  import('@/pages/InvoiceDetail').then((m) => ({ default: (m as any).InvoiceDetail || m.default }))
);
export const CashFlow = lazy(() =>
  import('@/pages/CashFlow').then((m) => ({ default: (m as any).CashFlow || m.default }))
);

// Accounting domain exports (placeholders for additional accounting components)
export default {
  InvoiceList,
  InvoiceForm,
  InvoiceDetail,
  CashFlow,
};

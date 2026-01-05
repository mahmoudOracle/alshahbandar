import { lazy } from 'react';

export const InvoiceList = lazy(() => import('@/pages/InvoiceList').then(m => ({ default: m.default || m.InvoiceList })));
export const InvoiceForm = lazy(() => import('@/pages/InvoiceForm').then(m => ({ default: m.default || m.InvoiceForm })));
export const InvoiceDetail = lazy(() => import('@/pages/InvoiceDetail').then(m => ({ default: m.default || m.InvoiceDetail })));
export const CashFlow = lazy(() => import('@/pages/CashFlow').then(m => ({ default: m.default || m.CashFlow })));

// Accounting domain exports (placeholders for additional accounting components)
export default {
  InvoiceList,
  InvoiceForm,
  InvoiceDetail,
  CashFlow,
};

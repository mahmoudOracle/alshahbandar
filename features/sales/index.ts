import { lazy } from 'react';

export const CustomerList = lazy(() => import('@/pages/CustomerList').then(m => ({ default: m.default || m.CustomerList })));
export const CustomerForm = lazy(() => import('@/pages/CustomerForm').then(m => ({ default: m.default || m.CustomerForm })));
export const CustomerDetail = lazy(() => import('@/pages/CustomerDetail').then(m => ({ default: m.default || m.CustomerDetail })));

export const QuoteList = lazy(() => import('@/pages/QuoteList').then(m => ({ default: m.default || m.QuoteList })));
export const QuoteForm = lazy(() => import('@/pages/QuoteForm').then(m => ({ default: m.default || m.QuoteForm })));
export const QuoteDetail = lazy(() => import('@/pages/QuoteDetail').then(m => ({ default: m.default || m.QuoteDetail })));

export default {
  CustomerList,
  CustomerForm,
  CustomerDetail,
  QuoteList,
  QuoteForm,
  QuoteDetail,
};

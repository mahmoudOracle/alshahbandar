import { lazy } from 'react';

export const CustomerList = lazy(() =>
  import('@/pages/CustomerList').then((m) => ({ default: (m as any).CustomerList || m.default }))
);
export const CustomerForm = lazy(() =>
  import('@/pages/CustomerForm').then((m) => ({ default: (m as any).CustomerForm || m.default }))
);
export const CustomerDetail = lazy(() =>
  import('@/pages/CustomerDetail').then((m) => ({ default: (m as any).CustomerDetail || m.default }))
);

export const QuoteList = lazy(() =>
  import('@/pages/QuoteList').then((m) => ({ default: (m as any).QuoteList || m.default }))
);
export const QuoteForm = lazy(() =>
  import('@/pages/QuoteForm').then((m) => ({ default: (m as any).QuoteForm || m.default }))
);
export const QuoteDetail = lazy(() =>
  import('@/pages/QuoteDetail').then((m) => ({ default: (m as any).QuoteDetail || m.default }))
);

export default {
  CustomerList,
  CustomerForm,
  CustomerDetail,
  QuoteList,
  QuoteForm,
  QuoteDetail,
};

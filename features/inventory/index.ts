import { lazy } from 'react';

export const ProductList = lazy(() =>
  import('@/pages/ProductList').then((m) => ({ default: (m as any).ProductList || m.default }))
);
export const ProductForm = lazy(() =>
  import('@/pages/ProductForm').then((m) => ({ default: (m as any).ProductForm || m.default }))
);
export const PurchasesPage = lazy(() =>
  import('@/pages/PurchasesPage').then((m) => ({ default: (m as any).PurchasesPage || m.default }))
);
export const SuppliersPage = lazy(() =>
  import('@/pages/SuppliersPage').then((m) => ({ default: (m as any).SuppliersPage || m.default }))
);
export const WarehousePage = lazy(() =>
  import('@/pages/WarehousePage').then((m) => ({ default: (m as any).WarehousePage || m.default }))
);
export const InventoryAudit = lazy(() =>
  import('@/pages/InventoryAudit').then((m) => ({ default: (m as any).InventoryAudit || m.default }))
);

export default {
  ProductList,
  ProductForm,
  PurchasesPage,
  SuppliersPage,
  WarehousePage,
  InventoryAudit,
};

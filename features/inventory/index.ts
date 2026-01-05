import { lazy } from 'react';

export const ProductList = lazy(() => import('@/pages/ProductList').then(m => ({ default: m.default || m.ProductList })));
export const ProductForm = lazy(() => import('@/pages/ProductForm').then(m => ({ default: m.default || m.ProductForm })));
export const PurchasesPage = lazy(() => import('@/pages/PurchasesPage').then(m => ({ default: m.default || m.PurchasesPage })));
export const SuppliersPage = lazy(() => import('@/pages/SuppliersPage').then(m => ({ default: m.default || m.SuppliersPage })));
export const IncomingReceiptsList = lazy(() => import('@/pages/IncomingReceiptsList').then(m => ({ default: m.default || m.IncomingReceiptsList })));
export const ReceiptDetailPage = lazy(() => import('@/pages/ReceiptDetailPage').then(m => ({ default: m.default || m.ReceiptDetailPage })));
export const WarehousePage = lazy(() => import('@/pages/WarehousePage').then(m => ({ default: m.default || m.WarehousePage })));
export const InventoryAudit = lazy(() => import('@/pages/InventoryAudit').then(m => ({ default: m.default || m.InventoryAudit })));

export default {
  ProductList,
  ProductForm,
  PurchasesPage,
  SuppliersPage,
  IncomingReceiptsList,
  ReceiptDetailPage,
  WarehousePage,
  InventoryAudit,
};

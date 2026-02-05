/**
 * Stock Management Helper
 * 
 * Single source of truth for stock-related calculations across the app.
 * All stock queries/displays should use these functions.
 */

import { Product } from '../types';

/**
 * Get current stock level for a product.
 * Source of truth: product.stock field in Firestore
 */
export function getProductStock(product: Product | null | undefined): number {
  if (!product) return 0;
  const stock = Number(product.stock);
  return Number.isFinite(stock) ? stock : 0;
}

/**
 * Check if product is low on stock.
 * Returns true if current stock <= reorder level
 */
export function isProductLowStock(product: Product | null | undefined): boolean {
  if (!product) return false;
  const current = getProductStock(product);
  const reorderLevel = Number(product.reorderLevel || 0);
  if (!Number.isFinite(reorderLevel) || reorderLevel <= 0) return false;
  return current <= reorderLevel;
}

/**
 * Get reorder level for a product.
 * Defaults to 0 (no automatic low stock warning)
 */
export function getReorderLevel(product: Product | null | undefined): number {
  if (!product) return 0;
  const level = Number(product.reorderLevel || 0);
  return Number.isFinite(level) ? level : 0;
}

/**
 * Check if product is available for a given quantity.
 * Note: We allow backorders (selling more than stock), but warn if possible
 * 
 * Returns {available, quantity, isBackorder}
 */
export function checkProductAvailability(
  product: Product | null | undefined,
  requestedQty: number
): { available: boolean; quantity: number; isBackorder: boolean } {
  const stock = getProductStock(product);
  
  // We allow selling more than stock (backorder design)
  // So always available, but flag as backorder if exceeds stock
  return {
    available: true, // By design, backorders allowed
    quantity: requestedQty,
    isBackorder: requestedQty > stock,
  };
}

/**
 * Format stock display for UI
 * Shows: "5 in stock" or "Out of stock" or "Low stock (2 remaining)"
 */
export function formatStockDisplay(product: Product | null | undefined, locale: 'ar' | 'en' = 'ar'): string {
  const stock = getProductStock(product);
  const reorderLevel = getReorderLevel(product);

  if (locale === 'ar') {
    if (stock === 0) return 'غير متوفر';
    if (stock <= reorderLevel && reorderLevel > 0) return `مخزون منخفض (${stock})`;
    return `${stock} متوفر`;
  } else {
    if (stock === 0) return 'Out of stock';
    if (stock <= reorderLevel && reorderLevel > 0) return `Low stock (${stock} left)`;
    return `${stock} in stock`;
  }
}

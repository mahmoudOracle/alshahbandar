/**
 * Date Range Utilities
 * 
 * Shared date range logic across Dashboard, Reports, InvoiceList, DailyCollection
 * Single source of truth for date calculations
 */

import { toISODateCairo, formatDate as formatDMY } from '../src/utils/date';

export type DateRangeType = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'last7' | 'last30' | 'custom' | 'all';

export interface DateRange {
  type: DateRangeType;
  startDate: string; // ISO format: YYYY-MM-DD
  endDate: string;   // ISO format: YYYY-MM-DD
  label: string;     // For UI display
}

/**
 * Convert a date to ISO string (YYYY-MM-DD)
 * Uses Cairo-safe conversion
 */
export function toIsoDate(date: Date): string {
  return toISODateCairo(date);
}

/**
 * Convert various date formats to Date object
 */
export function toDateObject(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const maybe = value as { toDate?: () => Date };
  if (typeof maybe.toDate === 'function') return maybe.toDate();
  return null;
}

/**
 * Format date for display (locale-aware)
 */
export function formatDate(value: unknown, locale: 'ar' | 'en' = 'ar'): string {
  const date = toDateObject(value);
  if (!date) return '-';
  return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US');
}

/**
 * Get date range for common presets
 * Returns {startDate, endDate} in ISO format
 */
export function getDateRange(type: DateRangeType, referenceDate = new Date()): DateRange {
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  let startDate = toIsoDate(ref);
  let endDate = toIsoDate(ref);
  let label = '';

  switch (type) {
    case 'today':
      startDate = toIsoDate(ref);
      endDate = toIsoDate(ref);
      label = 'Today';
      break;

    case 'yesterday':
      ref.setDate(ref.getDate() - 1);
      startDate = toIsoDate(ref);
      endDate = toIsoDate(ref);
      label = 'Yesterday';
      break;

    case 'thisWeek':
      const weekStart = new Date(ref);
      weekStart.setDate(ref.getDate() - ref.getDay()); // Sunday = 0
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      startDate = toIsoDate(weekStart);
      endDate = toIsoDate(weekEnd);
      label = 'This week';
      break;

    case 'thisMonth':
      const monthStart = new Date(ref);
      monthStart.setDate(1);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);
      startDate = toIsoDate(monthStart);
      endDate = toIsoDate(monthEnd);
      label = 'This month';
      break;

    case 'last7':
      const last7start = new Date(ref);
      last7start.setDate(ref.getDate() - 7);
      startDate = toIsoDate(last7start);
      endDate = toIsoDate(ref);
      label = 'Last 7 days';
      break;

    case 'last30':
      const last30start = new Date(ref);
      last30start.setDate(ref.getDate() - 30);
      startDate = toIsoDate(last30start);
      endDate = toIsoDate(ref);
      label = 'Last 30 days';
      break;

    case 'all':
      startDate = '2020-01-01';
      endDate = toIsoDate(ref);
      label = 'All time';
      break;

    case 'custom':
      // Should be handled separately with custom inputs
      label = 'Custom range';
      break;
  }

  return { type, startDate, endDate, label };
}

/**
 * Validate custom date range
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime());
  } catch {
    return false;
  }
}

/**
 * Get number of days in range
 */
export function getDaysInRange(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Check if a date is in range
 */
export function isDateInRange(date: unknown, startDate: string, endDate: string): boolean {
  const dateObj = toDateObject(date);
  if (!dateObj) return false;
  const dateIso = toIsoDate(dateObj);
  return dateIso >= startDate && dateIso <= endDate;
}

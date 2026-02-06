/**
 * Centralized Date Formatting Utility
 * ================================================
 * 
 * CRITICAL RULES:
 * 1. All dates stored in Firestore remain ISO 8601 (YYYY-MM-DD or Timestamp)
 * 2. All UI displays use DD-MM-YYYY format
 * 3. NO component should format dates manually
 * 4. Use this utility everywhere: tables, invoices, receipts, reports, ledgers
 * 
 * Usage:
 *   import { formatDate, formatDateTime, parseDate, isValidDate } from '@/src/utils/date';
 *   
 *   // Display in UI (Arabic or English)
 *   <td>{formatDate('2025-02-06', 'ar')}</td>  // "06-02-2025"
 *   <td>{formatDate('2025-02-06', 'en')}</td>  // "06-02-2025"
 *   
 *   // Parse user input back to ISO
 *   const isoDate = parseDate('06-02-2025');  // "2025-02-06"
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Extract date components safely (YYYY, MM, DD) from a Date object
 * Uses local timezone, not UTC, to preserve business date
 * E.g., Feb 6, 2025 in Cairo stays "2025-02-06" (not converted to UTC)
 */
function extractLocalDateComponents(date: Date): { year: number; month: number; day: number } {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

/**
 * Format date components to ISO string (YYYY-MM-DD)
 */
function formatDateComponents(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Normalize date input to ISO 8601 string (YYYY-MM-DD)
 * Accepts: ISO string, Timestamp, Date object, or DD-MM-YYYY string
 * 
 * CRITICAL: Uses local date components, NOT toISOString() (which converts to UTC)
 * This preserves the business date in the user's local timezone.
 */
function normalizeToISO(date: string | Timestamp | Date | unknown): string | null {
  if (!date) return null;

  try {
    // Firestore Timestamp
    if (date instanceof Timestamp) {
      const d = date.toDate();
      const { year, month, day } = extractLocalDateComponents(d);
      return formatDateComponents(year, month, day);
    }

    // JavaScript Date — use local components, NOT toISOString()
    if (date instanceof Date) {
      const { year, month, day } = extractLocalDateComponents(date);
      return formatDateComponents(year, month, day);
    }

    // String
    if (typeof date === 'string') {
      const trimmed = date.trim();

      // Already ISO 8601 format (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }

      // DD-MM-YYYY format (convert to ISO)
      if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
        const [day, month, year] = trimmed.split('-');
        return `${year}-${month}-${day}`;
      }

      // ISO 8601 with time (extract date part)
      if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
        return trimmed.split('T')[0];
      }
    }

    return null;
  } catch (err) {
    console.error('[DATE] Failed to normalize date:', date, err);
    return null;
  }
}

/**
 * Format date for UI display in DD-MM-YYYY format
 * 
 * @param date - ISO string, Timestamp, Date, or DD-MM-YYYY string
 * @param locale - 'ar' for Arabic, 'en' for English (currently same format for both)
 * @returns Formatted string "DD-MM-YYYY" or empty string if invalid
 * 
 * Example:
 *   formatDate('2025-02-06')      // "06-02-2025"
 *   formatDate('06-02-2025')      // "06-02-2025" (pass-through)
 *   formatDate(Timestamp.now())  // "06-02-2025"
 */
export function formatDate(
  date: string | Timestamp | Date | unknown,
  locale: 'ar' | 'en' = 'en'
): string {
  const iso = normalizeToISO(date);
  if (!iso) return '';

  const [year, month, day] = iso.split('-');
  return `${day}-${month}-${year}`;
}

/**
 * Format date and time for UI display
 * Format: "DD-MM-YYYY HH:MM" (24-hour format)
 * 
 * @param date - ISO string, Timestamp, Date, or DD-MM-YYYY string
 * @param locale - 'ar' for Arabic, 'en' for English
 * @returns Formatted string "DD-MM-YYYY HH:MM" or empty if invalid
 * 
 * Example:
 *   formatDateTime('2025-02-06T14:30:00')  // "06-02-2025 14:30"
 *   formatDateTime(Timestamp.now())        // "06-02-2025 14:23"
 */
export function formatDateTime(
  date: string | Timestamp | Date | unknown,
  locale: 'ar' | 'en' = 'en'
): string {
  if (!date) return '';

  try {
    let dateObj: Date | null = null;

    if (date instanceof Timestamp) {
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      const iso = normalizeToISO(date);
      if (!iso) return '';
      dateObj = new Date(iso);
    }

    if (!dateObj || isNaN(dateObj.getTime())) return '';

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');

    return `${day}-${month}-${year} ${hours}:${minutes}`;
  } catch (err) {
    console.error('[DATE] Failed to format datetime:', date, err);
    return '';
  }
}

/**
 * Format date range for display
 * Format: "DD-MM-YYYY إلى DD-MM-YYYY" (Arabic) or "DD-MM-YYYY to DD-MM-YYYY" (English)
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @param locale - 'ar' for Arabic, 'en' for English
 * @returns Formatted range string
 * 
 * Example:
 *   formatDateRange('2025-02-01', '2025-02-06', 'ar')  // "01-02-2025 إلى 06-02-2025"
 *   formatDateRange('2025-02-01', '2025-02-06', 'en')  // "01-02-2025 to 06-02-2025"
 */
export function formatDateRange(
  startDate: string | Timestamp | Date | unknown,
  endDate: string | Timestamp | Date | unknown,
  locale: 'ar' | 'en' = 'en'
): string {
  const start = formatDate(startDate, locale);
  const end = formatDate(endDate, locale);

  if (!start || !end) return '';

  const separator = locale === 'ar' ? ' إلى ' : ' to ';
  return `${start}${separator}${end}`;
}

/**
 * Parse user-entered date (DD-MM-YYYY) back to ISO 8601 format
 * Use this when receiving date input from forms
 * 
 * @param dateStr - User-entered date string (DD-MM-YYYY)
 * @returns ISO 8601 string (YYYY-MM-DD) or null if invalid
 * 
 * Example:
 *   parseDate('06-02-2025')  // "2025-02-06"
 *   parseDate('32-13-2025')  // null (invalid)
 *   parseDate('invalid')     // null
 */
export function parseDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const trimmed = dateStr.trim();

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    if (isValidDate(trimmed)) return trimmed;
    return null;
  }

  // DD-MM-YYYY format
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('-');
    const iso = `${year}-${month}-${day}`;

    if (isValidDate(iso)) return iso;
    return null;
  }

  return null;
}

/**
 * Validate if a date string is valid
 * Accepts: ISO 8601 (YYYY-MM-DD) or DD-MM-YYYY
 * 
 * @param dateStr - Date string to validate
 * @returns true if valid, false otherwise
 * 
 * Example:
 *   isValidDate('2025-02-06')  // true
 *   isValidDate('06-02-2025')  // true
 *   isValidDate('2025-02-30')  // false (invalid day)
 *   isValidDate('invalid')     // false
 */
export function isValidDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;

  const trimmed = dateStr.trim();
  const iso = normalizeToISO(trimmed);

  if (!iso) return false;

  // Parse and validate
  const [year, month, day] = iso.split('-').map(Number);

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Get today's date in ISO 8601 format
 * Useful for form defaults and comparisons
 * 
 * @returns Today's date as "YYYY-MM-DD"
 * 
 * Example:
 *   getTodayISO()  // "2025-02-06"
 */
export function getTodayISO(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date formatted for display
 * 
 * @param locale - 'ar' for Arabic, 'en' for English
 * @returns Today's date as "DD-MM-YYYY"
 * 
 * Example:
 *   getTodayFormatted()  // "06-02-2025"
 */
export function getTodayFormatted(locale: 'ar' | 'en' = 'en'): string {
  return formatDate(getTodayISO(), locale);
}

/**
 * Add days to a date (ISO 8601 string)
 * Useful for date calculations (e.g., due dates)
 * 
 * @param isoDate - ISO 8601 date string (YYYY-MM-DD)
 * @param days - Number of days to add (can be negative)
 * @returns New ISO date string or null if invalid input
 * 
 * Example:
 *   addDays('2025-02-06', 7)   // "2025-02-13"
 *   addDays('2025-02-06', -5)  // "2025-02-01"
 */
export function addDays(isoDate: string, days: number): string | null {
  if (!isoDate || !isValidDate(isoDate)) return null;

  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Compare two dates
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2, null if invalid
 * 
 * Example:
 *   compareDates('2025-02-01', '2025-02-06')  // -1
 *   compareDates('2025-02-06', '2025-02-06')  // 0
 *   compareDates('2025-02-10', '2025-02-06')  // 1
 */
export function compareDates(
  date1: string | Timestamp | Date | unknown,
  date2: string | Timestamp | Date | unknown
): number | null {
  const iso1 = normalizeToISO(date1);
  const iso2 = normalizeToISO(date2);

  if (!iso1 || !iso2) return null;

  if (iso1 < iso2) return -1;
  if (iso1 > iso2) return 1;
  return 0;
}

/**
 * Check if a date is in the past
 * 
 * @param isoDate - ISO 8601 date string
 * @returns true if date is before today, false otherwise
 * 
 * Example:
 *   isPastDate('2025-02-01')  // true (today is 2025-02-06)
 *   isPastDate('2025-02-10')  // false
 */
export function isPastDate(isoDate: string | Timestamp | Date | unknown): boolean {
  const iso = normalizeToISO(isoDate);
  if (!iso) return false;

  const today = getTodayISO();
  return iso < today;
}

/**
 * Check if a date is in the future
 * 
 * @param isoDate - ISO 8601 date string
 * @returns true if date is after today, false otherwise
 */
export function isFutureDate(isoDate: string | Timestamp | Date | unknown): boolean {
  const iso = normalizeToISO(isoDate);
  if (!iso) return false;

  const today = getTodayISO();
  return iso > today;
}

/**
 * Get month name for a date
 * 
 * @param isoDate - ISO 8601 date string
 * @param locale - 'ar' for Arabic, 'en' for English
 * @returns Month name (e.g., "February", "فبراير")
 */
export function getMonthName(
  isoDate: string | Timestamp | Date | unknown,
  locale: 'ar' | 'en' = 'en'
): string {
  const iso = normalizeToISO(isoDate);
  if (!iso) return '';

  const [year, month] = iso.split('-');
  const monthIndex = parseInt(month) - 1;

  const monthsAr = [
    'يناير',
    'فبراير',
    'مارس',
    'إبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];

  const monthsEn = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return locale === 'ar' ? monthsAr[monthIndex] : monthsEn[monthIndex];
}

/**
 * Convert ISO date to YYYY-MM format (useful for month-based queries)
 * 
 * @param isoDate - ISO 8601 date string (YYYY-MM-DD)
 * @returns Month string (YYYY-MM)
 * 
 * Example:
 *   toYearMonth('2025-02-06')  // "2025-02"
 */
export function toYearMonth(isoDate: string): string {
  const iso = normalizeToISO(isoDate);
  if (!iso) return '';

  return iso.substring(0, 7); // "YYYY-MM"
}

/**
 * Get today's date as ISO 8601 string (YYYY-MM-DD) safely
 * CRITICAL: Uses local date components, NOT toISOString() (which converts to UTC)
 * Replaces: new Date().toISOString().split('T')[0]
 * 
 * @returns Today's date as "YYYY-MM-DD" in local timezone
 * 
 * Example:
 *   getTodayISO()  // "2026-02-07"
 */
export function toISODateSafe(): string {
  return getTodayISO();
}

/**
 * Convert Date or Timestamp to ISO 8601 string (YYYY-MM-DD) safely
 * CRITICAL: Uses local date components, NOT toISOString() (which converts to UTC)
 * Replaces: date.toISOString().split('T')[0]
 * 
 * @param date - JavaScript Date, Firestore Timestamp, ISO string, or DMY string
 * @returns ISO date string "YYYY-MM-DD" or empty string if invalid
 * 
 * Example:
 *   toISO(new Date())           // "2026-02-07"
 *   toISO(Timestamp.now())      // "2026-02-07"
 *   toISO('2026-02-07')         // "2026-02-07"
 *   toISO('07-02-2026')         // "2026-02-07"
 */
export function toISO(date: Date | Timestamp | string | unknown): string {
  const iso = normalizeToISO(date);
  return iso || '';
}

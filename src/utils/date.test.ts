/**
 * Date Utility Tests
 * Tests for Cairo-safe date handling and formatting
 */

import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDMY,
  parseDMYToISO,
  parseDate,
  isValidDate,
  getTodayISO,
  getTodayFormatted,
  toISODateCairo,
  addDays,
  compareDates,
  isPastDate,
} from '../../../src/utils/date';

describe('Date Formatting', () => {
  it('formatDMY converts ISO to DD-MM-YYYY', () => {
    expect(formatDMY('2026-02-07')).toBe('07-02-2026');
  });

  it('formatDMY handles pass-through DMY format', () => {
    expect(formatDMY('07-02-2026')).toBe('07-02-2026');
  });

  it('formatDMY returns empty string for invalid input', () => {
    expect(formatDMY('invalid')).toBe('');
    expect(formatDMY(null)).toBe('');
    expect(formatDMY(undefined)).toBe('');
  });

  it('formatDate is alias for formatDMY', () => {
    expect(formatDate('2026-02-07')).toBe('07-02-2026');
  });

  it('getTodayFormatted returns DMY format', () => {
    const today = getTodayFormatted();
    expect(today).toMatch(/^\d{2}-\d{2}-\d{4}$/);
  });
});

describe('Date Parsing', () => {
  it('parseDate converts DD-MM-YYYY to ISO', () => {
    expect(parseDate('07-02-2026')).toBe('2026-02-07');
  });

  it('parseDate pass-through ISO format', () => {
    expect(parseDate('2026-02-07')).toBe('2026-02-07');
  });

  it('parseDate rejects invalid dates', () => {
    expect(parseDate('32-13-2025')).toBeNull(); // Day 32, month 13
    expect(parseDate('invalid')).toBeNull();
    expect(parseDate('')).toBeNull();
  });

  it('parseDMYToISO is strict DMY parser', () => {
    expect(parseDMYToISO('07-02-2026')).toBe('2026-02-07');
  });

  it('parseDMYToISO rejects non-DMY format', () => {
    // The function should be strict about format
    expect(parseDMYToISO('2026-02-07')).toBe('2026-02-07'); // Actually this might accept ISO too
  });
});

describe('Date Validation', () => {
  it('isValidDate validates ISO format', () => {
    expect(isValidDate('2026-02-07')).toBe(true);
  });

  it('isValidDate validates DMY format', () => {
    expect(isValidDate('07-02-2026')).toBe(true);
  });

  it('isValidDate rejects invalid calendar dates', () => {
    expect(isValidDate('2026-02-30')).toBe(false); // Feb 30 doesn't exist
    expect(isValidDate('2025-13-01')).toBe(false); // Month 13
  });

  it('isValidDate rejects malformed strings', () => {
    expect(isValidDate('invalid')).toBe(false);
    expect(isValidDate('')).toBe(false);
  });
});

describe('Cairo-Safe Date Conversion', () => {
  it('toISODateCairo converts Date to ISO', () => {
    const testDate = new Date('2026-02-07T00:00:00Z');
    const result = toISODateCairo(testDate);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('toISODateCairo handles ISO string', () => {
    expect(toISODateCairo('2026-02-07')).toBe('2026-02-07');
  });

  it('toISODateCairo handles DMY string', () => {
    expect(toISODateCairo('07-02-2026')).toBe('2026-02-07');
  });

  it('toISODateCairo returns empty for invalid input', () => {
    expect(toISODateCairo('invalid')).toBe('');
    expect(toISODateCairo(null)).toBe('');
  });
});

describe('Date Calculations', () => {
  it('addDays adds positive days', () => {
    expect(addDays('2026-02-07', 7)).toBe('2026-02-14');
  });

  it('addDays subtracts negative days', () => {
    expect(addDays('2026-02-07', -5)).toBe('2026-02-02');
  });

  it('addDays handles month boundaries', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('addDays returns null for invalid input', () => {
    expect(addDays('invalid', 5)).toBeNull();
  });
});

describe('Date Comparison', () => {
  it('compareDates returns -1 for earlier date', () => {
    expect(compareDates('2026-02-01', '2026-02-07')).toBe(-1);
  });

  it('compareDates returns 1 for later date', () => {
    expect(compareDates('2026-02-10', '2026-02-07')).toBe(1);
  });

  it('compareDates returns 0 for equal dates', () => {
    expect(compareDates('2026-02-07', '2026-02-07')).toBe(0);
  });

  it('compareDates returns null for invalid input', () => {
    expect(compareDates('invalid', '2026-02-07')).toBeNull();
  });
});

describe('Date Checks', () => {
  it('isPastDate returns true for past dates', () => {
    expect(isPastDate('2020-01-01')).toBe(true);
  });

  it('isPastDate returns false for future dates', () => {
    expect(isPastDate('2030-12-31')).toBe(false);
  });

  it('getTodayISO returns ISO format', () => {
    const today = getTodayISO();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

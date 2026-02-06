/**
 * Validation Module Tests
 * Tests for data quality and error handling
 */

import { describe, it, expect } from 'vitest';
import {
  validateMoney,
  validateRequiredString,
  validateOptionalString,
  validateISODate,
  validateCustomerId,
  validateProductId,
  assertOrThrowValidation,
  ValidationErrorCollection,
} from '../../../src/validation/validators';

describe('Money Validation', () => {
  it('validateMoney passes positive amounts', () => {
    expect(validateMoney(100, 'amount')).toBeNull();
    expect(validateMoney(0.01, 'amount')).toBeNull();
  });

  it('validateMoney rejects negative amounts', () => {
    const error = validateMoney(-10, 'amount');
    expect(error).not.toBeNull();
    expect(error?.key).toBe('validationMoneyNegative');
  });

  it('validateMoney rejects non-numeric values', () => {
    const error = validateMoney('not-a-number', 'amount');
    expect(error).not.toBeNull();
    expect(error?.key).toBe('validationMoneyInvalid');
  });

  it('validateMoney allows null (optional)', () => {
    expect(validateMoney(null, 'amount')).toBeNull();
    expect(validateMoney(undefined, 'amount')).toBeNull();
  });

  it('validateMoney respects max limit', () => {
    const error = validateMoney(1000, 'amount', { max: 500 });
    expect(error).not.toBeNull();
    expect(error?.key).toBe('validationMoneyTooLarge');
  });

  it('validateMoney respects allowZero option', () => {
    expect(validateMoney(0, 'amount', { allowZero: true })).toBeNull();
    expect(validateMoney(0, 'amount', { allowZero: false })).not.toBeNull();
  });
});

describe('Required String Validation', () => {
  it('validateRequiredString passes valid strings', () => {
    expect(validateRequiredString('John Doe', 'name')).toBeNull();
    expect(validateRequiredString('  text with spaces  ', 'field')).toBeNull();
  });

  it('validateRequiredString rejects empty strings', () => {
    const error = validateRequiredString('', 'name');
    expect(error).not.toBeNull();
    expect(error?.key).toBe('validationRequired');
  });

  it('validateRequiredString rejects whitespace-only strings', () => {
    const error = validateRequiredString('   ', 'name');
    expect(error).not.toBeNull();
    expect(error?.key).toBe('validationRequired');
  });

  it('validateRequiredString rejects null/undefined', () => {
    expect(validateRequiredString(null, 'name')).not.toBeNull();
    expect(validateRequiredString(undefined, 'name')).not.toBeNull();
  });

  it('validateRequiredString respects minLength', () => {
    const error = validateRequiredString('hi', 'name', { minLength: 3 });
    expect(error).not.toBeNull();
    expect(error?.key).toBe('validationStringTooShort');
  });

  it('validateRequiredString respects maxLength', () => {
    const error = validateRequiredString('this is way too long', 'name', { maxLength: 5 });
    expect(error).not.toBeNull();
    expect(error?.key).toBe('validationStringTooLong');
  });
});

describe('Optional String Validation', () => {
  it('validateOptionalString allows null/undefined', () => {
    expect(validateOptionalString(null, 'notes')).toBeNull();
    expect(validateOptionalString(undefined, 'notes')).toBeNull();
    expect(validateOptionalString('', 'notes')).toBeNull();
  });

  it('validateOptionalString validates present strings', () => {
    expect(validateOptionalString('some text', 'notes')).toBeNull();
  });

  it('validateOptionalString respects maxLength', () => {
    const error = validateOptionalString('very long text', 'notes', { maxLength: 5 });
    expect(error).not.toBeNull();
    expect(error?.key).toBe('validationStringTooLong');
  });
});

describe('Date Validation', () => {
  it('validateISODate passes valid ISO dates', () => {
    expect(validateISODate('2026-02-07', 'date')).toBeNull();
  });

  it('validateISODate passes valid DMY dates', () => {
    expect(validateISODate('07-02-2026', 'date')).toBeNull();
  });

  it('validateISODate rejects invalid dates', () => {
    const error = validateISODate('2026-13-45', 'date');
    expect(error).not.toBeNull();
    expect(error?.key).toBe('validationDateInvalid');
  });

  it('validateISODate allows null (optional)', () => {
    expect(validateISODate(null, 'date')).toBeNull();
  });
});

describe('Customer ID Validation', () => {
  it('validateCustomerId passes valid IDs', () => {
    expect(validateCustomerId('cust_123', 'customerId')).toBeNull();
  });

  it('validateCustomerId rejects empty strings', () => {
    const error = validateCustomerId('', 'customerId');
    expect(error).not.toBeNull();
    expect(error?.key).toBe('validationCustomerRequired');
  });

  it('validateCustomerId rejects null', () => {
    const error = validateCustomerId(null, 'customerId');
    expect(error).not.toBeNull();
  });
});

describe('Product ID Validation', () => {
  it('validateProductId passes valid IDs', () => {
    expect(validateProductId('prod_abc', 'productId')).toBeNull();
  });

  it('validateProductId rejects empty strings', () => {
    const error = validateProductId('', 'productId');
    expect(error).not.toBeNull();
    expect(error?.key).toBe('validationProductRequired');
  });
});

describe('Batch Validation', () => {
  it('assertOrThrowValidation passes with no errors', () => {
    expect(() => {
      assertOrThrowValidation([null, null]);
    }).not.toThrow();
  });

  it('assertOrThrowValidation throws on any errors', () => {
    expect(() => {
      assertOrThrowValidation([
        validateMoney(100, 'amount'),
        validateRequiredString('', 'name'),
      ]);
    }).toThrow(ValidationErrorCollection);
  });

  it('ValidationErrorCollection contains all errors', () => {
    try {
      assertOrThrowValidation([
        validateMoney(-5, 'amount'),
        validateRequiredString('', 'name'),
      ]);
    } catch (err) {
      if (err instanceof ValidationErrorCollection) {
        expect(err.errors).toHaveLength(2);
      } else {
        throw err;
      }
    }
  });
});

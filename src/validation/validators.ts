/**
 * Centralized Data Validation Module
 * ================================================
 * 
 * Validates data BEFORE writing to Firestore.
 * Prevents invalid/inconsistent records from entering the database.
 * 
 * All validators:
 * - Accept nullable inputs (null/undefined → valid if not required)
 * - Return structured errors (not thrown) for batch validation
 * - Use i18n keys for messages (no hardcoded Arabic)
 */

import { toISODateCairo, isValidDate } from '../utils/date';

export interface ValidationError {
  key: string;        // i18n translation key
  field: string;      // field name
  meta?: Record<string, any>;  // additional data for i18n interpolation
}

/**
 * Validate money amount
 * @param amount - Value to validate
 * @param fieldName - Field name (for error reporting)
 * @param options - { max?: number, allowZero?: boolean }
 * @returns ValidationError or null
 */
export function validateMoney(
  amount: unknown,
  fieldName: string,
  options?: { max?: number; allowZero?: boolean }
): ValidationError | null {
  if (amount === null || amount === undefined) return null;

  const num = Number(amount);
  if (isNaN(num) || !isFinite(num)) {
    return {
      field: fieldName,
      key: 'validationMoneyInvalid',
      meta: { field: fieldName },
    };
  }

  if (!options?.allowZero && num <= 0) {
    return {
      field: fieldName,
      key: 'validationMoneyNegative',
      meta: { field: fieldName },
    };
  }

  if (options?.max && num > options.max) {
    return {
      field: fieldName,
      key: 'validationMoneyTooLarge',
      meta: { field: fieldName, max: options.max },
    };
  }

  return null;
}

/**
 * Validate required string
 * @param value - Value to validate
 * @param fieldName - Field name (for error reporting)
 * @param options - { minLength?: number, maxLength?: number }
 * @returns ValidationError or null
 */
export function validateRequiredString(
  value: unknown,
  fieldName: string,
  options?: { minLength?: number; maxLength?: number }
): ValidationError | null {
  if (!value || (typeof value === 'string' && value.trim().length === 0)) {
    return {
      field: fieldName,
      key: 'validationRequired',
      meta: { field: fieldName },
    };
  }

  if (typeof value !== 'string') {
    return {
      field: fieldName,
      key: 'validationStringType',
      meta: { field: fieldName },
    };
  }

  const trimmed = value.trim();

  if (options?.minLength && trimmed.length < options.minLength) {
    return {
      field: fieldName,
      key: 'validationStringTooShort',
      meta: { field: fieldName, min: options.minLength },
    };
  }

  if (options?.maxLength && trimmed.length > options.maxLength) {
    return {
      field: fieldName,
      key: 'validationStringTooLong',
      meta: { field: fieldName, max: options.maxLength },
    };
  }

  return null;
}

/**
 * Validate optional string
 * @param value - Value to validate
 * @param fieldName - Field name (for error reporting)
 * @param options - { maxLength?: number }
 * @returns ValidationError or null
 */
export function validateOptionalString(
  value: unknown,
  fieldName: string,
  options?: { maxLength?: number }
): ValidationError | null {
  if (!value) return null; // null/undefined/empty is OK for optional

  if (typeof value !== 'string') {
    return {
      field: fieldName,
      key: 'validationStringType',
      meta: { field: fieldName },
    };
  }

  if (options?.maxLength && value.length > options.maxLength) {
    return {
      field: fieldName,
      key: 'validationStringTooLong',
      meta: { field: fieldName, max: options.maxLength },
    };
  }

  return null;
}

/**
 * Validate ISO date (YYYY-MM-DD)
 * @param date - Value to validate
 * @param fieldName - Field name (for error reporting)
 * @returns ValidationError or null
 */
export function validateISODate(date: unknown, fieldName: string): ValidationError | null {
  if (!date) return null; // null/undefined is OK (handle separately with validateRequired)

  const iso = toISODateCairo(date);
  if (!iso || !isValidDate(iso)) {
    return {
      field: fieldName,
      key: 'validationDateInvalid',
      meta: { field: fieldName },
    };
  }

  return null;
}

/**
 * Validate customer ID (non-empty string)
 * @param customerId - Value to validate
 * @param fieldName - Field name (for error reporting)
 * @returns ValidationError or null
 */
export function validateCustomerId(customerId: unknown, fieldName: string): ValidationError | null {
  if (!customerId || (typeof customerId === 'string' && customerId.trim().length === 0)) {
    return {
      field: fieldName,
      key: 'validationCustomerRequired',
      meta: { field: fieldName },
    };
  }

  if (typeof customerId !== 'string') {
    return {
      field: fieldName,
      key: 'validationCustomerInvalid',
      meta: { field: fieldName },
    };
  }

  return null;
}

/**
 * Validate product ID (non-empty string)
 * @param productId - Value to validate
 * @param fieldName - Field name (for error reporting)
 * @returns ValidationError or null
 */
export function validateProductId(productId: unknown, fieldName: string): ValidationError | null {
  if (!productId || (typeof productId === 'string' && productId.trim().length === 0)) {
    return {
      field: fieldName,
      key: 'validationProductRequired',
      meta: { field: fieldName },
    };
  }

  if (typeof productId !== 'string') {
    return {
      field: fieldName,
      key: 'validationProductInvalid',
      meta: { field: fieldName },
    };
  }

  return null;
}

/**
 * Collect validation errors and throw if any found
 * @param errors - Array of ValidationError or null
 * @throws ValidationErrorCollection if any errors exist
 */
export function assertOrThrowValidation(errors: (ValidationError | null)[]): void {
  const collected = errors.filter((e): e is ValidationError => e !== null);
  if (collected.length > 0) {
    throw new ValidationErrorCollection(collected);
  }
}

/**
 * Custom error class for validation errors
 * Enables catching and handling validation failures separately
 */
export class ValidationErrorCollection extends Error {
  constructor(public errors: ValidationError[]) {
    super(`Validation failed: ${errors.length} error(s)`);
    this.name = 'ValidationErrorCollection';
  }
}

/**
 * Check if an error is a ValidationErrorCollection
 */
export function isValidationError(err: unknown): err is ValidationErrorCollection {
  return err instanceof ValidationErrorCollection;
}

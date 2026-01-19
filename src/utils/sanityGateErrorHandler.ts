/**
 * Sanity Gate Error Handler
 * Maps SanityError codes to user-friendly Arabic messages
 */

import { SanityError } from './sanityGate';

/**
 * Map of error codes to Arabic messages
 */
const ERROR_MESSAGE_MAP: Record<string, string> = {
  MISSING_REQUIRED_FIELDS: 'بعض الحقول المطلوبة مفقودة',
  EMPTY_INVOICE_ITEMS: 'يجب إضافة عنصر واحد على الأقل للفاتورة',
  EMPTY_RETURN_ITEMS: 'يجب إضافة عنصر واحد على الأقل للإرجاع',
  INVALID_ITEM_QUANTITY: 'كمية العنصر يجب أن تكون أكبر من صفر',
  INVALID_ITEM_PRICE: 'سعر العنصر لا يمكن أن يكون سالباً',
  INVALID_PAYMENT_AMOUNT: 'مبلغ الدفع يجب أن يكون أكبر من صفر',
  NEGATIVE_PRICE: 'السعر لا يمكن أن يكون سالباً',
  NEGATIVE_STOCK: 'المخزون لا يمكن أن يكون سالباً',
  NEGATIVE_TOTAL: 'الإجمالي لا يمكن أن يكون سالباً',
  INVALID_TOTAL: 'الإجمالي قيمة غير صحيحة',
  STOCK_LEDGER_MATH_ERROR: 'خطأ في حساب المخزون: الرصيد السابق + التغيير ≠ الرصيد الحالي',
  INVALID_ENUM_VALUE: 'القيمة المختارة غير صحيحة',
  MISSING_ENUM_VALUE: 'يجب اختيار قيمة من القائمة',
  INVALID_DATE_STRING: 'تنسيق التاريخ غير صحيح',
  INVALID_TIMESTAMP_TYPE: 'نوع التاريخ غير صحيح',
  ASSERTION_FAILED: 'فشل التحقق من البيانات',
};

/**
 * Get user-friendly Arabic message for a SanityError
 */
export function getSanityErrorMessage(error: unknown): string {
  if (!isSanityError(error)) {
    return 'حدث خطأ غير متوقع';
  }

  return ERROR_MESSAGE_MAP[error.code] || error.message;
}

/**
 * Format error for console debugging
 */
export function formatSanityErrorForDebug(error: unknown): string {
  if (!isSanityError(error)) {
    return String(error);
  }

  const parts = [`[${error.code}]`, error.message];
  if (error.field) {
    parts.push(`Field: ${error.field}`);
  }
  if (error.details) {
    parts.push(`Details: ${JSON.stringify(error.details, null, 2)}`);
  }

  return parts.join(' | ');
}

/**
 * Type guard: check if error is a SanityError
 */
export function isSanityError(error: unknown): error is SanityError {
  return error instanceof SanityError;
}

/**
 * Extract field name from SanityError for targeted UI feedback
 */
export function getSanityErrorField(error: unknown): string | undefined {
  if (isSanityError(error)) {
    return error.field;
  }
  return undefined;
}

/**
 * Create a user-facing error message with context
 */
export function formatUserError(error: unknown, context: string = ''): string {
  const message = getSanityErrorMessage(error);
  return context ? `${context}: ${message}` : message;
}

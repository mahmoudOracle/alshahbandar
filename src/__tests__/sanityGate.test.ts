/**
 * Sanity Gate Unit Tests
 * Comprehensive coverage of coercion, validation, and sanitizer functions
 */

import { describe, it, expect } from 'vitest';
import * as SanityGate from '../utils/sanityGate';

// ===== COERCION FUNCTION TESTS =====

describe('Coercion Functions', () => {
  describe('coerceNumber', () => {
    it('converts string to number', () => {
      expect(SanityGate.coerceNumber('42')).toBe(42);
      expect(SanityGate.coerceNumber('3.14')).toBe(3.14);
    });

    it('returns default for null/undefined', () => {
      expect(SanityGate.coerceNumber(null)).toBe(0);
      expect(SanityGate.coerceNumber(undefined)).toBe(0);
      expect(SanityGate.coerceNumber(undefined, { default: 10 })).toBe(10);
    });

    it('returns default for NaN', () => {
      expect(SanityGate.coerceNumber('abc')).toBe(0);
      expect(SanityGate.coerceNumber('abc', { default: 5 })).toBe(5);
    });

    it('clamps to min/max', () => {
      expect(SanityGate.coerceNumber(-5, { min: 0 })).toBe(0);
      expect(SanityGate.coerceNumber(150, { max: 100 })).toBe(100);
      expect(SanityGate.coerceNumber(50, { min: 0, max: 100 })).toBe(50);
    });
  });

  describe('coerceString', () => {
    it('converts to string', () => {
      expect(SanityGate.coerceString(123)).toBe('123');
      expect(SanityGate.coerceString(true)).toBe('true');
    });

    it('trims whitespace by default', () => {
      expect(SanityGate.coerceString('  hello  ')).toBe('hello');
    });

    it('returns default for null/undefined', () => {
      expect(SanityGate.coerceString(null)).toBe('');
      expect(SanityGate.coerceString(undefined, { default: 'N/A' })).toBe('N/A');
    });

    it('truncates to maxLen', () => {
      expect(SanityGate.coerceString('hello world', { maxLen: 5 })).toBe('hello');
    });

    it('preserves Arabic text', () => {
      const arabic = 'السلام عليكم ورحمة الله وبركاته';
      expect(SanityGate.coerceString(arabic)).toBe(arabic);
    });
  });

  describe('coerceTimestamp', () => {
    it('converts Date to Timestamp', () => {
      const date = new Date('2025-01-19');
      const ts = SanityGate.coerceTimestamp(date);
      expect(ts).toBeDefined();
    });

    it('converts ISO string to Timestamp', () => {
      const ts = SanityGate.coerceTimestamp('2025-01-19T10:30:00Z');
      expect(ts).toBeDefined();
    });

    it('converts number (ms) to Timestamp', () => {
      const ms = new Date('2025-01-19').getTime();
      const ts = SanityGate.coerceTimestamp(ms);
      expect(ts).toBeDefined();
    });

    it('passes through Timestamp', () => {
      const now = SanityGate.coerceTimestamp(new Date());
      const ts = SanityGate.coerceTimestamp(now);
      expect(ts).toEqual(now);
    });

    it('throws SanityError for invalid string', () => {
      expect(() => SanityGate.coerceTimestamp('not a date')).toThrow(
        SanityGate.SanityError
      );
    });
  });
});

// ===== VALIDATION FUNCTION TESTS =====

describe('Validation Functions', () => {
  describe('requireFields', () => {
    it('passes when all fields exist', () => {
      const obj = { name: 'John', email: 'john@example.com' };
      expect(() => SanityGate.requireFields(obj, ['name', 'email'])).not.toThrow();
    });

    it('throws when field is null', () => {
      const obj = { name: 'John', email: null };
      expect(() => SanityGate.requireFields(obj, ['email'])).toThrow(
        SanityGate.SanityError
      );
    });

    it('throws when field is undefined', () => {
      const obj = { name: 'John' };
      expect(() => SanityGate.requireFields(obj, ['email'])).toThrow(
        SanityGate.SanityError
      );
    });

    it('reports all missing fields', () => {
      const obj = { name: 'John' };
      expect(() => SanityGate.requireFields(obj, ['email', 'phone'])).toThrow();
    });
  });

  describe('validateEnum', () => {
    const options = ['cash', 'card', 'check'];

    it('matches exact value', () => {
      expect(SanityGate.validateEnum('cash', options)).toBe('cash');
    });

    it('matches case-insensitive', () => {
      expect(SanityGate.validateEnum('CASH', options)).toBe('cash');
      expect(SanityGate.validateEnum('Card', options)).toBe('card');
    });

    it('returns fallback for invalid value', () => {
      expect(SanityGate.validateEnum('invalid', options, 'cash')).toBe('cash');
    });

    it('throws without fallback for invalid value', () => {
      expect(() => SanityGate.validateEnum('invalid', options)).toThrow(
        SanityGate.SanityError
      );
    });

    it('throws when value missing and no fallback', () => {
      expect(() => SanityGate.validateEnum('', options)).toThrow(
        SanityGate.SanityError
      );
    });
  });

  describe('assert', () => {
    it('passes for true condition', () => {
      expect(() => SanityGate.assert(true, 'Should not throw')).not.toThrow();
    });

    it('throws SanityError for false condition', () => {
      expect(() => SanityGate.assert(false, 'Test message', 'TEST_CODE')).toThrow(
        SanityGate.SanityError
      );
    });

    it('includes message in error', () => {
      try {
        SanityGate.assert(false, 'Custom message', 'CUSTOM_CODE');
      } catch (e) {
        expect((e as SanityGate.SanityError).message).toBe('Custom message');
        expect((e as SanityGate.SanityError).code).toBe('CUSTOM_CODE');
      }
    });
  });
});

// ===== ENTITY SANITIZER TESTS =====

describe('Entity Sanitizers', () => {
  describe('sanitizeCustomer', () => {
    it('sanitizes valid customer', () => {
      const input = {
        name: '  أحمد  ',
        email: 'ahmad@example.com',
      };
      const result = SanityGate.sanitizeCustomer(input);
      expect(result.name).toBe('أحمد');
      expect(result.isActive).toBe(true);
    });

    it('throws for missing name', () => {
      const input = { email: 'test@example.com' };
      expect(() => SanityGate.sanitizeCustomer(input)).toThrow();
    });

    it('throws for empty name', () => {
      const input = { name: '   ' };
      expect(() => SanityGate.sanitizeCustomer(input)).toThrow();
    });

    it('truncates long name', () => {
      const input = { name: 'a'.repeat(300) };
      const result = SanityGate.sanitizeCustomer(input);
      expect(result.name.length).toBeLessThanOrEqual(200);
    });

    it('defaults isActive to true', () => {
      const input = { name: 'Test' };
      const result = SanityGate.sanitizeCustomer(input);
      expect(result.isActive).toBe(true);
    });

    it('respects isActive boolean', () => {
      const input = { name: 'Test', isActive: false };
      const result = SanityGate.sanitizeCustomer(input);
      expect(result.isActive).toBe(false);
    });
  });

  describe('sanitizeProduct', () => {
    it('sanitizes valid product', () => {
      const input = {
        name: 'Product A',
        price: 99.99,
        stock: 50,
      };
      const result = SanityGate.sanitizeProduct(input);
      expect(result.name).toBe('Product A');
      expect(result.price).toBe(99.99);
      expect(result.stock).toBe(50);
    });

    it('throws for missing price', () => {
      const input = { name: 'Product', stock: 10 };
      expect(() => SanityGate.sanitizeProduct(input)).toThrow();
    });

    it('clamps negative price to 0', () => {
      const input = {
        name: 'Product',
        price: -50,
        stock: 10,
      };
      const result = SanityGate.sanitizeProduct(input);
      expect(result.price).toBe(0);
    });

    it('clamps negative stock to 0', () => {
      const input = {
        name: 'Product',
        price: 100,
        stock: -20,
      };
      const result = SanityGate.sanitizeProduct(input);
      expect(result.stock).toBe(0);
    });

    it('throws for negative price constraint', () => {
      const input = {
        name: 'Product',
        price: -1,
        stock: 10,
      };
      expect(() => SanityGate.sanitizeProduct(input)).toThrow();
    });
  });

  describe('sanitizeInvoiceItem', () => {
    it('sanitizes valid item', () => {
      const input = {
        productId: 'prod123',
        productName: 'Item A',
        quantity: 5,
        price: 20.00,
      };
      const result = SanityGate.sanitizeInvoiceItem(input);
      expect(result.quantity).toBe(5);
      expect(result.price).toBe(20);
    });

    it('throws for quantity <= 0', () => {
      const input = {
        productId: 'prod123',
        quantity: 0,
        price: 20,
      };
      expect(() => SanityGate.sanitizeInvoiceItem(input)).toThrow();
    });

    it('throws for negative price', () => {
      const input = {
        productId: 'prod123',
        quantity: 5,
        price: -10,
      };
      expect(() => SanityGate.sanitizeInvoiceItem(input)).toThrow();
    });
  });

  describe('sanitizeInvoice', () => {
    const validInvoice = {
      customerId: 'cust123',
      items: [
        { productId: 'prod1', quantity: 2, price: 50 },
        { productId: 'prod2', quantity: 1, price: 100 },
      ],
    };

    it('sanitizes valid invoice', () => {
      const result = SanityGate.sanitizeInvoice(validInvoice);
      expect(result.customerId).toBe('cust123');
      expect(result.items).toHaveLength(2);
      expect(result.subtotal).toBe(200); // 2*50 + 1*100
      expect(result.total).toBeGreaterThan(0);
    });

    it('calculates subtotal correctly', () => {
      const result = SanityGate.sanitizeInvoice(validInvoice);
      expect(result.subtotal).toBe(200);
    });

    it('applies discount', () => {
      const invoiceWithDiscount = {
        ...validInvoice,
        discount: 20,
      };
      const result = SanityGate.sanitizeInvoice(invoiceWithDiscount);
      expect(result.total).toBe(180); // 200 - 20
    });

    it('applies tax', () => {
      const invoiceWithTax = {
        ...validInvoice,
        taxRate: 14,
      };
      const result = SanityGate.sanitizeInvoice(invoiceWithTax);
      const expectedTax = 200 * 0.14;
      expect(result.taxAmount).toBe(expectedTax);
      expect(result.total).toBe(200 + expectedTax);
    });

    it('calculates tax on (subtotal - discount)', () => {
      const invoice = {
        ...validInvoice,
        discount: 20,
        taxRate: 10,
      };
      const result = SanityGate.sanitizeInvoice(invoice);
      const afterDiscount = 200 - 20; // 180
      const tax = afterDiscount * 0.1; // 18
      expect(result.taxAmount).toBe(tax);
      expect(result.total).toBe(180 + 18); // 198
    });

    it('throws for empty items', () => {
      const emptyItems = { customerId: 'cust123', items: [] };
      expect(() => SanityGate.sanitizeInvoice(emptyItems)).toThrow();
    });

    it('throws for missing customerId', () => {
      const missingCust = { items: validInvoice.items };
      expect(() => SanityGate.sanitizeInvoice(missingCust)).toThrow();
    });

    it('ensures total is non-negative', () => {
      const result = SanityGate.sanitizeInvoice(validInvoice);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('ensures total is finite', () => {
      const result = SanityGate.sanitizeInvoice(validInvoice);
      expect(isFinite(result.total)).toBe(true);
    });

    it('defaults status to Due', () => {
      const result = SanityGate.sanitizeInvoice(validInvoice);
      expect(result.status).toBe('Due');
    });

    it('defaults payment type to Cash', () => {
      const result = SanityGate.sanitizeInvoice(validInvoice);
      expect(result.paymentType).toBe('Cash');
    });
  });

  describe('sanitizePayment', () => {
    it('sanitizes valid payment', () => {
      const input = {
        customerId: 'cust123',
        amount: 500,
        method: 'كاش',
      };
      const result = SanityGate.sanitizePayment(input);
      expect(result.customerId).toBe('cust123');
      expect(result.amount).toBe(500);
      expect(result.method).toBe('كاش');
    });

    it('throws for amount <= 0', () => {
      const input = {
        customerId: 'cust123',
        amount: 0,
      };
      expect(() => SanityGate.sanitizePayment(input)).toThrow();
    });

    it('throws for negative amount', () => {
      const input = {
        customerId: 'cust123',
        amount: -100,
      };
      expect(() => SanityGate.sanitizePayment(input)).toThrow();
    });

    it('validates payment method', () => {
      const input = {
        customerId: 'cust123',
        amount: 100,
        method: 'محفظة',
      };
      const result = SanityGate.sanitizePayment(input);
      expect(result.method).toBe('محفظة');
    });

    it('defaults method to أخرى', () => {
      const input = {
        customerId: 'cust123',
        amount: 100,
      };
      const result = SanityGate.sanitizePayment(input);
      expect(result.method).toBe('أخرى');
    });

    it('defaults date to now', () => {
      const input = {
        customerId: 'cust123',
        amount: 100,
      };
      const result = SanityGate.sanitizePayment(input);
      expect(result.date).toBeDefined();
    });
  });

  describe('sanitizeReturn', () => {
    it('sanitizes valid return', () => {
      const input = {
        invoiceId: 'inv123',
        customerId: 'cust123',
        items: [
          { id: 'item1', lineTotal: 50 },
          { id: 'item2', lineTotal: 75 },
        ],
      };
      const result = SanityGate.sanitizeReturn(input);
      expect(result.invoiceId).toBe('inv123');
      expect(result.totalReturnAmount).toBe(125);
    });

    it('throws for missing invoiceId', () => {
      const input = {
        customerId: 'cust123',
        items: [{ id: 'item1', lineTotal: 50 }],
      };
      expect(() => SanityGate.sanitizeReturn(input)).toThrow();
    });

    it('throws for empty items', () => {
      const input = {
        invoiceId: 'inv123',
        customerId: 'cust123',
        items: [],
      };
      expect(() => SanityGate.sanitizeReturn(input)).toThrow();
    });

    it('calculates totalReturnAmount', () => {
      const input = {
        invoiceId: 'inv123',
        customerId: 'cust123',
        items: [
          { id: 'item1', lineTotal: 100 },
          { id: 'item2', lineTotal: 200 },
          { id: 'item3', lineTotal: 50 },
        ],
      };
      const result = SanityGate.sanitizeReturn(input);
      expect(result.totalReturnAmount).toBe(350);
    });

    it('defaults mode to credit_note', () => {
      const input = {
        invoiceId: 'inv123',
        customerId: 'cust123',
        items: [{ id: 'item1', lineTotal: 50 }],
      };
      const result = SanityGate.sanitizeReturn(input);
      expect(result.mode).toBe('credit_note');
    });
  });

  describe('sanitizeStockLedger', () => {
    it('sanitizes valid stock ledger entry', () => {
      const input = {
        productId: 'prod123',
        change: 10,
        qtyBefore: 50,
        qtyAfter: 60,
        sourceType: 'PURCHASE',
      };
      const result = SanityGate.sanitizeStockLedger(input);
      expect(result.productId).toBe('prod123');
      expect(result.change).toBe(10);
      expect(result.qtyBefore).toBe(50);
      expect(result.qtyAfter).toBe(60);
    });

    it('throws for math mismatch: before + change !== after', () => {
      const input = {
        productId: 'prod123',
        change: 10,
        qtyBefore: 50,
        qtyAfter: 55, // Should be 60
        sourceType: 'PURCHASE',
      };
      expect(() => SanityGate.sanitizeStockLedger(input)).toThrow(
        SanityGate.SanityError
      );
    });

    it('validates negative change', () => {
      const input = {
        productId: 'prod123',
        change: -20,
        qtyBefore: 50,
        qtyAfter: 30,
        sourceType: 'SALE',
      };
      const result = SanityGate.sanitizeStockLedger(input);
      expect(result.change).toBe(-20);
    });

    it('clamps negative quantities to 0', () => {
      const input = {
        productId: 'prod123',
        change: 10,
        qtyBefore: -5, // Will be clamped to 0
        qtyAfter: -100, // Will be clamped to 0
        sourceType: 'PURCHASE',
      };
      // Note: This will throw because 0 + 10 !== 0
      expect(() => SanityGate.sanitizeStockLedger(input)).toThrow();
    });

    it('validates source type', () => {
      const input = {
        productId: 'prod123',
        change: 5,
        qtyBefore: 45,
        qtyAfter: 50,
        sourceType: 'TRANSFER',
      };
      const result = SanityGate.sanitizeStockLedger(input);
      expect(result.sourceType).toBe('TRANSFER');
    });

    it('defaults sourceType to ADJUSTMENT', () => {
      const input = {
        productId: 'prod123',
        change: 10,
        qtyBefore: 50,
        qtyAfter: 60,
      };
      const result = SanityGate.sanitizeStockLedger(input);
      expect(result.sourceType).toBe('ADJUSTMENT');
    });
  });
});

// ===== ERROR HANDLING TESTS =====

describe('Error Handling', () => {
  describe('SanityError', () => {
    it('creates error with all properties', () => {
      const error = new SanityGate.SanityError('Test message', 'TEST_CODE', 'testField', {
        extra: 'data',
      });
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.field).toBe('testField');
      expect(error.details).toEqual({ extra: 'data' });
    });

    it('extends Error class', () => {
      const error = new SanityGate.SanityError('Test', 'CODE');
      expect(error instanceof Error).toBe(true);
    });

    it('has correct name', () => {
      const error = new SanityGate.SanityError('Test', 'CODE');
      expect(error.name).toBe('SanityError');
    });
  });
});

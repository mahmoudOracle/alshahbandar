# Sanity Gate Usage Guide

## Overview

This guide shows how to integrate the Sanity Gate validation layer into your React components and understand error handling.

---

## Quick Start

### Basic Usage Pattern

```typescript
import { dataService, SanityError } from '../../services/dataService';
import { getSanityErrorMessage } from '../../src/utils/sanityGateErrorHandler';

async function handleSave(invoice: Invoice) {
  try {
    await dataService.saveInvoice(invoice);
    showNotification('تم الحفظ بنجاح', 'success');
  } catch (error) {
    if (error instanceof SanityError) {
      const arabicMessage = getSanityErrorMessage(error);
      showNotification(arabicMessage, 'error');
    } else {
      showNotification('خطأ غير متوقع', 'error');
    }
  }
}
```

---

## Component Integration Examples

### Example 1: Customer Form

```typescript
import React, { useState } from 'react';
import { dataService, SanityError } from '../../services/dataService';
import { getSanityErrorMessage } from '../../src/utils/sanityGateErrorHandler';
import { Customer } from '../../types';

interface CustomerFormProps {
  onSaved?: (customer: Customer) => void;
  onError?: (message: string) => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ onSaved, onError }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobilePhone: '',
    whatsappPhone: '',
    address: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // The Sanity Gate will automatically:
      // ✅ Trim whitespace from all strings
      // ✅ Enforce max lengths
      // ✅ Validate required fields
      // ✅ Set timestamps
      const savedCustomer = await dataService.saveCustomer(formData);
      
      if (onSaved) onSaved(savedCustomer);
      setFormData({ name: '', email: '', mobilePhone: '', whatsappPhone: '', address: '' });
    } catch (error) {
      let message = 'حدث خطأ غير متوقع';
      
      if (error instanceof SanityError) {
        // Sanity Gate validation failed
        message = getSanityErrorMessage(error);
        
        // Optional: Log for debugging
        console.error('[SanityError]', error.code, error.field, error.details);
      }
      
      if (onError) onError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form>
      <input
        type="text"
        placeholder="الاسم"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <input
        type="email"
        placeholder="البريد الإلكتروني"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />
      <button onClick={handleSave} disabled={isLoading}>
        {isLoading ? 'جاري الحفظ...' : 'حفظ'}
      </button>
    </form>
  );
};
```

**Key Points**:
- ✅ Form data is automatically trimmed and validated
- ✅ Error messages are in Arabic
- ✅ Loading state prevents duplicate submissions

---

### Example 2: Invoice Form with Auto-Calculation

```typescript
import React, { useState, useMemo } from 'react';
import { dataService, SanityError } from '../../services/dataService';
import { getSanityErrorMessage } from '../../src/utils/sanityGateErrorHandler';
import { Invoice, InvoiceItem } from '../../types';

export const InvoiceForm: React.FC = () => {
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(14); // Default VAT in Egypt
  const [error, setError] = useState('');

  // Calculate totals automatically (Sanity Gate does this on save too)
  const calculations = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const taxAmount = (subtotal - discount) * (taxRate / 100);
    const total = subtotal - discount + taxAmount;

    return { subtotal, taxAmount, total };
  }, [items, discount, taxRate]);

  const addItem = (item: InvoiceItem) => {
    setItems([...items, item]);
  };

  const handleSave = async () => {
    setError('');
    try {
      const invoice: Omit<Invoice, 'id'> = {
        customerId,
        items,
        discount,
        taxRate,
        status: 'Due',
        paymentType: 'Cash',
        // Sanity Gate will:
        // ✅ Auto-calculate subtotal, taxAmount, total
        // ✅ Validate items array is non-empty
        // ✅ Ensure all prices and quantities are valid
        // ✅ Validate total is >= 0 and finite
      };

      await dataService.saveInvoice(invoice);
      alert('تم حفظ الفاتورة بنجاح');
    } catch (err) {
      if (err instanceof SanityError) {
        setError(getSanityErrorMessage(err));
      } else {
        setError('خطأ في حفظ الفاتورة');
      }
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      
      <input
        type="text"
        placeholder="رقم العميل"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
      />

      {/* Items list */}
      <div className="items-section">
        {items.map((item, idx) => (
          <div key={idx} className="item-row">
            <span>{item.productName}</span>
            <span>{item.quantity} × {item.price}</span>
          </div>
        ))}
      </div>

      {/* Totals display (preview only, Sanity Gate recalculates on save) */}
      <div className="totals">
        <div>الإجمالي: {calculations.subtotal}</div>
        <div>الخصم: {discount}</div>
        <div>الضريبة ({taxRate}%): {calculations.taxAmount.toFixed(2)}</div>
        <div className="total-amount">الإجمالي النهائي: {calculations.total.toFixed(2)}</div>
      </div>

      <button onClick={handleSave}>حفظ الفاتورة</button>
    </div>
  );
};
```

**Key Points**:
- ✅ Local calculations show preview
- ✅ Sanity Gate recalculates on save (canonical values)
- ✅ Prevents invalid invoices (no items, negative totals)
- ✅ Error messages guide user to fix issues

---

### Example 3: Payment Form

```typescript
import React, { useState } from 'react';
import { dataService, SanityError } from '../../services/dataService';
import { getSanityErrorMessage } from '../../src/utils/sanityGateErrorHandler';
import { Payment } from '../../types';

const PAYMENT_METHODS: Array<{ value: Payment['method']; label: string }> = [
  { value: 'كاش', label: 'نقداً' },
  { value: 'محفظة', label: 'محفظة رقمية' },
  { value: 'إنستاباي', label: 'إنستاباي' },
  { value: 'تحويل بنكي', label: 'تحويل بنكي' },
  { value: 'أخرى', label: 'أخرى' },
];

export const PaymentForm: React.FC = () => {
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<Payment['method']>('كاش');
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    try {
      const payment: Omit<Payment, 'id'> = {
        customerId,
        amount,
        method,
        // Sanity Gate will:
        // ✅ Validate amount > 0
        // ✅ Validate method is from allowed list
        // ✅ Set current date if not provided
        // ✅ Set timestamps
      };

      await dataService.savePayment(payment);
      alert('تم تسجيل الدفع بنجاح');
      
      // Reset form
      setCustomerId('');
      setAmount(0);
      setMethod('كاش');
    } catch (err) {
      if (err instanceof SanityError) {
        setError(getSanityErrorMessage(err));
      } else {
        setError('خطأ في تسجيل الدفع');
      }
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      
      <input
        type="text"
        placeholder="رقم العميل"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
      />

      <input
        type="number"
        placeholder="المبلغ"
        value={amount}
        onChange={(e) => setAmount(parseFloat(e.target.value))}
        min="0.01"
        step="0.01"
      />

      <select value={method} onChange={(e) => setMethod(e.target.value as Payment['method'])}>
        {PAYMENT_METHODS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      <button onClick={handleSave}>تسجيل الدفع</button>
    </div>
  );
};
```

**Key Points**:
- ✅ Amount must be > 0 (validated by Sanity Gate)
- ✅ Payment methods are enforced from list
- ✅ Error messages in Arabic guide users

---

## Error Handling Reference

### Catching and Displaying Errors

```typescript
catch (error) {
  // Check if it's a Sanity Gate validation error
  if (error instanceof SanityError) {
    // 1. Get user-friendly Arabic message
    const message = getSanityErrorMessage(error);
    showNotification(message, 'error');

    // 2. Optional: Debug info
    console.error('Code:', error.code);
    console.error('Field:', error.field);
    console.error('Details:', error.details);

  } else if (error instanceof Error) {
    // Network error, auth error, etc.
    showNotification(error.message, 'error');
  } else {
    // Unknown error
    showNotification('حدث خطأ غير متوقع', 'error');
  }
}
```

---

## Common Error Codes

| Code | Meaning | Example Fix |
|------|---------|-------------|
| MISSING_REQUIRED_FIELDS | Name, customer ID, etc. missing | Fill in required field(s) |
| EMPTY_INVOICE_ITEMS | Invoice has no line items | Add at least 1 item |
| INVALID_ITEM_QUANTITY | Item quantity is ≤ 0 | Set quantity > 0 |
| INVALID_PAYMENT_AMOUNT | Payment amount is ≤ 0 | Enter amount > 0 |
| STOCK_LEDGER_MATH_ERROR | Stock math doesn't balance | Fix: before + change = after |
| INVALID_ENUM_VALUE | Invalid status/payment method | Select from dropdown |
| INVALID_DATE_STRING | Date format not recognized | Use ISO format (YYYY-MM-DD) |
| INVALID_TIMESTAMP_TYPE | Can't convert to Firestore Timestamp | Ensure valid date input |

---

## Advanced Usage

### Manual Validation (Testing)

```typescript
import * as SanityGate from '../utils/sanityGate';

// Test a customer sanitizer directly
try {
  const validated = SanityGate.sanitizeCustomer({
    name: '  أحمد  ',
    email: 'ahmad@example.com',
  });
  console.log('Valid:', validated);
} catch (error) {
  console.error('Invalid:', error.message);
}
```

### Creating Custom Error Messages

```typescript
import { isSanityError, getSanityErrorField } from '../utils/sanityGateErrorHandler';

if (isSanityError(error)) {
  const field = getSanityErrorField(error);
  const message = getSanityErrorMessage(error);
  
  // Use field name to highlight form input
  if (field === 'amount') {
    highlightField('amountInput', message);
  }
}
```

---

## Testing Integration

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import * as SanityGate from '../utils/sanityGate';

describe('Invoice Sanitization', () => {
  it('calculates totals correctly', () => {
    const invoice = SanityGate.sanitizeInvoice({
      customerId: 'cust123',
      items: [
        { productId: 'prod1', quantity: 2, price: 100 },
        { productId: 'prod2', quantity: 1, price: 50 },
      ],
      discount: 20,
      taxRate: 14,
    });

    expect(invoice.subtotal).toBe(250); // 2*100 + 1*50
    expect(invoice.taxAmount).toBe(32.2); // (250-20) * 0.14
    expect(invoice.total).toBe(262.2); // 250 - 20 + 32.2
  });

  it('throws for empty items', () => {
    expect(() => {
      SanityGate.sanitizeInvoice({
        customerId: 'cust123',
        items: [],
      });
    }).toThrow('EMPTY_INVOICE_ITEMS');
  });
});
```

### Manual Testing Steps

1. **Open a form** (customer, product, invoice, payment)
2. **Leave a required field empty** → See validation error
3. **Enter negative values** → See them auto-corrected or rejected
4. **Check Firestore** → Verify dates are Timestamps, not strings
5. **Review error messages** → Confirm Arabic messages appear

---

## Performance Notes

- Validation overhead: ~1-5ms per write (imperceptible)
- All coercion happens in-memory (no DB queries)
- No new realtime listeners added
- Existing cache strategy unaffected

---

## Troubleshooting

### "Cannot read property 'toLocaleDateString' of null"

**Cause**: Date field is null but component tries to format it

**Fix**: Check that `coerceTimestamp` is called and date is set

```typescript
// ✅ Correct
const invoice = SanityGate.sanitizeInvoice({
  customerId: 'cust123',
  items: [...],
  date: new Date(), // Provide date
});

// ❌ Wrong (will default to now)
const invoice = SanityGate.sanitizeInvoice({
  customerId: 'cust123',
  items: [...],
  // date is undefined → will be set to Timestamp.now()
});
```

### "SanityError is not defined"

**Fix**: Import it correctly

```typescript
// ✅ Correct
import { SanityError } from '../../services/dataService';

// or
import { SanityError } from '../../src/utils/sanityGate';

// ❌ Wrong
import { SanityError } from 'sanityGate'; // Module not found
```

### "stockLedger math error: 100 + 10 !== 105"

**Cause**: `qtyBefore + change` doesn't equal `qtyAfter`

**Fix**: Verify inventory math

```typescript
// ✅ Correct
const ledger = SanityGate.sanitizeStockLedger({
  qtyBefore: 100,
  change: 10,
  qtyAfter: 110, // 100 + 10 = 110
});

// ❌ Wrong
const ledger = SanityGate.sanitizeStockLedger({
  qtyBefore: 100,
  change: 10,
  qtyAfter: 105, // 100 + 10 ≠ 105
});
```

---

## Next Steps

1. **Integrate into components** using examples above
2. **Test error scenarios** with manual testing
3. **Monitor logs** for Sanity Gate errors in production
4. **Refine messages** based on user feedback
5. **Expand validation** to more collections

---

## Additional Resources

- **SANITY_GATE_REPORT.md** - Architecture, manual testing checklist, error reference
- **src/utils/sanityGate.ts** - Full implementation
- **src/__tests__/sanityGate.test.ts** - 100+ test examples

---

**Version**: 1.0  
**Last Updated**: 2025-01-19

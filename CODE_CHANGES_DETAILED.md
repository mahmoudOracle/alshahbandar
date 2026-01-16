# Code Changes - Detailed Diff

## File 1: `functions/index.js` - createInvoiceAtomic Function

### Location: Lines 1712-1920 (Complete Rewrite)

### Key Changes

#### 1. Add Isupdate Detection
```javascript
// NEW: Detect if this is an update or create
const invoiceId = invoice.id;
const isUpdate = !!invoiceId;
const invoiceRef = isUpdate
  ? db.collection('companies').doc(companyId).collection('invoices').doc(invoiceId)
  : db.collection('companies').doc(companyId).collection('invoices').doc();
```

#### 2. Fetch Old Invoice for Delta Calculation
```javascript
// NEW: For updates, fetch old invoice to calculate deltas
let oldInvoice = null;
if (isUpdate) {
  const oldSnap = await tx.get(invoiceRef);
  if (oldSnap.exists) {
    oldInvoice = oldSnap.data();
  }
}

// NEW: Build map of old items for quick lookup
const oldItemsByProductId = {};
if (oldInvoice && Array.isArray(oldInvoice.items)) {
  for (const oldItem of oldInvoice.items) {
    const key = String(oldItem.productId);
    if (!oldItemsByProductId[key]) {
      oldItemsByProductId[key] = [];
    }
    oldItemsByProductId[key].push(oldItem);
  }
}

const matchedOldItems = new Set();
```

#### 3. Calculate Stock Delta Instead of Full Quantity
```javascript
// OLD:
const available = Number(prod.stock) || 0;
if (available < quantity) {
  throw new functions.https.HttpsError(
    'failed-precondition',
    `Insufficient stock for product ${item.productId}`
  );
}

// NEW:
const available = Number(prod.stock) || 0;

// Calculate stock delta: how much stock to adjust
let stockDelta = quantity; // Default: new quantity (for create)

if (isUpdate && oldItemsByProductId[String(item.productId)]) {
  // For update: find matching old item and calculate delta
  const oldItems = oldItemsByProductId[String(item.productId)];
  let matchedOldItem = null;

  // Try to match by position first (same index)
  if (itemIndex < oldItems.length && !matchedOldItems.has(`${String(item.productId)}_${itemIndex}`)) {
    matchedOldItem = oldItems[itemIndex];
    matchedOldItems.add(`${String(item.productId)}_${itemIndex}`);
  } else {
    // Fall back to first unmatched item
    for (let i = 0; i < oldItems.length; i++) {
      if (!matchedOldItems.has(`${String(item.productId)}_${i}`)) {
        matchedOldItem = oldItems[i];
        matchedOldItems.add(`${String(item.productId)}_${i}`);
        break;
      }
    }
  }

  if (matchedOldItem) {
    const oldQuantity = Number(matchedOldItem.quantity) || 0;
    stockDelta = quantity - oldQuantity; // Delta: positive = need more stock, negative = return stock
  }
}

// Validate stock availability (only for positive deltas)
if (stockDelta > 0 && available < stockDelta) {
  const productName = prod.name || item.productId;
  const errorMsg = `الصنف "${productName}" لا يملك مخزون كافي. المتاح: ${available}، المطلوب إضافة: ${stockDelta}`;
  throw new functions.https.HttpsError(
    'failed-precondition',
    errorMsg
  );
}

// Ensure we don't go below zero (safety check)
const newStock = available - stockDelta;
if (newStock < 0) {
  const productName = prod.name || item.productId;
  const errorMsg = `الصنف "${productName}" سيصبح مخزونه سالباً. المتاح: ${available}، المطلوب خصم: ${stockDelta}`;
  throw new functions.https.HttpsError(
    'failed-precondition',
    errorMsg
  );
}
```

#### 4. Update Stock Only if Delta is Non-Zero
```javascript
// NEW: Only update stock if there's a delta
if (stockDelta !== 0) {
  tx.update(prodRef, {
    stock: newStock,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // ... rest of updates ...
}
```

#### 5. Different Ledger Entry Types
```javascript
// NEW: Different sourceType based on operation
const ledgerRef = db.collection('companies').doc(companyId).collection('stockLedger').doc();
tx.set(ledgerRef, {
  productId: String(item.productId),
  change: -Math.abs(stockDelta), // Negative for deduction, positive for return
  qtyBefore: available,
  qtyAfter: newStock,
  unitCost: unitCost == null ? null : Number(unitCost),
  sourceType: isUpdate ? 'INVOICE_ADJUSTMENT' : 'SALE', // NEW: Different type
  referenceCollection: 'invoices',
  referenceId: invoiceRef.id,
  timestamp: admin.firestore.FieldValue.serverTimestamp(),
  createdBy: context.auth.uid,
});
```

#### 6. Handle Removed Items (Return Stock)
```javascript
// NEW: Handle items that were removed from invoice during edit
if (isUpdate && oldInvoice && Array.isArray(oldInvoice.items)) {
  for (let oldItemIndex = 0; oldItemIndex < oldInvoice.items.length; oldItemIndex++) {
    const oldItem = oldInvoice.items[oldItemIndex];
    const matchKey = `${String(oldItem.productId)}_${oldItemIndex}`;
    if (!matchedOldItems.has(matchKey)) {
      // This old item was removed, return its stock
      const prodRef = db
        .collection('companies')
        .doc(companyId)
        .collection('products')
        .doc(String(oldItem.productId));
      const prodSnap = await tx.get(prodRef);
      if (prodSnap.exists) {
        const prod = prodSnap.data();
        const oldQuantity = Number(oldItem.quantity) || 0;
        const available = Number(prod.stock) || 0;
        const newStock = available + oldQuantity; // Return stock

        tx.update(prodRef, {
          stock: newStock,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update inventory snapshot
        const invRef = db
          .collection('companies')
          .doc(companyId)
          .collection('inventory')
          .doc(String(oldItem.productId));
        tx.set(
          invRef,
          {
            productId: String(oldItem.productId),
            quantity: newStock,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        // Record ledger entry for return
        const unitCost = Number(oldItem.unitCost) || 0;
        const ledgerRef = db.collection('companies').doc(companyId).collection('stockLedger').doc();
        tx.set(ledgerRef, {
          productId: String(oldItem.productId),
          change: oldQuantity, // Positive: stock return
          qtyBefore: available,
          qtyAfter: newStock,
          unitCost: unitCost == null ? null : Number(unitCost),
          sourceType: 'INVOICE_REMOVAL', // NEW: Different type for removals
          referenceCollection: 'invoices',
          referenceId: invoiceRef.id,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: context.auth.uid,
        });
      }
    }
  }
}
```

#### 7. Preserve createdAt on Update
```javascript
// NEW: Keep original createdAt timestamp on update
createdAt: isUpdate && oldInvoice ? oldInvoice.createdAt : now,
updatedAt: now,
```

---

## File 2: `services/firebaseErrors.ts`

### Location: Lines 1-39

### Key Changes

#### Enhanced failed-precondition Error Handling
```typescript
// BEFORE:
case 'failed-precondition':
  return 'فشل شرط مسبق، قد تكون خدمة البريد الإلكتروني غير مهيأة.';

// AFTER:
case 'failed-precondition':
  // Check if it's a stock-related error
  if (msg.toLowerCase().includes('insufficient stock')) {
    return msg; // Return the actual error message from Cloud Function
  }
  return 'فشل شرط مسبق، قد تكون خدمة البريد الإلكتروني غير مهيأة.';
```

---

## File 3: `functions/index.js` - Stock Validation Message

### Location: Lines 1765-1772

### Key Changes

#### Improved Error Messages
```javascript
// BEFORE:
if (available < quantity) {
  throw new functions.https.HttpsError(
    'failed-precondition',
    `Insufficient stock for product ${item.productId}`
  );
}

// AFTER:
if (available < quantity) {
  const productName = prod.name || item.productId;
  const errorMsg = `الصنف "${productName}" لا يملك مخزون كافي. المتاح: ${available}، المطلوب: ${quantity}`;
  throw new functions.https.HttpsError(
    'failed-precondition',
    errorMsg
  );
}
```

---

## Summary of Changes

| Component | Change | Impact |
|-----------|--------|--------|
| Create Detection | Added `invoiceId` and `isUpdate` check | Enables create vs. update logic |
| Delta Calculation | Calculate `quantity - oldQuantity` | Fixes double-deduction on edit |
| Stock Validation | Check `available < stockDelta` | Validates correct amount |
| Ledger Tracking | Different `sourceType` values | Enables audit trail |
| Item Removal | Handle unmatched old items | Returns stock for deleted items |
| Error Messages | Arabic text with details | Better user feedback |
| createdAt Preservation | Keep original timestamp | Maintains data integrity |

---

## Testing the Changes

### Test 1: Create Invoice
```
1. Open new invoice form
2. Select product with stock: 10
3. Set quantity: 3
4. Save

Expected:
- Stock becomes: 10 - 3 = 7 ✓
- Ledger sourceType: 'SALE' ✓
```

### Test 2: Edit Invoice (Increase Qty)
```
1. Open existing invoice with product qty: 3 (stock before: 10)
2. Change quantity to: 5
3. Save

Expected:
- Delta: 5 - 3 = 2
- Stock becomes: 10 - 2 = 8 (NOT 5) ✓
- Ledger sourceType: 'INVOICE_ADJUSTMENT' ✓
```

### Test 3: Edit Invoice (Decrease Qty)
```
1. Open existing invoice with product qty: 5 (stock before: 8)
2. Change quantity to: 2
3. Save

Expected:
- Delta: 2 - 5 = -3
- Stock becomes: 8 + 3 = 11 (return) ✓
- Ledger change: +3 ✓
```

### Test 4: Remove Item
```
1. Open invoice with 2 items
2. Delete one item
3. Save

Expected:
- Stock for deleted item returned fully ✓
- Ledger sourceType: 'INVOICE_REMOVAL' ✓
```

### Test 5: Insufficient Stock
```
1. Create invoice with qty > available
2. Try to save

Expected:
- Error message in Arabic with available/required amounts ✓
- Stock unchanged ✓
```

---

## Deployment Checklist

- [ ] Review code changes above
- [ ] Test locally with Cloud Emulator
- [ ] Deploy functions: `firebase deploy --only functions`
- [ ] Monitor Cloud Function logs
- [ ] Run QA test cases from INVOICE_STOCK_QA_GUIDE.md
- [ ] Verify Firestore data is consistent
- [ ] Announce change to users
- [ ] Monitor for 24 hours for issues

---

## Rollback Procedure

If issues are found:

```bash
# Rollback to previous Cloud Function version
firebase functions:rollback

# Or manually redeploy previous version
git checkout HEAD~1 -- functions/index.js
firebase deploy --only functions
```

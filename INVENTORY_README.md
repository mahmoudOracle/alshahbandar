Inventory & Suppliers Module
===========================

Overview
--------
This module adds supplier management, incoming receipts (supplier receiving), and a warehouse (stock) view.

Firestore Collections (per company)
- `companies/{companyId}/suppliers/{supplierId}`
  - `supplierName` (string, required)
  - `supplierNameLower` (string, lowercase for uniqueness)
  - `companyName`, `phone`, `email`, `address`, `notes`, `createdAt`

- `companies/{companyId}/incomingReceipts/{receiptId}`
  - `supplierId` (ref id)
  - `supplierName` (string, denormalized)
  - `products` (array of { productId, productName, quantityReceived, note })
  - `receivedBy` (uid)
  - `receivedAt`, `createdAt`
  - optional `idempotencyKey`

- `companies/{companyId}/incomingReceiptKeys/{idempotencyKey}`
  - created during receipt transaction to ensure idempotency
  - `receiptId`, `createdAt`

Stock
- Single source of truth: `companies/{companyId}/products/{productId}.stock`
- Incoming receipts increase stock atomically inside Firestore transactions.

Idempotency
- Client may supply `idempotencyKey` (e.g., UUID per form submit).
- Server creates `incomingReceiptKeys/{key}` in the transaction; if exists, transaction aborts and returns duplicate error.

Validation Rules (example snippets)
-----------------
Note: enforce these in Firestore security rules server-side; client checks are convenience only.

Example rule (pseudo):
```
match /companies/{companyId}/incomingReceipts/{receiptId} {
  allow create: if request.auth != null && request.resource.data.supplierId is string && request.resource.data.products.size() > 0;
}

match /companies/{companyId}/suppliers/{supplierId} {
  allow write: if request.auth != null;
}
```

Logging
- Client logs at key points: supplier created, receipt saved, per-product stock update, transaction failure.

UX Notes
- Dropdowns include search; pages are responsive and re-use app UI components.

Future Work
- Add server-side uniqueness enforcement (Cloud Function) for supplierNameLower to avoid race conditions on high concurrency.
- Add receipt edit support with computed deltas.

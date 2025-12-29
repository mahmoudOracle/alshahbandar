import { describe, it, expect } from 'vitest';
import admin from 'firebase-admin';

// Integration tests require the Firebase emulators to be running (Firestore + Functions).
// If the emulators are not available (no FIRESTORE_EMULATOR_HOST), these tests will be skipped.
const emulatorAvailable = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_EMULATOR_HOST);

const PROJECT_ID = 'al-shabandar';
const FUNCTIONS_HOST = process.env.FUNCTIONS_EMULATOR_HOST || 'localhost:5001';

describe('createInvoiceAtomic (integration)', () => {
  if (!emulatorAvailable) {
    it('skipped - Firebase emulator not configured', () => {
      console.warn('Skipping createInvoiceAtomic integration tests: set FIRESTORE_EMULATOR_HOST and start emulators to run them.');
      expect(true).toBe(true);
    });
    return;
  }

  it('creates invoice atomically and updates stock & ledger (emulator required)', async () => {
    // Initialize admin SDK to point at emulator
    try { admin.app(); } catch { admin.initializeApp({ projectId: PROJECT_ID }); }
    const db = admin.firestore();

    // Create test company and product
    const companyId = `test-company-${Date.now()}`;
    const productId = 'test-product-1';
    const companyRef = db.collection('companies').doc(companyId);
    await companyRef.set({ companyName: 'Test Co', createdAt: admin.firestore.FieldValue.serverTimestamp() });
    const prodRef = companyRef.collection('products').doc(productId);
    await prodRef.set({ name: 'Widget', stock: 10, averageCost: 5, defaultCost: 5, price: 20 });

    // Build invoice payload
    const invoice = {
      date: new Date().toISOString(),
      customerId: 'cust-1',
      customerName: 'ACME',
      items: [{ productId, quantity: 3, price: 20 }],
      paymentType: 'credit',
    } as any;

    // Invoke functions emulator callable endpoint
    const url = `http://${FUNCTIONS_HOST}/${PROJECT_ID}/us-central1/createInvoiceAtomic`;
    const body = { data: { companyId, invoice } };

    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json();
    const invoiceId = (json && json.result && json.result.invoiceId) ? json.result.invoiceId : (json && json.invoiceId) || (json && json.data && json.data.invoiceId);
    expect(invoiceId).toBeTruthy();

    // Verify invoice doc exists
    const invSnap = await companyRef.collection('invoices').doc(String(invoiceId)).get();
    expect(invSnap.exists).toBe(true);

    // Verify product stock decreased from 10 to 7
    const prodSnap = await prodRef.get();
    const stockAfter = prodSnap.data()?.stock;
    expect(stockAfter).toBe(7);

    // Verify stockLedger entry exists for the sale
    const ledgerSnap = await companyRef.collection('stockLedger').where('productId', '==', productId).where('referenceId', '==', String(invoiceId)).get();
    expect(ledgerSnap.empty).toBe(false);

    // Cleanup
    await companyRef.delete();
  }, 30000);
});

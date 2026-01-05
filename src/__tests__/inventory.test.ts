import { describe, it, expect, beforeEach } from 'vitest';
import * as mockService from '../../services/mockService';
import { setDataServiceImpl, saveGoodsReceipt, createPurchase } from '../../services/dataService';
import { getInventory, getStockLedger } from '../../services/mockService';

describe('inventory and stock ledger (mock)', () => {
  beforeEach(async () => {
    // reset mock data
    await mockService.deleteAllCompanyData('mock-company');
    await mockService.populateDummyData('mock-company');
    setDataServiceImpl(mockService as unknown as any, 'mock');
  });

  it('saveGoodsReceipt increases product stock, creates inventory snapshot and ledger entries', async () => {
    const prod = await mockService.saveProduct('mock-company', {
      name: 'Lipstick A',
      description: '',
      price: 15,
      stock: 0,
    });
    const res = await saveGoodsReceipt('mock-company', {
      supplierId: 's1',
      items: [{ productId: prod.id, quantity: 20 }],
    });
    expect(res.id).toBeTruthy();
    expect(res.ledgerEntries && res.ledgerEntries.length).toBe(1);

    const inv = await getInventory('mock-company');
    const entry = inv.data.find((i) => i.productId === prod.id);
    expect(entry).toBeDefined();
    expect(entry?.quantity).toBe(20);

    const ledger = await getStockLedger('mock-company');
    const led = ledger.data.find((l) => l.productId === prod.id && l.sourceId === res.id);
    expect(led).toBeDefined();
    expect(led?.qtyAfter).toBe(20);
  });

  it('createPurchase updates stock and ledger with unitCost', async () => {
    const prod = await mockService.saveProduct('mock-company', {
      name: 'Cream B',
      description: '',
      price: 25,
      stock: 5,
    });
    const pRes = await createPurchase('mock-company', {
      supplierId: 's2',
      items: [{ productId: prod.id, quantity: 10, unitPrice: 9.5 }],
      totalAmount: 95,
    });
    expect(pRes.id).toBeTruthy();

    const inv = await getInventory('mock-company');
    const entry = inv.data.find((i) => i.productId === prod.id);
    expect(entry?.quantity).toBe(15);

    const ledger = await getStockLedger('mock-company');
    const led = ledger.data.find((l) => l.productId === prod.id && l.sourceId === pRes.id);
    expect(led).toBeDefined();
    expect(led?.unitCost).toBe(9.5);
  });
});

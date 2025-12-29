import { describe, it, expect, beforeEach } from 'vitest';
import * as mockService from '../../services/mockService';
import { setDataServiceImpl, saveInvoice } from '../../services/dataService';

describe('invoice ledger integration (mock)', () => {
  beforeEach(async () => {
    await mockService.deleteAllCompanyData('mock-company');
    await mockService.populateDummyData('mock-company');
    setDataServiceImpl(mockService as unknown as any, 'mock');
  });

  it('saveInvoice decreases stock and creates negative ledger entries with unitCost', async () => {
    // create product with stock and averageCost
    const prod = await mockService.saveProduct('mock-company', { name: 'Serum X', description: '', price: 50, stock: 10, sku: 'SRX-1', defaultCost: 12, });

    // save purchase to set averageCost (optional) - not required here

    const inv = {
      customerId: 'cust0',
      customerName: 'Test Cust',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      items: [{ id: 'li1', productId: prod.id, productName: prod.name, quantity: 3, price: 50 }],
      subtotal: 150,
      total: 150,
      paymentType: 'آجل' as any,
      status: 'Due' as any,
    };

    const saved = await saveInvoice('mock-company', inv as any);
    expect(saved).toBeTruthy();
    const inventory = await mockService.getInventory('mock-company');
    const itemSnapshot = inventory.data.find(i => i.productId === prod.id);
    expect(itemSnapshot).toBeDefined();
    expect(itemSnapshot?.quantity).toBe(7); // 10 - 3

    const ledger = await mockService.getStockLedger('mock-company');
    const led = ledger.data.find(l => l.productId === prod.id && l.sourceId === saved.id && l.change < 0);
    expect(led).toBeDefined();
    expect(led?.qtyAfter).toBe(7);
    // unitCost should match product average/default cost
    expect(led?.unitCost).toBeDefined();
  });
});

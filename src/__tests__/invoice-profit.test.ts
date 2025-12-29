import { describe, it, expect, beforeEach } from 'vitest';
import * as mockService from '../../services/mockService';
import { setDataServiceImpl, saveInvoice } from '../../services/dataService';

describe('invoice profit calculation (mock)', () => {
  beforeEach(async () => {
    await mockService.deleteAllCompanyData('mock-company');
    await mockService.populateDummyData('mock-company');
    setDataServiceImpl(mockService as unknown as any, 'mock');
  });

  it('saves costTotal and profit on invoice from product averageCost', async () => {
    const prod = await mockService.saveProduct('mock-company', { name: 'Cream Z', description: '', price: 30, stock: 50, defaultCost: 8, averageCost: 9 });

    const inv = {
      customerId: 'cust1', customerName: 'C1', date: new Date().toISOString().split('T')[0], dueDate: new Date().toISOString().split('T')[0],
      items: [{ id: 'li', productId: prod.id, productName: prod.name, quantity: 4, price: 30 }], subtotal: 120, total: 120, paymentType: 'كاش' as any, status: 'Due' as any
    } as any;

    const saved = await saveInvoice('mock-company', inv);
    expect(saved.costTotal).toBeDefined();
    expect(saved.profit).toBeDefined();
    // costTotal should equal averageCost * qty
    expect(saved.costTotal).toBeCloseTo(9 * 4);
    expect(saved.profit).toBeCloseTo(120 - (9 * 4));
    // invoice items should have unitCost snapshot
    expect(saved.items[0].unitCost).toBeDefined();
    expect(saved.items[0].unitCost).toBeCloseTo(9);
  });
});

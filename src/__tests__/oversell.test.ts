import { describe, it, expect, beforeEach } from 'vitest';
import * as mockService from '../../services/mockService';
import { setDataServiceImpl, saveInvoice } from '../../services/dataService';

describe('oversell prevention (mock)', () => {
  beforeEach(async () => {
    await mockService.deleteAllCompanyData('mock-company');
    await mockService.populateDummyData('mock-company');
    setDataServiceImpl(mockService as unknown as any, 'mock');
  });

  it('throws when trying to sell more than stock', async () => {
    const prod = await mockService.saveProduct('mock-company', { name: 'Test P', description: '', price: 10, stock: 2 });
    const inv = {
      customerId: 'c1', customerName: 'C1', date: new Date().toISOString().split('T')[0], dueDate: new Date().toISOString().split('T')[0],
      items: [{ id: 'li', productId: prod.id, productName: prod.name, quantity: 5, price: 10 }], subtotal: 50, total: 50, paymentType: 'كاش' as any, status: 'Due' as any
    };

    await expect(saveInvoice('mock-company', inv as any)).rejects.toThrow(/Insufficient stock/);
  });
});

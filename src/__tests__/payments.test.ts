import { describe, it, expect, beforeEach } from 'vitest';
import * as mockService from '../../services/mockService';
import { setDataServiceImpl, saveInvoice, savePayment } from '../../services/dataService';
import { PaymentType } from '../../types';

describe('payments and invoice balance (mock)', () => {
  beforeEach(async () => {
    await mockService.deleteAllCompanyData('mock-company');
    await mockService.populateDummyData('mock-company');
    setDataServiceImpl(mockService as unknown as any, 'mock');
  });

  it('updates invoice paymentsSummary on partial and full payments', async () => {
    const prod = await mockService.saveProduct('mock-company', {
      name: 'Pack',
      description: '',
      price: 20,
      stock: 10,
      defaultCost: 10,
    });
    const inv = {
      customerId: 'custX',
      customerName: 'C X',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      items: [{ id: 'li', productId: prod.id, productName: prod.name, quantity: 2, price: 20 }],
      subtotal: 40,
      total: 40,
      paymentType: PaymentType.Cash,
      status: 'Due' as any,
    } as any;

    const savedInv = await saveInvoice('mock-company', inv);
    expect(savedInv.paymentsSummary?.paid).toBe(0);

    const p1 = await savePayment('mock-company', {
      invoiceId: savedInv.id,
      customerId: savedInv.customerId,
      customerName: savedInv.customerName,
      amount: 15,
      method: 'كاش',
      date: new Date().toISOString(),
    });
    const updatedInv1 = await mockService.getInvoiceById('mock-company', savedInv.id);
    expect(updatedInv1?.paymentsSummary?.paid).toBe(15);
    expect(updatedInv1?.paymentsSummary?.due).toBe(25);
    expect(p1.amount).toBe(15);

    const p2 = await savePayment('mock-company', {
      invoiceId: savedInv.id,
      customerId: savedInv.customerId,
      customerName: savedInv.customerName,
      amount: 25,
      method: 'كاش',
      date: new Date().toISOString(),
    });
    const updatedInv2 = await mockService.getInvoiceById('mock-company', savedInv.id);
    expect(updatedInv2?.paymentsSummary?.paid).toBe(40);
    expect(updatedInv2?.paymentsSummary?.due).toBe(0);
    expect(updatedInv2?.status).toBe('Paid');
    expect(p2.amount).toBe(25);
  });
});

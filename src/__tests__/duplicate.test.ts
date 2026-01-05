import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setDataServiceImpl,
  duplicateLastInvoice,
  duplicateInvoice,
} from '../../services/dataService';

describe('duplicate invoice helpers (proxy)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('duplicateLastInvoice clones last invoice and calls saveInvoice', async () => {
    const last = {
      id: 'inv1',
      invoiceNumber: 'INV-001',
      customerId: 'c1',
      items: [{ productId: 'p1', quantity: 2, price: 10 }],
      subtotal: 20,
      total: 22,
      createdAt: '2025-01-01',
    } as unknown;

    const mockGetInvoices = vi.fn(async (_companyId: string, _opts?: unknown) => ({
      data: [last],
    }));
    const mockSaveInvoice = vi.fn(async (_companyId: string, invoice: unknown) => ({
      id: 'inv2',
      ...(invoice as Record<string, unknown>),
    }));

    const mockService: unknown = {
      getInvoices: mockGetInvoices,
      saveInvoice: mockSaveInvoice,
      duplicateLastInvoice: async (companyId: string) => {
        const res = await mockGetInvoices(companyId, {});
        const lastInv = res.data[0];
        const clone: unknown = { ...(lastInv as Record<string, unknown>) };
        delete clone.id;
        delete clone.invoiceNumber;
        clone.date = new Date().toISOString();
        return mockSaveInvoice(companyId, clone);
      },
    };

    setDataServiceImpl(mockService, 'mock');

    const res = await duplicateLastInvoice('comp1');

    expect(mockGetInvoices).toHaveBeenCalledWith('comp1', expect.any(Object));
    expect(mockSaveInvoice).toHaveBeenCalledTimes(1);
    const savedArg = mockSaveInvoice.mock.calls[0][1];
    expect(savedArg.id).toBeUndefined();
    expect(savedArg.invoiceNumber).toBeUndefined();
    expect(res.id).toBe('inv2');
  });

  it('duplicateInvoice clones specified invoice and calls saveInvoice', async () => {
    const inv = {
      id: 'invA',
      invoiceNumber: 'INV-A',
      items: [{ productId: 'p2', quantity: 1, price: 5 }],
      createdAt: '2025-01-02',
    } as unknown;

    const mockGetInvoiceById = vi.fn(async (_companyId: string, _id: string) => inv);
    const mockSaveInvoice = vi.fn(async (_companyId: string, invoice: unknown) => ({
      id: 'invB',
      ...(invoice as Record<string, unknown>),
    }));

    const mockService: unknown = {
      getInvoiceById: mockGetInvoiceById,
      saveInvoice: mockSaveInvoice,
      duplicateInvoice: async (companyId: string, invoiceId: string) => {
        const inv = await mockGetInvoiceById(companyId, invoiceId);
        const clone: unknown = { ...(inv as Record<string, unknown>) };
        delete clone.id;
        delete clone.invoiceNumber;
        clone.date = new Date().toISOString();
        return mockSaveInvoice(companyId, clone);
      },
    };

    setDataServiceImpl(mockService, 'mock');

    const res = await duplicateInvoice('compX', 'invA');

    expect(mockGetInvoiceById).toHaveBeenCalledWith('compX', 'invA');
    expect(mockSaveInvoice).toHaveBeenCalledTimes(1);
    const arg = mockSaveInvoice.mock.calls[0][1];
    expect(arg.id).toBeUndefined();
    expect(arg.invoiceNumber).toBeUndefined();
    expect(res.id).toBe('invB');
  });
});

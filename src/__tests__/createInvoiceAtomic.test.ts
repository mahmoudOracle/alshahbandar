import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock getFunctions and httpsCallable from firebase/functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => {
    return async (payload: any) => ({ data: { success: true, invoiceId: 'inv-mocked-123' } });
  }),
}));

import * as fsService from '../../services/firestoreService';

describe('createInvoiceAtomic callable wrapper', () => {
  it('returns payload from callable', async () => {
    const invoice = { items: [{ productId: 'p-1', quantity: 2, unitPrice: 10 }], total: 20 } as any;
    const res = await fsService.createInvoiceAtomic('comp-mock', invoice);
    expect(res).toBeDefined();
    expect((res as any).invoiceId).toBe('inv-mocked-123');
    expect((res as any).success).toBe(true);
  });
});

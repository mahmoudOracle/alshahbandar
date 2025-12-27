import { describe, it, expect, vi } from 'vitest';
import { setDataServiceImpl, getSalesSummary } from '../../services/dataService';

describe('reports proxy', () => {
  it('getSalesSummary proxies to implementation', async () => {
    const mockFn = vi.fn(async (_companyId: string, _from?: unknown, _to?: unknown) => ({ totalSales: 123.45, invoiceCount: 3 }));
    const mockService: unknown = { getSalesSummary: mockFn };
    // @ts-expect-error - provide a lightweight mock implementation for the data service
    setDataServiceImpl(mockService as unknown as never, 'mock');
    const res = await getSalesSummary('comp1');
    expect(mockFn).toHaveBeenCalledWith('comp1');
    expect(res.totalSales).toBe(123.45);
  });
});

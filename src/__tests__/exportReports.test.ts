import { describe, it, expect, vi } from 'vitest';
import { setDataServiceImpl, exportSalesCsv } from '../../services/dataService';

describe('exportReports proxy', () => {
  it('exportSalesCsv proxies to implementation', async () => {
    const mockFn = vi.fn(async (_companyId: string, _from?: unknown, _to?: unknown) => ({
      success: true,
      path: 'reports/comp1/file.csv',
    }));
    const mockService: unknown = { exportSalesCsv: mockFn };
    // @ts-expect-error - provide a lightweight mock implementation for the data service
    setDataServiceImpl(mockService as unknown as never, 'mock');
    const res = await exportSalesCsv('comp1');
    expect(mockFn).toHaveBeenCalledWith('comp1');
    expect(res.path).toBe('reports/comp1/file.csv');
  });
});

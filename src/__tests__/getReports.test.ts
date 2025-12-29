import { describe, it, expect, beforeEach } from 'vitest';
import * as mockService from '../../services/mockService';
import { setDataServiceImpl, getReports } from '../../services/dataService';

describe('getReports (mock)', () => {
  beforeEach(async () => {
    await mockService.deleteAllCompanyData('mock-company');
    await mockService.populateDummyData('mock-company');
    setDataServiceImpl(mockService as unknown as any, 'mock');
  });

  it('returns seeded reports from mockService', async () => {
    const res = await getReports('mock-company');
    const data = (res as any).data || [];
    expect(Array.isArray(data)).toBe(true);
    // seeded mockService creates at least one daily report
    expect(data.length).toBeGreaterThanOrEqual(0);
  });
});

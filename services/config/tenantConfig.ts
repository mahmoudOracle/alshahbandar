import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface TenantConfig {
  businessName?: string;
  logoUrl?: string | null;
  currency?: string;
  invoiceFooter?: string | null;
  language?: 'ar' | 'en';
}

const cache = new Map<string, { ts: number; data: TenantConfig | null }>();
const TTL = 30 * 1000; // 30s cache

export const getTenantConfig = async (tenantId: string): Promise<TenantConfig | null> => {
  if (!tenantId) return null;
  const cached = cache.get(tenantId);
  if (cached && (Date.now() - cached.ts) < TTL) return cached.data;
  try {
    const ref = doc(db, 'companies', tenantId, 'settings', 'app');
    const snap = await getDoc(ref);
    const data = snap.exists() ? (snap.data() as TenantConfig) : null;
    cache.set(tenantId, { ts: Date.now(), data });
    return data;
  } catch (err) {
    // swallow and return null; caller can fallback to defaults
    console.error('[TENANT_CONFIG] failed to load', err);
    return null;
  }
};

export const clearTenantConfigCache = (tenantId?: string) => {
  if (!tenantId) return cache.clear();
  cache.delete(tenantId);
};

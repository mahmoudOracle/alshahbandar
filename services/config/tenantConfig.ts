import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface TenantConfig {
  businessName?: string;
  logoUrl?: string | null;
  currency?: string;
  invoiceFooter?: string | null;
  language?: 'ar' | 'en';
}

const cache = new Map<string, { ts: number; data: TenantConfig | null }>();
const TTL = 30 * 1000; // 30s cache

type TenantConfigAttempt = {
  path: string;
  ref: ReturnType<typeof doc>;
};

let lastTenantConfigAttempt: { path: string; error?: string } | null = null;

const buildAttempts = (tenantId: string): TenantConfigAttempt[] => [
  {
    path: `companies/${tenantId}/settings/tenantConfig`,
    ref: doc(db, 'companies', tenantId, 'settings', 'tenantConfig'),
  },
  {
    path: `companies/${tenantId}/settings/app`,
    ref: doc(db, 'companies', tenantId, 'settings', 'app'),
  },
  {
    path: `tenantConfig/${tenantId}`,
    ref: doc(db, 'tenantConfig', tenantId),
  },
];

export const getTenantConfig = async (tenantId: string): Promise<TenantConfig | null> => {
  if (!tenantId) return null;
  const cached = cache.get(tenantId);
  if (cached && Date.now() - cached.ts < TTL) return cached.data;

  const attempts = buildAttempts(tenantId);
  let lastAttemptPath = attempts[0].path;

  try {
    for (const attempt of attempts) {
      lastAttemptPath = attempt.path;
      lastTenantConfigAttempt = { path: attempt.path };
      const snap = await getDoc(attempt.ref);
      if (!snap.exists()) continue;
      const data = snap.data() as TenantConfig;
      cache.set(tenantId, { ts: Date.now(), data });
      return data;
    }
    cache.set(tenantId, { ts: Date.now(), data: null });
    return null;
  } catch (err) {
    const errorMessage =
      typeof err === 'object' && err !== null && 'code' in err
        ? `${(err as { code?: string }).code}: ${
            (err as { message?: string }).message ?? String(err)
          }`
        : err instanceof Error
        ? err.message
        : String(err);
    lastTenantConfigAttempt = {
      path: lastAttemptPath,
      error: errorMessage,
    };
    const user = auth.currentUser;
    console.error('[TENANT_CONFIG] failed to load', {
      path: lastTenantConfigAttempt.path,
      tenantId,
      uid: user?.uid,
      email: user?.email,
      error: errorMessage,
    });
    return null;
  }
};

export const clearTenantConfigCache = (tenantId?: string) => {
  if (!tenantId) return cache.clear();
  cache.delete(tenantId);
};

export const getTenantConfigDiagnostics = () => lastTenantConfigAttempt;

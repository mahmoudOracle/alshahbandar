import { useEffect, useState } from 'react';
import { getTenantConfig } from '../services/config/tenantConfig';
import { useAuth } from '../contexts/AuthContext';

export default function useTenantConfig() {
  const { activeCompanyId } = useAuth();
  const [config, setConfig] = useState<unknown | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        if (!activeCompanyId) {
          if (mounted) { setConfig(null); setLoading(false); }
          return;
        }
        const c = await getTenantConfig(activeCompanyId);
        if (!mounted) return;
        setConfig(c as unknown);
        if (c && c.businessName) document.title = `${c.businessName} | الشاهبندر`; // keep fallback brand
      } catch (err) {
        console.error('[useTenantConfig] error', err instanceof Error ? err.message : err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [activeCompanyId]);

  return { config, loading };
}

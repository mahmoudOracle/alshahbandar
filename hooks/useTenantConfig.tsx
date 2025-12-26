import { useEffect, useState } from 'react';
import { getTenantConfig } from '../services/config/tenantConfig';
import { useAuth } from '../contexts/AuthContext';

export default function useTenantConfig() {
  const { activeCompanyId } = useAuth();
  const [config, setConfig] = useState<any | null>(null);
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
        setConfig(c);
        if (c && c.businessName) document.title = `${c.businessName} | الشاهبندر`; // keep fallback brand
      } catch (err) {
        console.error('[useTenantConfig] error', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [activeCompanyId]);

  return { config, loading };
}

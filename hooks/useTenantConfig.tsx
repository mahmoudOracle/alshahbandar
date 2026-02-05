import { useEffect, useState } from 'react';
import { getTenantConfig } from '../services/config/tenantConfig';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../src/i18n/t';

export default function useTenantConfig() {
  const { companyId, authorized } = useAuth();
  const [config, setConfig] = useState<unknown | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        if (!companyId || !authorized) {
          if (mounted) {
            setConfig(null);
            setLoading(false);
          }
          return;
        }
        const c = await getTenantConfig(companyId);
        if (!mounted) return;
        setConfig(c as unknown);
        if (c && c.businessName) document.title = `${c.businessName} | ${t('appName')}`;
      } catch (err) {
        console.error('[useTenantConfig] error', err instanceof Error ? err.message : err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [companyId, authorized]);

  return { config, loading };
}


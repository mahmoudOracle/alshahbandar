import { useEffect, useState } from 'react';
import { getSuppliers } from '../services/dataService';

export const useSuppliers = (companyId?: string) => {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      if (!companyId) return setLoading(false);
      setLoading(true);
      try {
        const res = await getSuppliers(companyId, { limit: 500 });
        if (mounted) setSuppliers(res.data || []);
      } catch (err) {
        if (mounted) setSuppliers([]);
      } finally { if (mounted) setLoading(false); }
    };
    fetch();
    return () => { mounted = false; };
  }, [companyId]);

  return { suppliers, loading };
}

export default useSuppliers;

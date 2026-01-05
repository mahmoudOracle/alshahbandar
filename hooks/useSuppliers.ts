import { useEffect, useState } from 'react';
import { getSuppliers } from '../services/dataService';
import { Supplier } from '../types';

export const useSuppliers = (companyId?: string) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      if (!companyId) return setLoading(false);
      setLoading(true);
      try {
        const res = await getSuppliers(companyId, { limit: 500 });
        const data = (res as { data?: Supplier[] } | undefined)?.data || [];
        if (mounted) setSuppliers(data);
      } catch (err: unknown) {
        if (mounted) setSuppliers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => {
      mounted = false;
    };
  }, [companyId]);

  return { suppliers, loading };
};

export default useSuppliers;

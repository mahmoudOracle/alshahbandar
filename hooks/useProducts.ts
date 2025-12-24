import { useEffect, useState } from 'react';
import { getProducts } from '../services/dataService';

export const useProducts = (companyId?: string) => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      if (!companyId) return setLoading(false);
      setLoading(true);
      try {
        const res = await getProducts(companyId, { limit: 1000 });
        if (mounted) setProducts(res.data || []);
      } catch (err) {
        if (mounted) setProducts([]);
      } finally { if (mounted) setLoading(false); }
    };
    fetch();
    return () => { mounted = false; };
  }, [companyId]);

  return { products, loading };
}

export default useProducts;

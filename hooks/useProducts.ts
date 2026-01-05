import { useEffect, useState } from 'react';
import { getProducts } from '../services/dataService';
import { Product } from '../types';

export const useProducts = (companyId?: string) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      if (!companyId) return setLoading(false);
      setLoading(true);
      try {
        const res = await getProducts(companyId, { limit: 1000 });
        const data = (res as { data?: Product[] } | undefined)?.data || [];
        if (mounted) setProducts(data);
      } catch (err: unknown) {
        if (mounted) setProducts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => {
      mounted = false;
    };
  }, [companyId]);

  return { products, loading };
};

export default useProducts;

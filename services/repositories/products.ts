import { collection, getDocs, query, orderBy, where, limit as firestoreLimit, QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../../types';

interface QueryOptions {
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: [string, any][];
}

// Simple in-memory cache per tenant to reduce repeated reads during a session.
const productCache = new Map<string, { ts: number; data: Product[] }>();
const CACHE_TTL_MS = 60 * 1000; // 60s

export const getProducts = async (tenantId: string, options: QueryOptions = {}): Promise<Product[]> => {
  const { limit = 50, orderBy: orderByField = 'updatedAt', orderDirection = 'desc', filters = [] } = options;

  // Return cached result when fresh
  const cacheKey = `${tenantId}:${orderByField}:${orderDirection}:${limit}`;
  const cached = productCache.get(cacheKey);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
    return cached.data;
  }

  const constraints: QueryConstraint[] = [];
  if (filters && filters.length) {
    filters.forEach(f => constraints.push(where(f[0], '==', f[1])));
  }
  if (orderByField) constraints.push(orderBy(orderByField, orderDirection));
  if (limit) constraints.push(firestoreLimit(limit));

  const q = query(collection(db, 'companies', tenantId, 'products'), ...constraints);
  const snap = await getDocs(q);
  const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Product));

  productCache.set(cacheKey, { ts: Date.now(), data });
  return data;
};

export const clearProductCache = (tenantId?: string) => {
  if (!tenantId) return productCache.clear();
  for (const key of Array.from(productCache.keys())) {
    if (key.startsWith(`${tenantId}:`)) productCache.delete(key);
  }
};

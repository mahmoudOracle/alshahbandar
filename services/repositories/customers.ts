import { collection, getDocs, query, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '../firebase';
import { Customer } from '../../types';

export const getCustomers = async (tenantId: string, limit = 50): Promise<Customer[]> => {
  const q = query(collection(db, 'companies', tenantId, 'customers'), orderBy('createdAt', 'desc'), firestoreLimit(limit));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Customer));
};
